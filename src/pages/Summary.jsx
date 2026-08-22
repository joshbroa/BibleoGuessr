import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import ScoreBar from '@/components/ScoreBar';
import Spinner from '@/components/Spinner';
import { getGameSummary, saveGameHistory, friendlyError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { MAX_ROUND_SCORE } from '@shared/scoring';

function formatDuration(ms) {
  if (ms == null) return '—';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}

function formatDistance(distance) {
  if (distance === null || distance === undefined) return '—';
  return `${distance.toLocaleString(undefined, { maximumFractionDigits: 1 })} pp`;
}

export default function Summary() {
  const { gameId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isRegistered } = useAuth();

  // A summary reopened from Game History arrives complete in router state and is
  // rendered exactly as it was stored — no refetch, no recomputation.
  const archive = location.state?.archive ?? null;

  const [summary, setSummary] = useState(archive);
  const [loading, setLoading] = useState(!archive);
  const [error, setError] = useState('');
  const [persisted, setPersisted] = useState(Boolean(archive));

  // The history write must happen once and only once, even though React
  // StrictMode mounts effects twice in development.
  const saveAttempted = useRef(Boolean(archive));

  useEffect(() => {
    if (archive) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const data = await getGameSummary({ gameId });
        if (cancelled) return;
        setSummary(data);

        // Data persistence hook: fire the write as soon as the summary resolves,
        // before the navigation buttons become interactive, so leaving this
        // screen can never race the record being saved. The backend keys the
        // history document by gameId, making the write atomic and idempotent.
        if (isRegistered && !saveAttempted.current) {
          saveAttempted.current = true;
          const saved = await saveGameHistory({ gameId });
          if (!cancelled) setPersisted(Boolean(saved?.saved));
        }
      } catch (err) {
        if (!cancelled) setError(friendlyError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [archive, gameId, isRegistered]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Spinner label="Tallying your score" />
      </main>
    );
  }

  if (error || !summary) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="form-error max-w-md text-center">{error || 'That game could not be loaded.'}</p>
        <Link to="/home" className="btn-secondary">
          Return Home
        </Link>
      </main>
    );
  }

  const rounds = summary.rounds ?? [];
  const percent = summary.maxScore
    ? Math.round((summary.totalScore / summary.maxScore) * 100)
    : 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-6 text-center animate-fade-up">
        <p className="text-[10px] uppercase tracking-[0.3em] text-gilt-500">
          {archive ? 'Archived game' : 'Game complete'}
        </p>
        <h1 className="mt-1 font-display text-4xl font-bold text-parchment-50">
          {summary.totalScore.toLocaleString()}
          <span className="text-xl font-normal text-parchment-400">
            {' '}
            / {summary.maxScore.toLocaleString()}
          </span>
        </h1>
        <p className="mt-1 text-parchment-300">
          {percent}% across {rounds.length} {rounds.length === 1 ? 'round' : 'rounds'}
        </p>
      </header>

      <div className="panel mb-6">
        <ScoreBar
          score={summary.totalScore}
          max={summary.maxScore}
          label="Final score"
          size="lg"
          durationMs={1500}
        />
      </div>

      <div className="panel mb-6 overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Round-by-round breakdown</caption>
          <thead>
            <tr className="border-b border-gilt-600/25 text-[10px] uppercase tracking-widest text-parchment-400">
              <th scope="col" className="px-4 py-3">
                Round
              </th>
              <th scope="col" className="px-4 py-3">
                Time
              </th>
              <th scope="col" className="px-4 py-3">
                Your Guess
              </th>
              <th scope="col" className="px-4 py-3">
                Answer
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Page variance
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Score
              </th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((round, index) => (
              <tr
                key={round.round ?? index}
                className="border-b border-gilt-600/10 last:border-0 hover:bg-leather-800/40"
              >
                <th scope="row" className="px-4 py-3 font-display font-bold text-parchment-100">
                  {(round.round ?? index) + 1}
                </th>
                <td className="px-4 py-3 tabular-nums text-parchment-300">
                  {formatDuration(round.timeTakenMs)}
                </td>
                <td className="px-4 py-3 text-parchment-100">
                  {round.guess ? round.guess.reference : <span className="text-red-300">No guess</span>}
                </td>
                <td className="px-4 py-3 text-emerald-300">{round.answer?.reference ?? '—'}</td>
                <td className="px-4 py-3 text-right tabular-nums text-parchment-300">
                  {formatDistance(round.distance)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-leather-950">
                      <div
                        className="h-full rounded-full bg-gilt-500"
                        style={{ width: `${(round.score / MAX_ROUND_SCORE) * 100}%` }}
                      />
                    </div>
                    <span className="w-14 font-display font-bold tabular-nums text-gilt-400">
                      {round.score.toLocaleString()}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!archive && (
        <p className="mb-6 text-center text-sm text-parchment-400">
          {isRegistered
            ? persisted
              ? 'Saved to your game history.'
              : 'Saving to your game history…'
            : 'Playing as a guest — this game was not saved. Sign up to keep your history.'}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="btn-secondary flex-1 py-3"
        >
          Return Home
        </button>
        <button
          type="button"
          onClick={() => navigate('/play/setup')}
          className="btn-primary flex-1 py-3"
        >
          Play Again
        </button>
      </div>
    </main>
  );
}
