import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import ClosedPicker from '@/components/bible/ClosedPicker';
import BibleSpread from '@/components/bible/BibleSpread';
import BibleSinglePage from '@/components/bible/BibleSinglePage';
import RoundTimer from '@/components/RoundTimer';
import SoundToggle from '@/components/wf/SoundToggle';
import HomeButton from '@/components/wf/HomeButton';
import { useWfBody } from '@/components/wf/PageShell';
import { AlertIcon, ChevronDown, DragIcon, InfoIcon, LogoMark, PinIcon } from '@/components/wf/Icons';
import { useIsMobile } from '@/lib/useMediaQuery';
import { play } from '@/lib/sound';

export default function Game() {
  const {
    gameId,
    game,
    manifest,
    totalPages,
    view,
    activePage,
    goToPage,
    openAt,
    closeBible,
    selection,
    selectWord,
    submit,
    submitting,
    error,
  } = useGame();

  useWfBody(true);
  const mobile = useIsMobile();
  // The exact page last opened at. The game state only keeps the spread (the
  // odd left-hand page), which is all a two-page view needs; the single-page
  // phone view needs the page itself, or opening at an even page would land
  // one page early.
  const [openedPage, setOpenedPage] = useState(null);

  const handleOpen = useCallback(
    (page) => {
      setOpenedPage(page);
      openAt(page);
    },
    [openAt]
  );

  const round = game?.round;

  // The Space bar is a first-class submit control, so it has to be caught at
  // the window level — and stopped from scrolling the page.
  useEffect(() => {
    function onKeyDown(event) {
      if (event.code !== 'Space' && event.key !== ' ') return;
      if (event.target.matches?.('input, textarea, select, button, a')) return;
      event.preventDefault();
      play('submit');
      submit();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [submit]);

  const handleExpire = useCallback(() => {
    // Out of time: whatever is selected goes in; nothing selected scores zero.
    submit({ timedOut: true });
  }, [submit]);

  // Practice has no summary: a finished practice session goes back Home.
  const practice = game?.mode === 'practice';
  if (game?.status === 'complete' && !round) {
    return <Navigate to={practice ? '/home' : `/game/${gameId}/summary`} replace />;
  }
  if (!round) {
    return <Navigate to="/home" replace />;
  }

  const open = view === 'open';

  return (
    // Phones get exactly one screen: the book and its controls never scroll
    // away from each other.
    <div className="wf-root flex h-[100dvh] flex-col overflow-hidden bg-wf-stage md:h-auto md:min-h-screen md:overflow-visible">
      <GameHeader
        mobile={mobile}
        open={open}
        roundNumber={round.index + 1}
        roundCount={game.roundCount}
        practice={practice}
        totalScore={game.totalScore ?? 0}
        timer={
          <RoundTimer
            seconds={game.settings.timer}
            startedAtMs={round.startedAtMs}
            onExpire={handleExpire}
            stopped={submitting}
          />
        }
      />

      <VerseBanner text={round.text} mobile={mobile} compact={mobile && open} />

      <main className="relative flex min-h-0 flex-1 flex-col items-center px-4 pb-4 pt-3.5 md:justify-center md:px-6 md:pb-6 md:pt-7">
        {error && (
          <p className="wf-alert-error absolute left-1/2 top-3 z-30 m-0 w-[min(92%,520px)] -translate-x-1/2" role="alert">
            <AlertIcon />
            {error}
          </p>
        )}

        {/* One way of choosing a page on every screen size: turn the book to
            look at it, slide along the page edges, open at the slider. */}
        {!open && <ClosedPicker totalPages={totalPages} activePage={activePage} initialPage={openedPage} onOpen={handleOpen} />}

        {open && !mobile && (
          <BibleSpread
            manifest={manifest}
            activePage={activePage}
            onChangePage={goToPage}
            selection={selection}
            onSelectWord={selectWord}
            reserveBottom={150}
          />
        )}

        {open && mobile && (
          <BibleSinglePage
            manifest={manifest}
            // The page the player just opened at — never the page of an earlier
            // guess, which would drag them back to it every time they reopened.
            initialPage={openedPage ?? activePage}
            onChangePage={goToPage}
            selection={selection}
            onSelectWord={selectWord}
          />
        )}
      </main>

      <ActionBar
        mobile={mobile}
        open={open}
        selection={selection}
        submitting={submitting}
        onClose={closeBible}
        onSubmit={() => submit()}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function GameHeader({ mobile, open, roundNumber, roundCount, totalScore, timer, practice = false }) {
  const stats = (
    <dl className="m-0 grid flex-1 grid-cols-3 gap-[5px] md:flex md:flex-none md:gap-1.5">
      <div className="wf-stat">
        <dt>Round</dt>
        <dd>
          {roundNumber}
          {/* Practice is endless, so there is no "of N". */}
          {!practice && <span className="font-semibold text-wf-ondark2"> / {roundCount}</span>}
        </dd>
      </div>
      {timer}
      <div className="wf-stat">
        <dt>Score</dt>
        <dd className="!text-wf-amber">{totalScore.toLocaleString()}</dd>
      </div>
    </dl>
  );

  if (mobile) {
    return (
      <header className="wf-dark flex shrink-0 items-center gap-[5px] bg-wf-ink px-2 py-1.5 text-white">
        {/* Practice can be left at any time, so it gets a real Home button;
            a scored game keeps only the wordmark. */}
        {practice ? (
          <HomeButton />
        ) : (
          <Link
            to="/home"
            aria-label="BibleoGuessr, leave game and go home"
            className="grid h-11 w-11 shrink-0 place-items-center"
          >
            <LogoMark size={28} />
          </Link>
        )}
        {stats}
        <SoundToggle />
      </header>
    );
  }

  return (
    <header className="wf-dark bg-wf-ink text-white">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-2 gap-y-2.5 px-7 py-2.5">
        <Link
          to="/home"
          aria-label="BibleoGuessr, home"
          className="mr-5 flex min-h-[44px] items-center gap-2.5 text-white no-underline"
        >
          <LogoMark size={28} />
          <span className="text-[21px] font-extrabold">BibleoGuessr</span>
        </Link>
        {practice && <HomeButton className="mr-3" />}
        {stats}
        <span className="ml-auto hidden items-center gap-2 text-[15px] text-wf-ondark lg:flex">
          {open ? <DragIcon /> : <InfoIcon />}
          {open ? 'Drag a page sideways to turn it' : 'Slide along the page edges, then open the Bible'}
        </span>
        <SoundToggle className="ml-auto lg:ml-2" />
      </div>
    </header>
  );
}

/**
 * The verse to find, on cobalt. On phones it clamps to three lines with a
 * "show whole verse" switch, and shrinks to a single tappable line while the
 * book is open so the page gets the room.
 */
function VerseBanner({ text, mobile, compact }) {
  const [expanded, setExpanded] = useState(false);
  const quoted = `“${text}”`;
  const long = text.length > 110;

  if (compact) {
    return (
      <section aria-label="Verse to find" className="wf-dark shrink-0 bg-wf-cobalt text-white">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          data-sound="tick"
          className="flex min-h-12 w-full items-center gap-2 py-2 pl-4 pr-3.5 text-left text-[15px] font-semibold leading-snug"
        >
          <PinIcon size={14} color="#e3a52b" hole="#2753b8" />
          <span className={`min-w-0 flex-1 pt-0.5 ${expanded ? '' : 'truncate'}`}>
            <span className="sr-only">Verse to find: </span>
            {quoted}
          </span>
          <ChevronDown
            size={14}
            width={4}
            color="#e3a52b"
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      </section>
    );
  }

  return (
    <section aria-label="Verse to find" className="wf-dark shrink-0 bg-wf-cobalt text-white">
      <div className="mx-auto flex max-w-[980px] flex-col gap-1.5 px-4 pb-1 pt-3 md:items-center md:gap-2 md:px-7 md:pb-5 md:pt-[18px] md:text-center">
        <span className="flex items-center gap-2 text-[13px] font-extrabold text-wf-amber md:text-sm">
          <PinIcon size={14} color="#e3a52b" hole="#2753b8" />
          Find this verse
        </span>
        <p
          className={`m-0 text-[17px] font-semibold leading-[1.4] md:text-[22px] md:[text-wrap:balance] ${
            mobile && !expanded ? 'line-clamp-3' : ''
          }`}
        >
          {quoted}
        </p>
        {mobile && long ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            data-sound="tick"
            className="flex h-10 items-center gap-1.5 self-start text-sm font-bold underline underline-offset-4"
          >
            {expanded ? 'Show less' : 'Show whole verse'}
            <ChevronDown
              size={12}
              width={4}
              color="#e3a52b"
              className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        ) : (
          mobile && <span className="h-2" />
        )}
      </div>
    </section>
  );
}

/** The charcoal bar along the bottom: the guess so far, and what to do with it. */
function ActionBar({ mobile, open, selection, submitting, onClose, onSubmit }) {
  let status;
  if (selection) {
    status = (
      <>
        Your guess{' '}
        <b className="rounded bg-wf-cobalt px-2.5 pb-px pt-1 text-base font-extrabold text-white md:px-3 md:pb-0.5 md:pt-[5px] md:text-lg">
          {selection.reference}
        </b>{' '}
        <span className="tabular-nums">
          {mobile ? 'p.' : 'page'} {selection.page.toLocaleString()}
        </span>
      </>
    );
  } else if (open) {
    status = mobile ? 'Tap a verse to place your guess.' : 'Click a verse to place your guess.';
  } else {
    status = (
      <>
        {!mobile && (
          <span
            aria-hidden="true"
            className="grid h-7 w-7 place-items-center rounded bg-wf-ink2 pt-0.5 font-extrabold text-wf-amber"
          >
            ?
          </span>
        )}
        {mobile ? 'No guess yet — submitting now scores 0.' : 'No guess placed yet — submitting now would score 0.'}
      </>
    );
  }

  const submitButton = (
    <button
      type="button"
      onClick={onSubmit}
      disabled={submitting}
      data-sound="submit"
      className={`wf-btn-amber text-[17px] ${mobile ? 'h-[52px]' : ''} ${mobile && open ? 'flex-[1.6]' : ''}`}
      style={mobile ? { paddingTop: 3, paddingBottom: 0 } : undefined}
    >
      {submitting ? 'Submitting…' : 'Submit Guess'}
      {!mobile && <kbd className="wf-kbd">Space</kbd>}
    </button>
  );

  const closeButton = open && (
    <button
      type="button"
      onClick={onClose}
      data-sound="bookClose"
      className={`wf-btn-ghost text-base ${mobile ? 'h-[52px] flex-1' : ''}`}
    >
      Close Bible
    </button>
  );

  const statusLine = (
    <p
      className="m-0 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm leading-snug text-wf-ondark md:gap-x-3 md:text-base"
      aria-live="polite"
    >
      {status}
    </p>
  );

  if (mobile) {
    return (
      <footer className="wf-dark flex shrink-0 flex-col gap-2.5 bg-wf-ink px-3 pb-3 pt-2.5 text-white">
        {open ? (
          <>
            {statusLine}
            <div className="flex gap-2">
              {closeButton}
              {submitButton}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex-1">{statusLine}</div>
            {submitButton}
          </div>
        )}
      </footer>
    );
  }

  return (
    <footer className="wf-dark bg-wf-ink text-white">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-6 gap-y-3 px-7 py-3">
        {statusLine}
        <div className="ml-auto flex gap-2.5">
          {closeButton}
          {submitButton}
        </div>
      </div>
    </footer>
  );
}
