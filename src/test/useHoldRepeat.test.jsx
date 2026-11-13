import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, createEvent } from '@testing-library/react';
import { useHoldRepeat } from '@/lib/useHoldRepeat';

/**
 * Holding a page-turn button should keep turning, like holding an arrow key:
 * one turn at once, a short pause, then a steady stream until released.
 */

function TurnButton({ onTurn }) {
  const hold = useHoldRepeat(onTurn);
  return (
    <button type="button" {...hold}>
      Next
    </button>
  );
}

describe('useHoldRepeat', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('acts once on a quick press, and the click that follows does not act again', () => {
    const onTurn = vi.fn();
    render(<TurnButton onTurn={onTurn} />);
    const button = screen.getByRole('button');

    fireEvent.pointerDown(button, { button: 0 });
    fireEvent.pointerUp(button);
    fireEvent.click(button);

    expect(onTurn).toHaveBeenCalledTimes(1);
  });

  it('keeps acting while held, then stops on release', () => {
    const onTurn = vi.fn();
    render(<TurnButton onTurn={onTurn} />);
    const button = screen.getByRole('button');

    fireEvent.pointerDown(button, { button: 0 });
    act(() => vi.advanceTimersByTime(1000));
    const whileHeld = onTurn.mock.calls.length;
    expect(whileHeld).toBeGreaterThan(4);

    fireEvent.pointerUp(button);
    act(() => vi.advanceTimersByTime(1000));
    expect(onTurn).toHaveBeenCalledTimes(whileHeld);
  });

  it('stops when the pointer is released anywhere, even off the button', () => {
    const onTurn = vi.fn();
    render(<TurnButton onTurn={onTurn} />);

    fireEvent.pointerDown(screen.getByRole('button'), { button: 0 });
    act(() => vi.advanceTimersByTime(600));
    fireEvent.pointerUp(window);
    const count = onTurn.mock.calls.length;
    act(() => vi.advanceTimersByTime(1000));
    expect(onTurn).toHaveBeenCalledTimes(count);
  });

  it('still works from the keyboard, where there is no pointer', () => {
    const onTurn = vi.fn();
    render(<TurnButton onTurn={onTurn} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onTurn).toHaveBeenCalledTimes(1);
  });

  it('ignores the right mouse button', () => {
    const onTurn = vi.fn();
    render(<TurnButton onTurn={onTurn} />);
    const button = screen.getByRole('button');
    // jsdom does not carry `button` through pointer event init, so set it.
    const event = createEvent.pointerDown(button);
    Object.defineProperty(event, 'button', { value: 2 });
    fireEvent(button, event);
    act(() => vi.advanceTimersByTime(1000));
    expect(onTurn).not.toHaveBeenCalled();
  });
});
