import { useEffect, useRef, useState } from 'react';

function format(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * The round countdown.
 *
 * The clock is anchored to the round's server-issued start time, not to when
 * this component mounted — so reloading mid-round resumes the countdown where
 * it actually stands instead of handing out free time.
 *
 * `seconds === 0` means untimed: the countdown is replaced by an infinity
 * symbol and `onExpire` never fires.
 */
export default function RoundTimer({ seconds, startedAtMs, onExpire }) {
  const untimed = !seconds;
  const [remaining, setRemaining] = useState(() =>
    untimed ? 0 : Math.max(0, seconds * 1000 - (Date.now() - (startedAtMs ?? Date.now())))
  );
  const fired = useRef(false);

  useEffect(() => {
    fired.current = false;
  }, [startedAtMs]);

  useEffect(() => {
    if (untimed) return undefined;

    const deadline = (startedAtMs ?? Date.now()) + seconds * 1000;

    function tick() {
      // Clamped so a client clock running ahead of the server cannot cut the
      // round short, nor one running behind hand out extra time.
      const left = Math.min(Math.max(deadline - Date.now(), 0), seconds * 1000);
      setRemaining(left);
      if (left <= 0 && !fired.current) {
        fired.current = true;
        onExpire?.();
      }
    }

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [untimed, seconds, startedAtMs, onExpire]);

  if (untimed) {
    return (
      <div className="text-center" title="Untimed round">
        <span className="block text-[10px] uppercase tracking-widest text-parchment-400">Time</span>
        <span
          className="font-display text-3xl leading-none text-gilt-400"
          aria-label="Untimed — no time limit"
        >
          ∞
        </span>
      </div>
    );
  }

  const urgent = remaining <= 10000;

  return (
    <div className="text-center">
      <span className="block text-[10px] uppercase tracking-widest text-parchment-400">Time</span>
      <span
        className={`font-display text-3xl font-bold leading-none tabular-nums ${
          urgent ? 'animate-pulse text-red-400' : 'text-parchment-50'
        }`}
        role="timer"
        aria-live={urgent ? 'assertive' : 'off'}
      >
        {format(remaining)}
      </span>
    </div>
  );
}
