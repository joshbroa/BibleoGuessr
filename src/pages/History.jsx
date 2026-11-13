import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { friendlyError } from '@/lib/api';
import { play } from '@/lib/sound';
import PageShell, { PageHeading, WfSpinner } from '@/components/wf/PageShell';
import { AlertIcon, ArrowRight } from '@/components/wf/Icons';

const PAGE_SIZE = 50;

function formatDate(millis) {
  if (!millis) return 'Unknown date';
  return new Date(millis).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatTimer(seconds) {
  if (seconds === 0) return 'Untimed';
  if (seconds < 60) return `${seconds}s`;
  return `${seconds / 60} min`;
}

/** Day of month and short month name, for the date tab on each row. */
function dateTab(millis) {
  if (!millis) return { day: '—', month: '' };
  const date = new Date(millis);
  return {
    day: String(date.getDate()),
    month: date.toLocaleString(undefined, { month: 'short' }),
  };
}

export default function History() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      try {
        const snapshot = await getDocs(
          query(
            collection(db, 'games_history'),
            where('uid', '==', user.uid),
            orderBy('completedAt', 'desc'),
            limit(PAGE_SIZE)
          )
        );
        if (cancelled) return;
        setGames(
          snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              completedAtMs: data.completedAt?.toMillis?.() ?? null,
            };
          })
        );
      } catch (err) {
        if (!cancelled) {
          play('error');
          setError(friendlyError(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  /**
   * Reopen a finished game on the summary screen. The stored record is passed
   * through router state as an immutable archive, so the summary renders exactly
   * the numbers that were saved rather than re-deriving anything.
   */
  function openGame(game) {
    navigate(`/game/${game.gameId}/summary`, {
      state: {
        archive: {
          gameId: game.gameId,
          settings: game.settings,
          rounds: game.rounds,
          totalScore: game.totalScore,
          maxScore: game.maxScore,
          completedAt: game.completedAtMs,
        },
      },
    });
  }

  return (
    <PageShell current="history" width="max-w-[1000px]">
      <PageHeading crumbs={[{ label: 'Home', to: '/home' }, { label: 'Game History' }]} title="Game History">
        Every game you have finished, newest first.
      </PageHeading>

      {loading && <WfSpinner label="Loading your games" className="py-16" />}

      {error && (
        <p className="wf-alert-error" role="alert">
          <AlertIcon />
          {error}
        </p>
      )}

      {!loading && !error && games.length === 0 && (
        <section className="wf-tray wf-dark">
          <div className="wf-row flex flex-col items-start gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="m-0 text-lg font-bold">You have not finished a game yet.</p>
            <Link to="/play/setup" className="wf-btn-amber">
              Play your first game <ArrowRight size={18} color="#23262b" />
            </Link>
          </div>
        </section>
      )}

      {games.length > 0 && (
        <section aria-label="Finished games" className="wf-tray wf-dark">
          <ul className="m-0 flex list-none flex-col gap-[5px] p-0 sm:gap-1.5">
            {games.map((game) => {
              const percent = game.maxScore
                ? Math.round((game.totalScore / game.maxScore) * 100)
                : 0;
              const tab = dateTab(game.completedAtMs);
              const settings = `${game.roundCount} ${game.roundCount === 1 ? 'round' : 'rounds'} · ${formatTimer(
                game.settings?.timer ?? 0
              )} · popularity ${game.settings?.popularity ?? 50}`;

              return (
                <li key={game.id}>
                  <button
                    type="button"
                    onClick={() => openGame(game)}
                    onPointerEnter={() => play('hover')}
                    className="group flex min-h-[84px] w-full items-stretch overflow-hidden rounded bg-wf-mist text-left text-wf-ink transition-colors hover:bg-white"
                  >
                    <div className="flex flex-[0_0_56px] flex-col items-center justify-center bg-wf-mist2 py-3 sm:flex-[0_0_92px]">
                      <span className="text-2xl font-extrabold leading-none sm:text-[30px]">{tab.day}</span>
                      <span className="text-[13px] font-bold text-wf-muted sm:text-sm">{tab.month}</span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3 py-3 sm:px-6 sm:py-4">
                      <span className="text-[15px] font-extrabold leading-snug sm:text-xl">{settings}</span>
                      <span className="text-[13px] text-wf-muted sm:text-[15px]">
                        {formatDate(game.completedAtMs)}
                      </span>
                    </div>
                    <div className="flex flex-[0_0_auto] items-center gap-[18px] py-3 pl-1 pr-3 sm:py-3.5 sm:pl-6 sm:pr-4">
                      <div className="flex flex-col items-end">
                        <span className="text-[21px] font-extrabold leading-[1.05] tabular-nums sm:text-[28px]">
                          {game.totalScore?.toLocaleString() ?? 0}
                        </span>
                        <span className="text-xs tabular-nums text-wf-muted sm:text-sm">
                          of {game.maxScore?.toLocaleString()}
                          <span className="hidden sm:inline"> · {percent}%</span>
                        </span>
                        <span className="text-[13px] font-extrabold tabular-nums text-wf-cobalt sm:hidden">
                          {percent}%
                        </span>
                      </div>
                      <span
                        aria-hidden="true"
                        className="hidden h-10 w-10 place-items-center rounded bg-wf-ink transition-transform group-hover:translate-x-0.5 sm:grid"
                      >
                        <ArrowRight size={18} color="#e3a52b" />
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </PageShell>
  );
}
