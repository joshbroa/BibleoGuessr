import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import BibleSpread from '@/components/bible/BibleSpread';
import BibleSinglePage from '@/components/bible/BibleSinglePage';
import ScoreBar from '@/components/ScoreBar';
import Celebration from '@/components/Celebration';
import { useWfBody } from '@/components/wf/PageShell';
import { ArrowRight } from '@/components/wf/Icons';
import HomeButton from '@/components/wf/HomeButton';
import { MAX_ROUND_SCORE } from '@shared/scoring';
import { spreadStart } from '@/lib/pageCache';
import { useIsMobile } from '@/lib/useMediaQuery';
import { play } from '@/lib/sound';

export default function RoundResult() {
  const { gameId, manifest, lastResult, advance, game } = useGame();
  useWfBody(true);
  const mobile = useIsMobile();

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

  /** A perfect round: the verse they picked is the verse it was. */
  const exact =
    Boolean(result?.guess) &&
    result.guess.book === result.answer.book &&
    result.guess.chapter === result.answer.chapter &&
    result.guess.verse === result.answer.verse;

  // The verdict: a fanfare for the exact verse, otherwise a chime whose figure
  // brightens with the score — timed to land as the meter finishes filling.
  useEffect(() => {
    if (!result) return undefined;
    const id = setTimeout(() => {
      if (exact) play('perfect', { force: true });
      else play('chime', { quality: result.score / MAX_ROUND_SCORE, force: true });
    }, 1150);
    return () => clearTimeout(id);
  }, [result, exact]);

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

  async function handleNext() {
    setBusy(true);
    await advance();
    setBusy(false);
  }

  // The book behind the result: a two-page spread on desktop, one page on a
  // phone. Interactive only while the player is inspecting it, and even then
  // the guess cannot be changed — there is no `onSelectWord`.
  const book = mobile ? (
    <BibleSinglePage
      manifest={manifest}
      initialPage={guess?.page ?? answer.page}
      selection={guess}
      answer={answer}
      interactive={inspecting}
      flipTo={flipTo}
      onFlipDone={() => setFlipTo(null)}
    />
  ) : (
    <BibleSpread
      manifest={manifest}
      activePage={page}
      onChangePage={setPage}
      interactive={inspecting}
      answer={answer}
      selection={guess}
      flipTo={flipTo}
      // Clearing this when the riffle lands is what hands control back: an
      // outstanding flip destination suppresses dragging, so leaving it set
      // would leave the book unturnable for the rest of the round.
      onFlipDone={() => setFlipTo(null)}
      reserveBottom={inspecting ? 150 : 40}
    />
  );

  return (
    <div className="wf-root relative h-[100dvh] overflow-hidden bg-wf-stage md:h-auto md:min-h-screen md:overflow-visible">
      <div
        className={
          inspecting
            ? 'flex h-full flex-col items-center px-4 pb-36 pt-4 md:min-h-screen md:justify-center md:px-6 md:py-6 md:pb-32'
            : 'pointer-events-none absolute inset-x-4 top-4 flex h-[70vh] flex-col items-center blur-[3px] md:inset-0 md:h-auto md:justify-center md:opacity-85'
        }
        aria-hidden={!inspecting}
      >
        {book}
      </div>

      {inspecting ? (
        <div className="wf-dark fixed inset-x-0 bottom-4 z-30 flex flex-col items-center gap-2 px-4 md:bottom-6">
          <p className="m-0 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-md bg-wf-ink px-4 pb-1.5 pt-2.5 text-sm text-wf-ondark shadow-lg">
            <span className="rounded-[3px] bg-wf-amber px-2 pb-px pt-1 font-extrabold text-wf-ink">
              {answer.reference}
            </span>
            is the answer
            {guess && (
              <>
                <span aria-hidden="true">·</span>
                your guess
                <span className="rounded-[3px] bg-wf-cobalt px-2 pb-px pt-1 font-extrabold text-white">
                  {guess.reference}
                </span>
              </>
            )}
          </p>
          <button type="button" onClick={() => setInspecting(false)} className="wf-btn-amber">
            Back to Results
          </button>
        </div>
      ) : (
        <>
          <div aria-hidden="true" className="absolute inset-0 bg-wf-ink/55" />
          <div className="relative z-10 flex h-full items-end justify-center md:min-h-screen md:items-center md:px-6 md:py-10">
            <ResultCard
              mobile={mobile}
              result={result}
              lastResult={lastResult}
              exact={exact}
              answer={answer}
              guess={guess}
              distance={distance}
              score={score}
              timedOut={timedOut}
              isLastRound={isLastRound}
              busy={busy}
              onInspect={() => setInspecting(true)}
              onNext={handleNext}
            />
          </div>
        </>
      )}

      <Celebration active={exact} />
    </div>
  );
}

function ResultCard({
  mobile,
  result,
  lastResult,
  exact,
  answer,
  guess,
  distance,
  score,
  timedOut,
  isLastRound,
  busy,
  onInspect,
  onNext,
}) {
  const practice = lastResult.mode === 'practice';
  const guessDetail = guess
    ? timedOut
      ? `Page ${guess.page.toLocaleString()} — submitted when time ran out`
      : `Page ${guess.page.toLocaleString()}`
    : timedOut
      ? 'The clock ran out with nothing selected.'
      : 'Nothing was selected.';

  return (
    <section
      aria-label="Round result"
      className={`wf-tray wf-dark w-full animate-wf-rise shadow-[0_30px_60px_-24px_rgba(0,0,0,0.6)] ${
        mobile
          ? 'absolute inset-x-0 bottom-0 top-16 overflow-y-auto rounded-b-none rounded-t-[14px] px-1.5 pb-2.5 pt-2'
          : 'max-w-[760px]'
      }`}
    >
      {mobile && <span aria-hidden="true" className="mx-auto mb-1 mt-0.5 block h-[5px] w-11 rounded-[3px] bg-wf-line2" />}

      <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1.5 px-2.5 pb-1.5 pt-1 text-white sm:px-[18px] sm:pb-3 sm:pt-4">
        <span className="text-[15px] font-bold text-wf-ondark2 sm:text-base">
          {practice ? `Round ${result.round + 1}` : `Round ${result.round + 1} of ${lastResult.roundCount}`}
        </span>
        <h1 className="m-0 font-normal tabular-nums">
          <b className="text-[42px] font-extrabold leading-none text-wf-amber sm:text-[54px]">
            {score.toLocaleString()}
          </b>{' '}
          <span className="text-lg font-semibold text-wf-ondark sm:text-2xl">
            / {MAX_ROUND_SCORE.toLocaleString()}
          </span>
        </h1>
        {exact && (
          <p className="m-0 basis-full text-lg font-extrabold text-wf-amber">
            Exact verse — perfect round!
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-[5px] sm:gap-1.5 sm:[grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))]">
        <ReferenceCard tag="Your guess" tagClass="bg-wf-cobalt text-white" reference={guess ? guess.reference : 'No guess'} detail={guessDetail} />
        <ReferenceCard
          tag="Correct answer"
          tagClass="bg-wf-amber text-wf-ink"
          reference={answer.reference}
          detail={`Page ${answer.page.toLocaleString()}`}
        />
      </div>

      <div className="wf-row flex flex-col gap-3 px-3.5 py-3.5 sm:gap-3.5 sm:px-5 sm:pb-5 sm:pt-[18px]">
        <ScoreBar score={score} max={MAX_ROUND_SCORE} label="Round score" audible />

        <dl className="m-0 flex flex-wrap justify-between gap-x-6 gap-y-2.5 border-t border-wf-off pt-2.5 sm:pt-3">
          <div className="flex flex-col">
            <dt className="text-[13px] text-wf-muted sm:text-sm">Page distance</dt>
            <dd className="m-0 text-lg font-extrabold tabular-nums sm:text-[22px]">
              {distance === null
                ? '—'
                : `${distance.toLocaleString(undefined, { maximumFractionDigits: 2 })} pages`}
            </dd>
          </div>
          <div className="flex flex-col items-end">
            <dt className="text-[13px] text-wf-muted sm:text-sm">Total so far</dt>
            <dd className="m-0 text-lg font-extrabold tabular-nums sm:text-[22px]">
              {lastResult.totalScore.toLocaleString()}
              {/* Practice has no maximum: it never ends. */}
              {!practice && (
                <span className="text-[13px] font-semibold text-wf-muted sm:text-base">
                  {' '}
                  / {lastResult.maxScore.toLocaleString()}
                </span>
              )}
            </dd>
          </div>
        </dl>

        <blockquote className="m-0 flex gap-2 rounded bg-white px-3 pb-2.5 pt-3 font-wf text-[15px] leading-[1.45] sm:gap-2.5 sm:px-4 sm:pb-3 sm:pt-3.5 sm:text-base sm:leading-normal">
          <span aria-hidden="true" className="text-[30px] font-extrabold leading-[0.8] text-wf-amber sm:text-[34px]">
            “
          </span>
          <span>{answer.text}</span>
        </blockquote>
      </div>

      <div className="flex flex-wrap gap-[5px] sm:gap-1.5">
        {/* Practice can be left between rounds; a scored game cannot. */}
        {practice && <HomeButton className="h-14 basis-full justify-center sm:h-auto sm:basis-auto sm:px-5" />}
        <button
          type="button"
          onClick={onInspect}
          data-sound="pageTurn"
          className="wf-btn-mist h-14 flex-1 text-base sm:h-auto sm:flex-[1_1_200px] sm:text-[17px]"
          style={{ padding: '18px 20px 15px' }}
        >
          Look at the Bible
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={busy}
          className="wf-btn-amber h-14 flex-[1.2] text-lg sm:h-auto sm:flex-[2_1_280px] sm:text-[19px]"
          style={{ padding: '18px 20px 15px' }}
        >
          {busy ? 'Loading…' : isLastRound && !practice ? 'See Final Results' : 'Next Round'}
          {!busy && <ArrowRight size={20} color="#23262b" />}
        </button>
      </div>
    </section>
  );
}

function ReferenceCard({ tag, tagClass, reference, detail }) {
  return (
    <div className="flex flex-col gap-[5px] rounded bg-wf-mist p-3 sm:gap-1.5 sm:px-5 sm:pb-[18px] sm:pt-4">
      <span className={`self-start rounded-[3px] px-[7px] pb-px pt-[3px] text-xs font-extrabold sm:px-[9px] sm:pb-0.5 sm:pt-1 sm:text-[13px] ${tagClass}`}>
        {tag}
      </span>
      <span className="text-xl font-extrabold leading-[1.1] sm:text-[30px] sm:leading-[1.05]">{reference}</span>
      <span className="text-[13px] tabular-nums text-wf-muted sm:text-[15px]">{detail}</span>
    </div>
  );
}
