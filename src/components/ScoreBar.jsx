import { useEffect, useRef, useState } from 'react';

/**
 * A score bar whose width is a straight linear interpolation of score/max.
 *
 * The fill animates from 0 on mount so the number and the bar arrive together;
 * `prefers-reduced-motion` skips straight to the final width.
 */
export default function ScoreBar({
  score,
  max,
  label,
  durationMs = 1100,
  showValue = true,
  size = 'md',
}) {
  const [displayed, setDisplayed] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    const target = max > 0 ? Math.min(score / max, 1) : 0;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || durationMs <= 0) {
      setDisplayed(target);
      return undefined;
    }

    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / durationMs, 1);
      // Ease-out cubic: fast off the mark, settling gently on the final value.
      setDisplayed(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [score, max, durationMs]);

  const height = size === 'lg' ? 'h-5' : 'h-3';
  const rounded = Math.round(displayed * (max || 0));

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label && (
            <span className="text-xs font-semibold uppercase tracking-widest text-parchment-400">
              {label}
            </span>
          )}
          {showValue && (
            <span className="font-display tabular-nums text-parchment-100">
              <span className={size === 'lg' ? 'text-2xl font-bold text-gilt-400' : 'font-semibold'}>
                {rounded.toLocaleString()}
              </span>
              <span className="text-parchment-400"> / {max.toLocaleString()}</span>
            </span>
          )}
        </div>
      )}
      <div
        className={`${height} w-full overflow-hidden rounded-full bg-leather-950/80 ring-1 ring-inset ring-gilt-600/25`}
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Score'}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-gilt-600 via-gilt-500 to-gilt-400"
          style={{ width: `${displayed * 100}%` }}
        />
      </div>
    </div>
  );
}
