import { useEffect, useRef } from 'react';

/**
 * Confetti for a perfect round.
 *
 * Hand-rolled on a canvas rather than pulled from a package: it is forty lines,
 * it has no dependency to keep current, and it can respect
 * `prefers-reduced-motion` — which most confetti libraries do not.
 */

const COLOURS = ['#d9b45b', '#c79a3c', '#f6e3a8', '#a87c26', '#fdfaf3', '#15803d'];
const PIECES = 140;
const DURATION_MS = 3400;
/** px per ms². Tuned so the arc peaks around mid-screen rather than overshooting it. */
const GRAVITY = 0.00085;

export default function Celebration({ active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    // Two bursts from the lower corners, the way a party popper actually goes.
    // Each fires *inwards* — the left burst travels right and vice versa —
    // otherwise every piece leaves the viewport on the first frame.
    const pieces = Array.from({ length: PIECES }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const inward = fromLeft ? 1 : -1;

      return {
        x: fromLeft ? 0 : width,
        y: height * (0.92 + Math.random() * 0.06),
        // Horizontal and vertical speeds are set independently rather than
        // resolved from one angle: it makes the arc directly tunable, which a
        // shared magnitude does not.
        vx: inward * (0.18 + Math.random() * 0.42),
        vy: -(0.75 + Math.random() * 0.55),
        size: 4 + Math.random() * 6,
        spin: (Math.random() - 0.5) * 0.02,
        rotation: Math.random() * Math.PI,
        colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
      };
    });

    let frame = 0;
    let previous = null;
    let started = null;

    function tick(now) {
      // The clock starts on the first frame, from the frame's own timestamp.
      // Seeding it from performance.now() instead assumes rAF shares that time
      // origin, and where it does not the burst is judged already over before
      // it has drawn anything.
      if (started === null) {
        started = now;
        previous = now;
      }

      const dt = Math.min(now - previous, 48);
      previous = now;
      const elapsed = now - started;

      ctx.clearRect(0, 0, width, height);
      // Fade the whole burst out rather than letting pieces vanish mid-air.
      const fade = Math.max(0, 1 - Math.max(0, elapsed - DURATION_MS * 0.55) / (DURATION_MS * 0.45));
      ctx.globalAlpha = fade;

      for (const piece of pieces) {
        piece.vy += GRAVITY * dt;
        piece.x += piece.vx * dt;
        piece.y += piece.vy * dt;
        piece.rotation += piece.spin * dt;

        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rotation);
        ctx.fillStyle = piece.colour;
        ctx.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
        ctx.restore();
      }

      ctx.globalAlpha = 1;
      if (elapsed < DURATION_MS) frame = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, width, height);
    }

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-40 h-full w-full"
      aria-hidden="true"
    />
  );
}
