import { useEffect, useRef, useState } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import ScoreBar from '@/components/ScoreBar';
import PageShell, { WfSpinner } from '@/components/wf/PageShell';
import { AlertIcon, ArrowRight, PinIcon } from '@/components/wf/Icons';
import { getGameSummary, saveGameHistory, friendlyError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { play } from '@/lib/sound';
import { MAX_ROUND_SCORE } from '@shared/scoring';

function formatDuration(ms) {
  if (ms == null) return '—';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}

function formatDistance(distance, unit = 'pp') {
  if (distance === null || distance === undefined) return '—';
  return `${distance.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`;
}

export default function Summary() {
  const { gameId } = useParams();
  const location = useLocation();
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
        play('gameComplete', { force: true });

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
  }, [archive, gameId, isRegistered]);

  if (loading) {
    return (
      <PageShell header="logo" footer={false}>
        <WfSpinner label="Tallying your score" className="flex-1 py-24" />
      </PageShell>
    );
  }

  if (error || !summary) {
    return (
      <PageShell header="logo">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
          <p className="wf-alert-error m-0 max-w-md" role="alert">
            <AlertIcon />
            {error || 'That game could not be loaded.'}
          </p>
          <Link to="/home" className="wf-btn-ink">
            Return Home
          </Link>
        </div>
      </PageShell>
    );
  }

  const rounds = summary.rounds ?? [];
  const percent = summary.maxScore
    ? Math.round((summary.totalScore / summary.maxScore) * 100)
    : 0;

  return (
    <PageShell header="logo" width="max-w-[1040px]">
      <section aria-label="Final score" className="wf-tray wf-dark">
        <div className="flex flex-col gap-1 px-3 pb-2 pt-3 text-white sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-x-6 sm:gap-y-2.5 sm:px-[18px] sm:pb-3 sm:pt-4">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-2 text-sm font-extrabold text-wf-amber sm:text-[15px]">
              <PinIcon size={14} color="#e3a52b" hole="#23262b" />
              {archive ? 'Archived game' : 'Game complete'}
            </span>
            <h1 className="m-0 font-normal tabular-nums">
              <b className="text-5xl font-extrabold leading-none sm:text-6xl">
                {summary.totalScore.toLocaleString()}
              </b>{' '}
              <span className="text-xl font-semibold text-wf-ondark sm:text-[26px]">
                / {summary.maxScore.toLocaleString()}
              </span>
            </h1>
          </div>
          <span className="text-[15px] font-bold text-wf-ondark sm:text-lg">
            {percent}% across {rounds.length} {rounds.length === 1 ? 'round' : 'rounds'}
          </span>
        </div>
        <div className="wf-row px-3 pb-3.5 pt-3 sm:px-5 sm:pb-[18px] sm:pt-4">
          <ScoreBar
            score={summary.totalScore}
            max={summary.maxScore}
            label="Final score"
            size="lg"
            durationMs={1500}
            audible={!archive}
          />
        </div>
      </section>

      <section aria-labelledby="rounds-heading" className="wf-tray wf-dark">
        <h2 id="rounds-heading" className="m-0 px-2.5 pb-1 pt-2 text-base font-extrabold text-white sm:sr-only">
          Round by round
        </h2>

        {/* Column labels, desktop only: on phones each row labels itself. */}
        <div aria-hidden="true" className="hidden gap-4 px-4 pb-1.5 pt-2.5 text-[13px] font-bold text-wf-ondark sm:flex">
          <span className="flex-[0_0_44px]">Round</span>
          <span className="flex-[0_0_70px]">Time</span>
          <span className="flex-[1_1_160px]">Your guess</span>
          <span className="flex-[1_1_200px]">Answer</span>
          <span className="flex-[0_0_110px] text-right">Page variance</span>
          <span className="flex-[0_0_170px] text-right">Score</span>
        </div>

        <ol className="m-0 flex list-none flex-col gap-[5px] p-0 sm:gap-1.5">
          {rounds.map((round, index) => (
            <RoundRow key={round.round ?? index} round={round} number={(round.round ?? index) + 1} />
          ))}
        </ol>
      </section>

      {!archive && (
        <p className="m-0 text-center text-[15px] font-semibold text-wf-muted" role="status">
          {isRegistered ? (
            persisted ? (
              'Saved to your game history.'
            ) : (
              'Saving to your game history…'
            )
          ) : (
            <>
              Playing as a guest — this game was not saved.{' '}
              <Link to="/signup" className="font-bold text-wf-cobalt underline underline-offset-2">
                Sign up
              </Link>{' '}
              to keep your history.
            </>
          )}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap">
        <Link
          to="/home"
          className="wf-btn-outline h-[52px] text-[17px] sm:h-auto sm:flex-[1_1_200px]"
          style={{ padding: '16px 20px 13px' }}
        >
          Return Home
        </Link>
        <Link
          to="/play/setup"
          className="wf-btn-amber h-[58px] text-[19px] sm:h-auto sm:flex-[2_1_280px]"
          style={{ padding: '18px 20px 15px' }}
        >
          Play Again <ArrowRight size={20} color="#23262b" />
        </Link>
      </div>
    </PageShell>
  );
}

function RoundRow({ round, number }) {
  const pct = `${(round.score / MAX_ROUND_SCORE) * 100}%`;
  const guess = round.guess ? (
    <b className="font-bold">{round.guess.reference}</b>
  ) : (
    <b className="font-bold text-wf-crimson">No guess</b>
  );
  const answer = round.answer?.reference ?? '—';
  const miniBar = (
    <span aria-hidden="true" className="box-border block h-[9px] w-16 rounded-sm bg-wf-ink p-0.5 sm:h-2.5 sm:w-20">
      <span className="block h-full rounded-[1px] bg-wf-amber" style={{ width: pct }} />
    </span>
  );

  return (
    <li className="wf-row">
      {/* Phones: a card per round. */}
      <div className="flex flex-col gap-2 px-3 pb-2.5 pt-3 sm:hidden">
        <div className="flex items-start gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-wf-ink pt-0.5 font-extrabold text-white">
            <span className="sr-only">Round </span>
            {number}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-[3px] text-[15px]">
            <span>
              <span className="inline-block w-[52px] text-xs font-bold text-wf-muted">Guess</span>
              {guess}
            </span>
            <span className="flex items-center">
              <span className="inline-block w-[52px] text-xs font-bold text-wf-muted">Answer</span>
              <span aria-hidden="true" className="mr-1.5 h-[9px] w-[9px] shrink-0 rounded-sm bg-wf-amber" />
              <b className="font-bold">{answer}</b>
            </span>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-[5px]">
            <b className="text-xl font-extrabold leading-none tabular-nums">{round.score.toLocaleString()}</b>
            {miniBar}
          </div>
        </div>
        <span className="pl-11 text-[13px] text-wf-muted">
          {formatDuration(round.timeTakenMs)} · {formatDistance(round.distance, 'pages off')}
        </span>
      </div>

      {/* Desktop: one row per round, under the column labels. */}
      <div className="hidden items-center gap-4 px-4 py-2.5 text-base sm:flex">
        <span className="flex-[0_0_44px]">
          <span className="box-border grid h-[34px] w-[34px] place-items-center rounded bg-wf-ink pt-0.5 font-extrabold text-white">
            <span className="sr-only">Round </span>
            {number}
          </span>
        </span>
        <span className="flex-[0_0_70px] tabular-nums text-wf-muted">{formatDuration(round.timeTakenMs)}</span>
        <span className="flex-[1_1_160px]">{guess}</span>
        <span className="flex flex-[1_1_200px] items-center gap-2 font-bold">
          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-sm bg-wf-amber" />
          {answer}
        </span>
        <span className="flex-[0_0_110px] text-right tabular-nums text-wf-muted">{formatDistance(round.distance)}</span>
        <span className="flex flex-[0_0_170px] items-center justify-end gap-3">
          {miniBar}
          <b className="min-w-[54px] text-right font-extrabold tabular-nums">{round.score.toLocaleString()}</b>
        </span>
      </div>
    </li>
  );
}
