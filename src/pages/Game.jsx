import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import ClosedBible3D from '@/components/bible/ClosedBible3D';
import BibleSpread from '@/components/bible/BibleSpread';
import RoundTimer from '@/components/RoundTimer';

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

  const navigate = useNavigate();
  const [hoverPage, setHoverPage] = useState(null);

  const round = game?.round;

  // The Space bar is a first-class submit control, so it has to be caught at
  // the window level — and stopped from scrolling the page.
  useEffect(() => {
    function onKeyDown(event) {
      if (event.code !== 'Space' && event.key !== ' ') return;
      if (event.target.matches?.('input, textarea, select, button, a')) return;
      event.preventDefault();
      submit();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [submit]);

  const handleExpire = useCallback(() => {
    // Out of time: submit nothing at all, which scores zero.
    submit({ timedOut: true });
  }, [submit]);

  if (game?.status === 'complete' && !round) {
    return <Navigate to={`/game/${gameId}/summary`} replace />;
  }
  if (!round) {
    return <Navigate to="/home" replace />;
  }

  const roundNumber = round.index + 1;

  return (
    <div className="flex min-h-screen flex-col">
      {/* --- Status bar ---------------------------------------------------- */}
      <header className="border-b border-gilt-600/20 bg-leather-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="font-display text-lg font-bold text-gilt-400 hover:text-gilt-300"
          >
            Bibleo<span className="text-parchment-100">Guessr</span>
          </button>

          <div className="text-center">
            <span className="block text-[10px] uppercase tracking-widest text-parchment-400">
              Round
            </span>
            <span className="font-display text-xl font-bold tabular-nums text-parchment-50">
              {roundNumber} / {game.roundCount}
            </span>
          </div>

          <RoundTimer
            seconds={game.settings.timer}
            startedAtMs={round.startedAtMs}
            onExpire={handleExpire}
          />

          <div className="text-center">
            <span className="block text-[10px] uppercase tracking-widest text-parchment-400">
              Score
            </span>
            <span className="font-display text-xl font-bold tabular-nums text-gilt-400">
              {(game.totalScore ?? 0).toLocaleString()}
            </span>
          </div>

          <p className="ml-auto hidden text-sm text-parchment-400 lg:block">
            {view === 'closed'
              ? 'Click the page edges to open the Bible'
              : 'Drag a page sideways to turn it'}
          </p>
        </div>
      </header>

      {/* --- The verse ----------------------------------------------------- */}
      <section className="border-b border-gilt-600/10 bg-leather-900/40">
        <div className="mx-auto max-w-4xl px-4 py-4 text-center">
          <p className="mb-1 text-[10px] uppercase tracking-[0.3em] text-gilt-500">
            Find this verse
          </p>
          <blockquote className="font-scripture text-lg leading-relaxed text-parchment-50 sm:text-xl">
            “{round.text}”
          </blockquote>
        </div>
      </section>

      {/* --- The Bible ----------------------------------------------------- */}
      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-6">
        {error && (
          <p className="form-error absolute left-1/2 top-3 z-30 -translate-x-1/2" role="alert">
            {error}
          </p>
        )}

        {view === 'closed' ? (
          <>
            <div className="h-[64vh] min-h-[420px] w-full max-w-6xl">
              <ClosedBible3D totalPages={totalPages} onHover={setHoverPage} onOpen={openAt} />
            </div>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-gilt-400">
              {hoverPage ? `Page ${hoverPage.toLocaleString()}` : '—'}
            </p>
            <p className="mt-1 text-sm text-parchment-400">
              Run the cursor along the page edges, then click to open the Bible there.
            </p>
          </>
        ) : (
          <BibleSpread
            manifest={manifest}
            activePage={activePage}
            onChangePage={goToPage}
            selection={selection}
            onSelectWord={selectWord}
          />
        )}

        {/* --- Controls -----------------------------------------------------
            Everything actionable sits directly beneath the book, where the
            player is already looking, rather than in a far corner of the
            screen or floating over the page edges. */}
        <div className="mt-4 flex w-full max-w-3xl flex-col items-center gap-3">
          <p
            className={`text-center text-sm ${
              selection ? 'text-parchment-100' : 'text-parchment-400'
            }`}
            aria-live="polite"
          >
            {selection ? (
              <>
                Your guess:{' '}
                <span className="font-semibold text-gilt-400">{selection.reference}</span>{' '}
                <span className="text-parchment-400">
                  (page {selection.page.toLocaleString()})
                </span>
              </>
            ) : view === 'open' ? (
              'Click a verse to place your guess.'
            ) : (
              'No guess placed yet — submitting now would score 0.'
            )}
          </p>

          <div className="flex items-center gap-3">
            {view === 'open' && (
              <button type="button" onClick={closeBible} className="btn-secondary px-6 py-2.5">
                Close Bible
              </button>
            )}
            <button
              type="button"
              onClick={() => submit()}
              disabled={submitting}
              className="btn-primary px-8 py-2.5 text-base"
            >
              {submitting ? 'Submitting…' : 'Submit Guess'}
              <kbd className="ml-1 rounded bg-leather-950/25 px-1.5 py-0.5 text-[10px] font-bold">
                Space
              </kbd>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
