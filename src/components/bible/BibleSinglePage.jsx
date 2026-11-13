import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import BiblePage from './BiblePage';
import { loadPage } from '@/lib/pageCache';
import { sideForPage } from '@/lib/pageMath';
import { play } from '@/lib/sound';
import { useHoldRepeat } from '@/lib/useHoldRepeat';
import { ChevronLeft, ChevronRight } from '@/components/wf/Icons';

/** Horizontal travel, in CSS pixels, that counts as a swipe to turn. */
const SWIPE_DISTANCE = 48;

/**
 * The open Bible on a phone: one page at a time.
 *
 * Each page is the same pre-typeset page the desktop spread shows — the same
 * component paints it from the same data — only scaled down as a whole to fit
 * the width, so every word sits exactly where the server will score it. Turn
 * with the buttons or by swiping; tap a verse to choose it; pinch to zoom in.
 *
 * @param {number}   initialPage     page to open on
 * @param {(page:number)=>void} onChangePage  reports the exact page shown
 * @param {object}   selection       the guess, highlighted
 * @param {object}   answer          the answer, highlighted (round result only)
 * @param {Function} onSelectWord    choose a verse; absent = read-only
 * @param {boolean}  interactive     false = no controls (background use)
 * @param {number}   flipTo          riffle to this page, then call onFlipDone
 */
export default function BibleSinglePage({
  manifest,
  initialPage = 1,
  onChangePage,
  selection,
  answer,
  onSelectWord,
  interactive = true,
  flipTo = null,
  onFlipDone,
}) {
  const totalPages = manifest.totalPages;
  const [page, setPage] = useState(() => Math.min(Math.max(initialPage, 1), totalPages));
  const [cache, setCache] = useState({});
  const [scale, setScale] = useState(0.8);

  const frameRef = useRef(null);
  const swipeRef = useRef(null);
  const swipedRef = useRef(false);
  const pageRef = useRef(page);
  pageRef.current = page;

  // --- Pages: the one shown plus its neighbours, so a turn is instant -------

  useEffect(() => {
    let cancelled = false;
    const wanted = [page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages);

    setCache((current) => {
      const next = {};
      wanted.forEach((p) => {
        if (current[p]) next[p] = current[p];
      });
      return next;
    });
    wanted.forEach((p) => {
      loadPage(p)
        .then((data) => {
          if (!cancelled) setCache((current) => ({ ...current, [p]: data }));
        })
        .catch(() => {
          // A missing page renders as blank paper; the round is still playable.
        });
    });
    return () => {
      cancelled = true;
    };
  }, [page, totalPages]);

  // --- Scale the whole page to the available width -------------------------

  useLayoutEffect(() => {
    const node = frameRef.current;
    if (!node) return undefined;

    function fit() {
      // 10px is the navy board showing round the paper.
      const width = node.clientWidth - 10;
      setScale(Math.max(0.4, Math.min(width / manifest.pageWidth, 1.4)));
    }
    fit();

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    observer?.observe(node);
    window.addEventListener('resize', fit);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [manifest.pageWidth]);

  // --- Turning ---------------------------------------------------------------

  // No turning animation here: a single page has no facing leaf to fold over,
  // so the page simply changes, with the sound to mark it.
  function goTo(next, { audible = true } = {}) {
    const target = Math.min(Math.max(next, 1), totalPages);
    if (target === pageRef.current) return;

    if (audible) play('pageTurn');
    pageRef.current = target;
    setPage(target);
    onChangePage?.(target);
  }

  // Holding a page button keeps turning, like holding an arrow key.
  const holdPrev = useHoldRepeat(() => goTo(pageRef.current - 1));
  const holdNext = useHoldRepeat(() => goTo(pageRef.current + 1));

  // Swipe to turn. Vertical movement is left alone so the page still scrolls.
  function onPointerDown(event) {
    if (!interactive || flipTo) return;
    swipeRef.current = { x: event.clientX, y: event.clientY };
    swipedRef.current = false;
  }

  function onPointerUp(event) {
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.4) {
      swipedRef.current = true;
      goTo(pageRef.current + (dx < 0 ? 1 : -1));
    }
  }

  // --- Riffle to the answer (round result) ------------------------------------

  useEffect(() => {
    if (flipTo == null) return undefined;
    let cancelled = false;

    (async () => {
      const start = pageRef.current;
      const gap = flipTo - start;
      if (gap === 0) {
        onFlipDone?.();
        return;
      }
      play('riffle', { force: true });
      const steps = Math.min(8, Math.abs(gap));
      for (let step = 1; step <= steps && !cancelled; step += 1) {
        const next = step === steps ? flipTo : Math.round(start + (gap * step) / steps);
        goTo(next, { audible: step % 2 === 0 });
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      if (!cancelled) onFlipDone?.();
    })();

    return () => {
      cancelled = true;
    };
    // Keyed on the destination only, as in the desktop spread.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipTo]);

  const handleSelectWord = onSelectWord
    ? (word) => {
        if (swipedRef.current) {
          swipedRef.current = false;
          return;
        }
        play('select');
        onSelectWord(word);
      }
    : undefined;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-1.5">
      {interactive && (
        <p className="m-0 shrink-0 text-center text-[13px] font-semibold text-wf-muted">
          {onSelectWord ? 'Tap a verse to choose it · pinch to zoom' : 'Swipe or use the arrows to turn'}
        </p>
      )}

      <div
        ref={frameRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-[5px]"
        style={{ touchAction: 'pan-y pinch-zoom' }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipeRef.current = null;
        }}
      >
        <div className="rounded-[5px] bg-wf-navy py-1.5 pl-1.5 pr-1 shadow-[0_12px_20px_-14px_rgba(35,38,43,0.6)]">
          <div style={{ width: manifest.pageWidth * scale, height: manifest.pageHeight * scale }}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
              <BiblePage
                page={cache[page]}
                manifest={manifest}
                side={sideForPage(page)}
                selection={selection}
                answer={answer}
                onSelectWord={handleSelectWord}
              />
            </div>
          </div>
        </div>
      </div>

      {interactive && (
        <div className="flex shrink-0 items-center gap-2 font-wf">
          <button
            type="button"
            {...holdPrev}
            disabled={!hasPrev || Boolean(flipTo)}
            aria-label="Previous page"
            data-sound="none"
            className="grid h-11 flex-[0_0_48px] place-items-center rounded bg-wf-ink disabled:opacity-40"
          >
            <ChevronLeft color="#e3a52b" />
          </button>
          <p className="m-0 flex-1 text-center text-sm font-bold tabular-nums">
            Page {page.toLocaleString()}{' '}
            <span className="font-medium text-wf-muted">of {totalPages.toLocaleString()}</span>
          </p>
          <button
            type="button"
            {...holdNext}
            disabled={!hasNext || Boolean(flipTo)}
            aria-label="Next page"
            data-sound="none"
            className="grid h-11 flex-[0_0_48px] place-items-center rounded bg-wf-ink disabled:opacity-40"
          >
            <ChevronRight size={16} width={3.5} color="#e3a52b" />
          </button>
        </div>
      )}
    </div>
  );
}
