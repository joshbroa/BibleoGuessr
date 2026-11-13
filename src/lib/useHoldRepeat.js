import { useCallback, useEffect, useRef } from 'react';

/** Pause before a held press starts repeating, as a keyboard's key repeat does. */
const DELAY_MS = 320;
/** Gap between repeats once it is going. */
const INTERVAL_MS = 110;

/**
 * Press-and-hold repeat for a button: acts once immediately, then — if still
 * held after a short pause — keeps acting until released.
 *
 * Spread the returned handlers onto the button. Keyboard activation (Enter,
 * Space) arrives as a plain click and still acts once; the click that follows a
 * pointer press is swallowed so a tap never counts twice.
 */
export function useHoldRepeat(action) {
  const actionRef = useRef(action);
  actionRef.current = action;

  const timers = useRef({ delay: null, repeat: null });
  const pressedByPointer = useRef(false);

  const stop = useCallback(() => {
    clearTimeout(timers.current.delay);
    clearInterval(timers.current.repeat);
    timers.current = { delay: null, repeat: null };
    window.removeEventListener('pointerup', stop);
    window.removeEventListener('pointercancel', stop);
  }, []);

  useEffect(() => stop, [stop]);

  const onPointerDown = useCallback(
    (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      stop();
      pressedByPointer.current = true;
      actionRef.current();

      timers.current.delay = setTimeout(() => {
        timers.current.repeat = setInterval(() => actionRef.current(), INTERVAL_MS);
      }, DELAY_MS);

      // Released anywhere — off the button, or after it disabled itself at the
      // end of the book — still ends the hold.
      window.addEventListener('pointerup', stop);
      window.addEventListener('pointercancel', stop);
    },
    [stop]
  );

  const onClick = useCallback(() => {
    if (pressedByPointer.current) {
      pressedByPointer.current = false;
      return;
    }
    actionRef.current();
  }, []);

  return { onPointerDown, onPointerUp: stop, onPointerCancel: stop, onClick };
}
