import { useEffect, useRef, useState } from 'react';
import { play } from '@/lib/sound';

/**
 * A score meter whose fill is a straight linear interpolation of score/max.
 *
 * The fill animates from 0 on mount so the number and the bar arrive together;
 * `prefers-reduced-motion` skips straight to the final width. With `audible`,
 * the climb ticks as it goes, rising in pitch toward a full bar.
 */
export default function ScoreBar({
  score,
  max,
  label,
  durationMs = 1100,
  showValue = true,
  size = 'md',
  audible = false,
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
    let lastStep = -1;
    const tick = (now) => {
      const t = Math.min((now - start) / durationMs, 1);
      const value = target * (1 - Math.pow(1 - t, 3));
      setDisplayed(value);

      // One tick per twentieth of the bar crossed.
      const step = Math.floor(value * 20);
      if (audible && step !== lastStep && value < target) {
        lastStep = step;
        play('countTick', { value });
      }

      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [score, max, durationMs, audible]);

  const large = size === 'lg';
  const rounded = Math.round(displayed * (max || 0));

  return (
    <div className="flex w-full flex-col gap-2.5 font-wf">
      {(label || showValue) && (
        <div className="flex items-baseline justify-between gap-3">
          {label && <span className="text-sm font-extrabold sm:text-[15px]">{label}</span>}
          {showValue && (
            <span className="text-base font-extrabold tabular-nums sm:text-lg">
              {rounded.toLocaleString()}{' '}
              <span className="text-[13px] font-semibold text-wf-muted sm:text-[15px]">
                / {max.toLocaleString()}
              </span>
            </span>
          )}
        </div>
      )}
      <div
        className={`box-border w-full overflow-hidden rounded-[3px] bg-wf-ink ${
          large ? 'h-4 p-[3px] sm:h-[18px]' : 'h-3.5 p-0.5'
        }`}
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Score'}
      >
        <div className="h-full rounded-sm bg-wf-amber" style={{ width: `${displayed * 100}%` }} />
      </div>
    </div>
  );
}
