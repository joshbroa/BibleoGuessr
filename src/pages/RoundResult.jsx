import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import BibleSpread from '@/components/bible/BibleSpread';
import ScoreBar from '@/components/ScoreBar';
import Celebration from '@/components/Celebration';
import { MAX_ROUND_SCORE } from '@shared/scoring';
import { spreadStart } from '@/lib/pageCache';

function ReferenceCard({ title, reference, detail, tone }) {
  const border = tone === 'answer' ? 'border-emerald-500/40' : 'border-gilt-600/40';
  const accent = tone === 'answer' ? 'text-emerald-300' : 'text-gilt-400';

  return (
    <div className={`panel flex-1 ${border}`}>
      <p className="text-[10px] uppercase tracking-[0.25em] text-parchment-400">{title}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${accent}`}>{reference}</p>
      {detail && <p className="mt-1 text-sm text-parchment-300">{detail}</p>}
    </div>
  );
}

export default function RoundResult() {
  const { gameId, manifest, lastResult, advance, game } = useGame();

  const result = lastResult?.result;

  // The flip-back starts wherever the player left the book and travels to the
  // answer, so the distance they missed by is something you watch, not read.
  const [page, setPage] = useState(() =>
    spreadStart(result?.guess?.page ?? result?.answer?.page ?? 1)
  );
  const [flipTo, setFlipTo] = useState(null);
  const [inspecting, setInspecting] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!result) return undefined;
    const id = setTimeout(() => setFlipTo(result.answer.page), 650);
    return () => clearTimeout(id);
  }, [result]);

  // Landing here without a result means a reload or a hand-typed URL; the game
  // screen is the honest place to send them back to.
  if (!lastResult) {
    return (
      <Navigate
        to={game?.status === 'complete' ? `/game/${gameId}/summary` : `/game/${gameId}`}
        replace
      />
    );
  }

  const { answer, guess, distance, score, timedOut } = result;
  const isLastRound = lastResult.finished;

  /** A perfect round: the verse they picked is the verse it was. */
  const exact =
    Boolean(guess) &&
    guess.book === answer.book &&
    guess.chapter === answer.chapter &&
    guess.verse === answer.verse;

  async function handleNext() {
    setBusy(true);
    await advance();
    setBusy(false);
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* The Bible: dimmed behind the result cards, and brought fully forward
          when the player asks to look at the answer for themselves. */}
      <div
        className={
          inspecting
            ? 'flex min-h-screen flex-col items-center justify-center px-4 py-6'
            : 'pointer-events-none absolute inset-0 flex items-center justify-center opacity-30 blur-[1px]'
        }
        aria-hidden={!inspecting}
      >
        <BibleSpread
          manifest={manifest}
          activePage={page}
          onChangePage={setPage}
          // Interactive while inspecting — the player can turn pages and hover
          // verses — but `onSelectWord` stays absent, so the round's guess is
          // fixed and cannot be changed after the fact.
          interactive={inspecting}
          answer={answer}
          selection={guess}
          flipTo={flipTo}
          // Clearing this when the riffle lands is what hands control back: an
          // outstanding flip destination suppresses dragging, so leaving it set
          // would leave the book unturnable for the rest of the round.
          onFlipDone={() => setFlipTo(null)}
        />
      </div>

      {inspecting ? (
        <div className="fixed inset-x-0 bottom-6 z-30 flex flex-col items-center gap-2 px-4">
          <p className="rounded-full border border-gilt-600/30 bg-leather-950/90 px-4 py-1.5 text-sm text-parchment-300 shadow-lg backdrop-blur">
            <span className="font-semibold text-emerald-300">{answer.reference}</span> in green
            {guess && (
              <>
                {' · your guess '}
                <span className="font-semibold text-gilt-400">{guess.reference}</span>
              </>
            )}
          </p>
          <button type="button" onClick={() => setInspecting(false)} className="btn-primary px-6 py-2.5">
            Back to Results
          </button>
        </div>
      ) : (
        <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-5 px-4 py-10">
          <header className="text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gilt-500">
              Round {result.round + 1} of {lastResult.roundCount}
            </p>
            <h1 className="mt-1 font-display text-4xl font-bold text-parchment-50">
              {score.toLocaleString()}{' '}
              <span className="text-xl font-normal text-parchment-400">
                / {MAX_ROUND_SCORE.toLocaleString()}
              </span>
            </h1>
            {exact && (
              <p className="mt-2 font-display text-lg font-bold text-emerald-300">
                Exact verse — perfect round!
              </p>
            )}
          </header>

          <div className="flex flex-col gap-3 sm:flex-row">
            <ReferenceCard
              title="Your Guess"
              reference={guess ? guess.reference : 'No guess'}
              detail={
                guess
                  ? timedOut
                    ? `Page ${guess.page.toLocaleString()} — submitted when time ran out`
                    : `Page ${guess.page.toLocaleString()}`
                  : timedOut
                    ? 'The clock ran out with nothing selected.'
                    : 'Nothing was selected.'
              }
            />
            <ReferenceCard
              title="Correct Answer"
              reference={answer.reference}
              detail={`Page ${answer.page.toLocaleString()}`}
              tone="answer"
            />
          </div>

          <div className="panel space-y-4">
            <ScoreBar score={score} max={MAX_ROUND_SCORE} label="Round score" size="lg" />

            <dl className="grid grid-cols-2 gap-4 border-t border-gilt-600/20 pt-4 text-sm">
              <div>
                <dt className="text-parchment-400">Page distance</dt>
                <dd className="font-display text-lg font-bold tabular-nums text-parchment-50">
                  {distance === null
                    ? '—'
                    : `${distance.toLocaleString(undefined, { maximumFractionDigits: 2 })} pages`}
                </dd>
              </div>
              <div className="text-right">
                <dt className="text-parchment-400">Total so far</dt>
                <dd className="font-display text-lg font-bold tabular-nums text-gilt-400">
                  {lastResult.totalScore.toLocaleString()} / {lastResult.maxScore.toLocaleString()}
                </dd>
              </div>
            </dl>

            <blockquote className="border-l-2 border-gilt-600/40 pl-3 font-scripture text-sm italic leading-relaxed text-parchment-300">
              {answer.text}
            </blockquote>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setInspecting(true)}
              className="btn-secondary flex-1 py-3"
            >
              Look at the Bible
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={busy}
              className="btn-primary flex-[2] py-3 text-base"
            >
              {busy ? 'Loading…' : isLastRound ? 'See Final Results' : 'Next Round'}
            </button>
          </div>
        </div>
      )}

      <Celebration active={exact} />
    </div>
  );
}
