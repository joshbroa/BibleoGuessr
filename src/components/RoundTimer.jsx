import { useEffect, useRef, useState } from 'react';
import { play } from '@/lib/sound';

function format(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** The last stretch of a round, in which the clock turns red and ticks. */
const URGENT_MS = 10000;

/**
 * The round countdown, as a stat tile in the game's status bar.
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
  const lastTicked = useRef(null);

  useEffect(() => {
    fired.current = false;
    lastTicked.current = null;
  }, [startedAtMs]);

  useEffect(() => {
    if (untimed) return undefined;

    const deadline = (startedAtMs ?? Date.now()) + seconds * 1000;

    function tick() {
      // Clamped so a client clock running ahead of the server cannot cut the
      // round short, nor one running behind hand out extra time.
      const left = Math.min(Math.max(deadline - Date.now(), 0), seconds * 1000);
      setRemaining(left);

      // One woodblock tick per whole second of the final ten — on the second,
      // not on every poll.
      const whole = Math.ceil(left / 1000);
      if (left > 0 && left <= URGENT_MS && whole !== lastTicked.current) {
        lastTicked.current = whole;
        play('timerTick', { urgent: whole <= 3 });
      }

      if (left <= 0 && !fired.current) {
        fired.current = true;
        play('timeUp', { force: true });
        onExpire?.();
      }
    }

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [untimed, seconds, startedAtMs, onExpire]);

  if (untimed) {
    return (
      <div className="wf-stat" title="Untimed round">
        <dt>Time</dt>
        <dd aria-label="Untimed — no time limit" className="text-wf-amber">
          ∞
        </dd>
      </div>
    );
  }

  const urgent = remaining <= URGENT_MS;

  return (
    <div className={`wf-stat ${urgent ? 'animate-wf-urgent motion-reduce:animate-none motion-reduce:bg-wf-crimson' : ''}`}>
      <dt className={urgent ? '!text-white' : ''}>Time</dt>
      <dd role="timer" aria-live={urgent ? 'assertive' : 'off'}>
        {format(remaining)}
      </dd>
    </div>
  );
}
