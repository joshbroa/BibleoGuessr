import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import BiblePage from './BiblePage';
import { loadPage, windowPages } from '@/lib/pageCache';

/**
 * Phase 2: the open Bible, as a real two-page spread.
 *
 * Page turning is a genuine 3D fold. The leaf being turned carries the page you
 * are leaving on its front and the page you are arriving at on its back, hinged
 * at the spine — so dragging the right page leftwards folds *both* pages over at
 * once, exactly as paper does.
 *
 * Turns commit the moment you let go
 * ----------------------------------
 * The spread underneath advances immediately on release, and the folding leaf
 * carries on as an independent animation layered over the new spread. That has
 * two consequences, both wanted:
 *
 *   * You can start the next turn straight away. Several folds can be in the
 *     air at once, so riffling through the book is as fast as you can flick.
 *   * There is no "busy" state to get wedged in. Each fold owns its own tween
 *     and removes itself; a fold that somehow never finishes can no longer
 *     block every future turn.
 *
 * Each fold keeps its own references to the two pages it is showing, so the
 * six-page window is free to slide out from under it without the airborne leaf
 * going blank.
 */

/** Fraction of a page-width you must drag before the turn commits on release. */
const COMMIT_THRESHOLD = 0.32;

/** Ceiling on simultaneous folds, so frantic flicking cannot pile up layers. */
const MAX_FLIGHTS = 4;

/** Backstop removal for a fold whose tween never reports completion. */
const FLIGHT_TIMEOUT_MS = 2000;

let flightSequence = 0;

// ---------------------------------------------------------------------------

/** The two faces of a folding leaf. */
function LeafFaces({ manifest, dir, front, back, selection, answer }) {
  return (
    <>
      <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
        <BiblePage
          page={front}
          manifest={manifest}
          side={dir === 'next' ? 'right' : 'left'}
          selection={selection}
          answer={answer}
        />
      </div>
      <div
        className="absolute inset-0"
        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
      >
        <BiblePage
          page={back}
          manifest={manifest}
          side={dir === 'next' ? 'left' : 'right'}
          selection={selection}
          answer={answer}
        />
      </div>
    </>
  );
}

/**
 * A fold in flight: mounts, tweens itself from `from` to `to`, and asks to be
 * removed. It owns its own animation entirely — nothing outside waits on it.
 */
function Flight({ manifest, flight, z, selection, answer, onDone }) {
  const ref = useRef(null);
  const done = useRef(onDone);
  done.current = onDone;

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    gsap.set(node, { rotateY: flight.from });
    const tween = gsap.to(node, {
      rotateY: flight.to,
      duration: flight.duration,
      ease: 'power2.out',
      onComplete: () => done.current(flight.id),
    });

    // If the tween is interrupted or the tab is suspended mid-flight, the leaf
    // would otherwise hang around on top of the spread forever.
    const bail = setTimeout(() => done.current(flight.id), FLIGHT_TIMEOUT_MS);

    return () => {
      tween.kill();
      clearTimeout(bail);
    };
  }, [flight]);

  return (
    <div
      ref={ref}
      className="absolute top-0"
      style={{
        left: flight.dir === 'next' ? manifest.pageWidth : 0,
        width: manifest.pageWidth,
        height: manifest.pageHeight,
        transformOrigin: flight.dir === 'next' ? 'left center' : 'right center',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        pointerEvents: 'none',
        // Newer folds stack above older ones, and all of them below the leaf
        // currently under the pointer.
        zIndex: 20 + z,
      }}
    >
      <LeafFaces
        manifest={manifest}
        dir={flight.dir}
        front={flight.front}
        back={flight.back}
        selection={selection}
        answer={answer}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function BibleSpread({
  manifest,
  activePage,
  onChangePage,
  selection,
  answer,
  onSelectWord,
  interactive = true,
  flipTo = null,
  onFlipDone,
}) {
  const totalPages = manifest.totalPages;

  // The window holds EXACTLY the six pages the current spread can reach.
  const [pages, setPages] = useState({});
  const [drag, setDrag] = useState(null); // the leaf currently under the pointer
  const [flights, setFlights] = useState([]);
  const [hovered, setHovered] = useState(null);
  const [scale, setScale] = useState(1);

  const liveLeafRef = useRef(null);
  const dragRef = useRef(null);
  const draggedRef = useRef(false);
  const frameRef = useRef(null);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const activeRef = useRef(activePage);
  activeRef.current = activePage;

  const hasPrev = activePage > 1;
  const hasNext = activePage + 2 <= totalPages;

  // --- Sliding window ------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    const wanted = windowPages(activePage, totalPages);

    // Drop the trailing frames first, then fetch whatever the new window is
    // missing. Evicted pages come back from the browser's immutable disk cache
    // for free if the player turns straight back — and any fold still in the
    // air holds its own reference, so eviction never blanks a moving page.
    setPages((current) => {
      const next = {};
      wanted.forEach((page) => {
        if (current[page]) next[page] = current[page];
      });
      return next;
    });

    wanted.forEach((page) => {
      loadPage(page)
        .then((data) => {
          if (!cancelled) setPages((current) => ({ ...current, [page]: data }));
        })
        .catch(() => {
          // A missing page frame just renders blank; the round is still playable.
        });
    });

    return () => {
      cancelled = true;
    };
  }, [activePage, totalPages]);

  // --- Fit the spread to the viewport --------------------------------------

  const spreadWidth = manifest.pageWidth * 2;

  useLayoutEffect(() => {
    function fit() {
      const availableWidth = window.innerWidth - 48;
      // Reserves the header, the verse prompt, the page indicator and the
      // control bar beneath the book, so nothing ever overlaps the spread.
      const availableHeight = window.innerHeight - 320;
      setScale(
        Math.max(
          0.32,
          Math.min(availableWidth / spreadWidth, availableHeight / manifest.pageHeight, 1.25)
        )
      );
    }
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [spreadWidth, manifest.pageHeight]);

  // --- Folds ---------------------------------------------------------------

  const removeFlight = useCallback((id) => {
    setFlights((current) => current.filter((flight) => flight.id !== id));
  }, []);

  /**
   * Launch a fold. The pages are captured by value here, so the fold keeps
   * rendering them even after the window has slid past.
   */
  const launchFlight = useCallback((dir, front, back, from, to, duration) => {
    flightSequence += 1;
    const flight = { id: flightSequence, dir, front, back, from, to, duration };
    setFlights((current) => [...current, flight].slice(-MAX_FLIGHTS));
  }, []);

  /** Turn a page outright — the keyboard path, and the result-screen riffle. */
  const turn = useCallback(
    (dir, duration = 0.5) => {
      const page = activeRef.current;
      if (dir === 'next' && page + 2 > totalPages) return;
      if (dir === 'prev' && page <= 1) return;

      const cache = pagesRef.current;
      const front = dir === 'next' ? cache[page + 1] : cache[page];
      const back = dir === 'next' ? cache[page + 2] : cache[page - 1];

      launchFlight(dir, front, back, 0, dir === 'next' ? -180 : 180, duration);
      onChangePage(dir === 'next' ? page + 2 : page - 2);
    },
    [launchFlight, onChangePage, totalPages]
  );

  // --- Drag ----------------------------------------------------------------

  const endDrag = useCallback(() => {
    const state = dragRef.current;
    dragRef.current = null;
    cancelAnimationFrame(frameRef.current);
    if (state?.captured) {
      // The capture may already be gone — a cancelled or lost pointer releases
      // it for us — and releasing one that is not held throws.
      try {
        state.target?.releasePointerCapture?.(state.pointerId);
      } catch {
        /* already released */
      }
    }
    return state;
  }, []);

  function onPointerDown(event, half) {
    if (!interactive || flipTo) return;
    if (event.button !== undefined && event.button !== 0) return;

    // Any previous drag that never got a clean release is abandoned here, so a
    // lost pointerup can never wedge the book.
    if (dragRef.current) endDrag();

    draggedRef.current = false;
    dragRef.current = {
      half,
      startX: event.clientX,
      dir: null,
      progress: 0,
      pointerId: event.pointerId,
      target: event.currentTarget,
      captured: false,
    };
    // Pointer capture is deliberately NOT taken here. While an element holds
    // the pointer, the browser retargets the following `click` to that element
    // — which would swallow every word click before it reached the word. We
    // capture only once a drag is genuinely under way, below.
  }

  function onPointerMove(event) {
    const state = dragRef.current;
    if (!state) return;

    const dx = event.clientX - state.startX;
    if (Math.abs(dx) > 6) draggedRef.current = true;

    // The direction is decided by the first meaningful movement: pull the right
    // page left to go forward, the left page right to go back.
    if (!state.dir) {
      if (state.half === 'right' && dx < -6 && hasNext) state.dir = 'next';
      else if (state.half === 'left' && dx > 6 && hasPrev) state.dir = 'prev';
      else return;

      // Now that this is unambiguously a drag, capture so it keeps tracking
      // even if the pointer leaves the page.
      try {
        state.target?.setPointerCapture?.(state.pointerId);
        state.captured = true;
      } catch {
        /* capture is an optimisation, not a requirement */
      }

      const cache = pagesRef.current;
      const page = activeRef.current;
      const faces = {
        dir: state.dir,
        front: state.dir === 'next' ? cache[page + 1] : cache[page],
        back: state.dir === 'next' ? cache[page + 2] : cache[page - 1],
      };
      // Kept on the ref as well as in state: a drag that starts and ends inside
      // a single frame would otherwise reach pointerup before React has
      // re-rendered, and the fold would pop instead of animating.
      state.faces = faces;
      setDrag(faces);
    }

    const span = manifest.pageWidth * scale;
    const progress =
      state.dir === 'next'
        ? Math.min(Math.max(-dx / span, 0), 1)
        : Math.min(Math.max(dx / span, 0), 1);
    state.progress = progress;

    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      if (liveLeafRef.current) {
        gsap.set(liveLeafRef.current, {
          rotateY: state.dir === 'next' ? -180 * progress : 180 * progress,
        });
      }
    });
  }

  function onPointerUp() {
    const state = endDrag();
    if (!state?.dir) {
      setDrag(null);
      return;
    }

    const angle = state.dir === 'next' ? -180 * state.progress : 180 * state.progress;
    const committed = state.progress >= COMMIT_THRESHOLD;
    const faces = state.faces;

    // Hand the leaf off to an independent fold and release the spread at once,
    // so the very next drag can begin while this one is still in the air.
    if (faces) {
      launchFlight(
        state.dir,
        faces.front,
        faces.back,
        angle,
        committed ? (state.dir === 'next' ? -180 : 180) : 0,
        committed ? 0.34 : 0.26
      );
    }
    setDrag(null);

    if (committed) {
      const page = activeRef.current;
      onChangePage(state.dir === 'next' ? page + 2 : page - 2);
    }
  }

  // --- Automatic flip-back (used by the round result screen) ---------------

  useEffect(() => {
    if (flipTo == null) return undefined;

    let cancelled = false;

    (async () => {
      // Riffling one spread at a time across a thousand pages would take all
      // day, so the flight is capped: each step covers an equal share of the
      // gap, and the folds overlap into a blur of pages.
      const targetSpread = flipTo % 2 === 1 ? flipTo : flipTo - 1;
      const totalGap = Math.abs(targetSpread - activeRef.current) / 2;
      if (totalGap === 0) {
        onFlipDone?.();
        return;
      }

      const steps = Math.min(14, totalGap);
      const dir = targetSpread > activeRef.current ? 'next' : 'prev';
      const stride = Math.max(1, Math.round(totalGap / steps));

      for (let step = 0; step < steps && !cancelled; step += 1) {
        const remaining = Math.abs(targetSpread - activeRef.current) / 2;
        const jump = step === steps - 1 ? remaining : Math.min(stride, remaining);
        if (jump === 0) break;

        const cache = pagesRef.current;
        const page = activeRef.current;
        launchFlight(
          dir,
          dir === 'next' ? cache[page + 1] : cache[page],
          dir === 'next' ? cache[page + 2] : cache[page - 1],
          0,
          dir === 'next' ? -180 : 180,
          0.3
        );
        onChangePage(page + (dir === 'next' ? 2 : -2) * jump);

        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 170));
      }

      if (!cancelled) onFlipDone?.();
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally keyed on the destination only: re-running as `activePage`
    // ticks through the flight would restart the animation on every step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipTo]);

  // --- Keyboard ------------------------------------------------------------

  useEffect(() => {
    if (!interactive) return undefined;
    function onKeyDown(event) {
      if (event.target.matches?.('input, textarea, select')) return;
      if (event.key === 'ArrowRight') turn('next');
      if (event.key === 'ArrowLeft') turn('prev');
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [interactive, turn]);

  // --- Render --------------------------------------------------------------

  /** Which page sits in each slot depends on which leaf, if any, is lifted. */
  const leftSlot = drag?.dir === 'prev' ? activePage - 2 : activePage;
  const rightSlot = drag?.dir === 'next' ? activePage + 3 : activePage + 1;

  /** Swallow the click that ends a drag, so turning a page never picks a word. */
  const handleSelectWord = onSelectWord
    ? (word) => {
        if (draggedRef.current) {
          draggedRef.current = false;
          return;
        }
        onSelectWord(word);
      }
    : undefined;

  // Hover only repaints when the verse actually changes, and never mid-drag,
  // where a repaint of ~1,000 words would cost the fold its smoothness.
  const handleHoverVerse = interactive
    ? (verse) => {
        if (dragRef.current) return;
        setHovered((current) =>
          current &&
          current.book === verse.book &&
          current.chapter === verse.chapter &&
          current.verse === verse.verse
            ? current
            : verse
        );
      }
    : undefined;

  const pageProps = {
    manifest,
    selection,
    answer,
    hovered,
    onSelectWord: handleSelectWord,
    onHoverVerse: handleHoverVerse,
  };

  const surfaceProps = {
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onDragStart: (event) => event.preventDefault(),
    style: { touchAction: 'none' },
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        style={{
          width: spreadWidth * scale,
          height: manifest.pageHeight * scale,
          perspective: 2600,
        }}
        onPointerLeave={() => setHovered(null)}
      >
        <div
          className="relative"
          style={{
            width: spreadWidth,
            height: manifest.pageHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Leather board visible behind the paper. */}
          <div
            className="absolute -inset-3 rounded-sm bg-leather-800 shadow-2xl shadow-black/60"
            aria-hidden="true"
          />

          <div
            className="absolute left-0 top-0"
            onPointerDown={(event) => onPointerDown(event, 'left')}
            {...surfaceProps}
          >
            <BiblePage page={pages[leftSlot]} side="left" {...pageProps} />
          </div>

          <div
            className="absolute top-0"
            onPointerDown={(event) => onPointerDown(event, 'right')}
            {...surfaceProps}
            style={{ ...surfaceProps.style, left: manifest.pageWidth }}
          >
            <BiblePage page={pages[rightSlot]} side="right" {...pageProps} />
          </div>

          {/* The leaf currently held by the pointer. */}
          {drag && (
            <div
              ref={liveLeafRef}
              className="absolute top-0"
              style={{
                left: drag.dir === 'next' ? manifest.pageWidth : 0,
                width: manifest.pageWidth,
                height: manifest.pageHeight,
                transformOrigin: drag.dir === 'next' ? 'left center' : 'right center',
                transformStyle: 'preserve-3d',
                willChange: 'transform',
                pointerEvents: 'none',
                zIndex: 60,
              }}
            >
              <LeafFaces
                manifest={manifest}
                dir={drag.dir}
                front={drag.front}
                back={drag.back}
                selection={selection}
                answer={answer}
              />
            </div>
          )}

          {/* Folds still in the air, each animating itself out. */}
          {flights.map((flight, index) => (
            <Flight
              key={flight.id}
              manifest={manifest}
              flight={flight}
              z={index}
              selection={selection}
              answer={answer}
              onDone={removeFlight}
            />
          ))}
        </div>
      </div>

      {/* No page-turn buttons: turning pages by hand is the game. Arrow keys
          remain bound, unadvertised, so the book is still navigable without a
          pointing device. */}
      {interactive && (
        <p className="text-sm tabular-nums text-parchment-400">
          Pages {activePage}–{Math.min(activePage + 1, totalPages)} of{' '}
          {totalPages.toLocaleString()}
        </p>
      )}
    </div>
  );
}
