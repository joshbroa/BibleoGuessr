import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import Navbar from '@/components/Navbar';
import Spinner from '@/components/Spinner';
import { db } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { friendlyError } from '@/lib/api';

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
        if (!cancelled) setError(friendlyError(err));
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
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-10">
        <header className="mb-6">
          <h1 className="font-display text-3xl font-bold text-parchment-50">Game History</h1>
          <p className="mt-1 text-parchment-300">Every game you have finished, newest first.</p>
        </header>

        {loading && <Spinner label="Loading your games" className="py-16" />}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && games.length === 0 && (
          <div className="panel text-center">
            <p className="text-parchment-300">You have not finished a game yet.</p>
            <Link to="/play/setup" className="btn-primary mt-4">
              Play your first game
            </Link>
          </div>
        )}

        {games.length > 0 && (
          <ul className="space-y-3">
            {games.map((game) => {
              const percent = game.maxScore
                ? Math.round((game.totalScore / game.maxScore) * 100)
                : 0;
              return (
                <li key={game.id}>
                  <button
                    type="button"
                    onClick={() => openGame(game)}
                    className="panel flex w-full items-center gap-4 text-left transition hover:border-gilt-500/60 hover:bg-leather-800/70"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-semibold text-parchment-50">
                        {game.roundCount} {game.roundCount === 1 ? 'round' : 'rounds'} ·{' '}
                        {formatTimer(game.settings?.timer ?? 0)} · popularity{' '}
                        {game.settings?.popularity ?? 50}
                      </p>
                      <p className="mt-0.5 text-sm text-parchment-400">
                        {formatDate(game.completedAtMs)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-2xl font-bold tabular-nums text-gilt-400">
                        {game.totalScore?.toLocaleString() ?? 0}
                      </p>
                      <p className="text-xs text-parchment-400">
                        of {game.maxScore?.toLocaleString()} · {percent}%
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
