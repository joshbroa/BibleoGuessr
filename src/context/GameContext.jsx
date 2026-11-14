import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Outlet, useParams, useLocation, useNavigate } from 'react-router-dom';
import { getGameState, submitGuess, friendlyError } from '@/lib/api';
import { loadManifest, spreadStart } from '@/lib/pageCache';
import { WfFullPageSpinner, LogoHeader, useWfBody } from '@/components/wf/PageShell';
import { AlertIcon } from '@/components/wf/Icons';

const GameContext = createContext(null);

export function useGame() {
  const value = useContext(GameContext);
  if (!value) throw new Error('useGame must be used inside <GameProvider>');
  return value;
}

/** Where in the book the player was last looking, per game, across reloads. */
function bookmarkKey(gameId) {
  return `bibleoguessr:bookmark:${gameId}`;
}

function readBookmark(gameId) {
  try {
    const raw = sessionStorage.getItem(bookmarkKey(gameId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeBookmark(gameId, value) {
  try {
    sessionStorage.setItem(bookmarkKey(gameId), JSON.stringify(value));
  } catch {
    // Private-mode storage failures are not worth interrupting a game over.
  }
}

/** The player's position in the book: which view, which spread, which word. */
function loadPosition(gameId) {
  const bookmark = readBookmark(gameId);
  return {
    view: bookmark?.view ?? 'closed',
    // Always the LEFT page of the open spread, and always odd.
    activePage: bookmark?.activePage ?? 1,
    selection: bookmark?.selection ?? null,
  };
}

/**
 * Owns everything shared by the three game screens: the server's view of the
 * game, the player's position in the book, their pending guess, and the result
 * of the round they just submitted.
 *
 * Deliberately absent: the answer. Nothing in this state, and nothing the
 * client can reach, knows the target verse until the round has been submitted
 * and the server has chosen to reveal it.
 */
export function GameProvider() {
  const { gameId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [game, setGame] = useState(location.state?.game ?? null);
  const [manifest, setManifest] = useState(null);
  const [loading, setLoading] = useState(!location.state?.game);
  const [error, setError] = useState('');

  // Where the player has the book. Restored straight from the bookmark in the
  // state initialiser rather than in an effect: an effect would leave one
  // render where the position is still the default, and the persistence effect
  // below would race it and overwrite the very bookmark it is meant to restore.
  const [position, setPosition] = useState(() => loadPosition(gameId));
  const positionGameId = useRef(gameId);

  const { view, activePage, selection } = position;

  const setView = useCallback(
    (next) => setPosition((current) => ({ ...current, view: next })),
    []
  );

  const [lastResult, setLastResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Guards against a double submit racing itself — via the button and the Space
  // bar, or via the timer firing at the same moment the player clicks.
  const submitLock = useRef(false);

  // --- Load manifest + game ------------------------------------------------

  useEffect(() => {
    loadManifest().then(setManifest).catch((err) => setError(friendlyError(err)));
  }, []);

  useEffect(() => {
    if (!gameId) return undefined;

    let cancelled = false;

    // A game handed over from the setup screen is already current; skip the
    // round trip. Any other entry point — including a mid-game reload — asks
    // the server, which is the only place the round sequence lives.
    if (location.state?.game?.gameId === gameId) {
      setGame(location.state.game);
      setLoading(false);
    } else {
      setLoading(true);
      getGameState({ gameId })
        .then((state) => {
          if (!cancelled) setGame(state);
        })
        .catch((err) => {
          if (!cancelled) setError(friendlyError(err));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
    // location.state is intentionally read once per gameId: re-running on every
    // navigation would clobber live state when moving between game screens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  // Moving to a different game adopts that game's own saved position.
  useEffect(() => {
    if (positionGameId.current === gameId) return;
    positionGameId.current = gameId;
    setPosition(loadPosition(gameId));
  }, [gameId]);

  // Persist the bookmark so a refresh drops the player back on the same spread
  // with their guess intact.
  useEffect(() => {
    if (!gameId || positionGameId.current !== gameId) return;
    writeBookmark(gameId, position);
  }, [gameId, position]);

  // --- Position in the book ------------------------------------------------

  const totalPages = manifest?.totalPages ?? 0;

  const goToPage = useCallback(
    (page) => {
      if (!totalPages) return;
      const clamped = Math.min(Math.max(Math.round(page), 1), totalPages);
      setPosition((current) => ({ ...current, activePage: spreadStart(clamped) }));
    },
    [totalPages]
  );

  /** Open the closed Bible at the page the player pointed at. */
  const openAt = useCallback(
    (page) => {
      if (!totalPages) return;
      const clamped = Math.min(Math.max(Math.round(page), 1), totalPages);
      setPosition((current) => ({
        ...current,
        activePage: spreadStart(clamped),
        view: 'open',
      }));
    },
    [totalPages]
  );

  const closeBible = useCallback(() => setView('closed'), [setView]);

  const selectWord = useCallback(
    (next) => setPosition((current) => ({ ...current, selection: next })),
    []
  );

  // --- Submission ----------------------------------------------------------

  /**
   * Send the current guess (or an explicit null, for a timeout) and move to the
   * round result screen.
   *
   * All the client sends is a page number and a word index. The server decides
   * what that resolved to and what it was worth.
   */
  const submit = useCallback(
    async ({ timedOut = false } = {}) => {
      if (submitLock.current || !game || game.status !== 'active') return;
      submitLock.current = true;
      setSubmitting(true);
      setError('');

      // A running-out clock submits whatever the player had already chosen —
      // it is a deadline, not a forfeit. Only an empty board scores nothing.
      const guess = selection ?? null;

      // How far into the round the click came, by the same clock the player
      // was watching. The server credits it (within a limit) so a slow network
      // or a cold start never eats into their time.
      const startedAtMs = game.round?.startedAtMs;
      const elapsedMs = timedOut
        ? game.settings.timer * 1000
        : startedAtMs
          ? Math.max(0, Date.now() - startedAtMs)
          : null;

      try {
        const response = await submitGuess({
          gameId,
          roundIndex: game.round?.index ?? game.currentRound,
          page: guess ? guess.page : null,
          wordIndex: guess ? guess.wordIndex : null,
          timedOut,
          elapsedMs,
        });

        setLastResult(response);
        setGame((current) =>
          current
            ? {
                ...current,
                currentRound: response.nextRound,
                status: response.finished ? 'complete' : 'active',
                totalScore: response.totalScore,
                results: [...(current.results ?? []), response.result],
              }
            : current
        );
        setPosition((current) => ({ ...current, selection: null }));
        navigate(`/game/${gameId}/round-result`);
      } catch (err) {
        setError(friendlyError(err));
      } finally {
        submitLock.current = false;
        setSubmitting(false);
      }
    },
    [game, gameId, navigate, selection]
  );

  /** Move on from the round result to the next round, or to the summary. */
  const advance = useCallback(async () => {
    if (!lastResult) return;

    if (lastResult.finished) {
      navigate(`/game/${gameId}/summary`, { replace: true });
      return;
    }

    // Pull the next round's prompt. The server hands over one round at a time,
    // so there is never a future verse sitting in client memory.
    try {
      const state = await getGameState({ gameId });
      setGame(state);
      setLastResult(null);
      // A new round starts with the book shut again and nothing selected.
      setPosition({ view: 'closed', activePage: 1, selection: null });
      navigate(`/game/${gameId}`, { replace: true });
    } catch (err) {
      setError(friendlyError(err));
    }
  }, [gameId, lastResult, navigate]);

  const value = useMemo(
    () => ({
      gameId,
      game,
      manifest,
      totalPages,
      loading,
      error,
      setError,
      view,
      setView,
      activePage,
      goToPage,
      openAt,
      closeBible,
      selection,
      selectWord,
      submit,
      submitting,
      lastResult,
      setLastResult,
      advance,
    }),
    [
      gameId,
      game,
      manifest,
      totalPages,
      loading,
      error,
      view,
      activePage,
      goToPage,
      openAt,
      closeBible,
      selection,
      selectWord,
      submit,
      submitting,
      lastResult,
      advance,
    ]
  );

  if (loading || !manifest) {
    return <WfFullPageSpinner label="Opening the book" stage />;
  }

  if (error && !game) {
    return <GameLoadError message={error} onHome={() => navigate('/home')} />;
  }

  return (
    <GameContext.Provider value={value}>
      <Outlet />
    </GameContext.Provider>
  );
}

/** A game that could not be loaded at all. */
function GameLoadError({ message, onHome }) {
  useWfBody(true);
  return (
    <div className="wf-root flex min-h-screen flex-col bg-wf-stage">
      <LogoHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <p className="wf-alert-error m-0 max-w-md" role="alert">
          <AlertIcon />
          {message}
        </p>
        <button type="button" className="wf-btn-ink" onClick={onHome}>
          Return Home
        </button>
      </main>
    </div>
  );
}
