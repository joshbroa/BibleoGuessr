import { describe, it, expect } from 'vitest';
import { creditedElapsed, LATENCY_CREDIT_MS } from '../lib/timing.js';

/**
 * A guess is timed by when the player clicked, if their browser's report of it
 * falls within a short window before the server received it. Anything outside
 * that window is ignored and the server's own time is used.
 */
describe('creditedElapsed', () => {
  it('allows a three-second window', () => {
    expect(LATENCY_CREDIT_MS).toBe(3000);
  });

  it("uses the browser's click time when it is within the window", () => {
    expect(creditedElapsed(61000, 59000)).toBe(59000);
    expect(creditedElapsed(61000, 58000)).toBe(58000);
  });

  it('uses the server time when the claim is further back than the window', () => {
    expect(creditedElapsed(63000, 59000)).toBe(63000);
    expect(creditedElapsed(60000, 10000)).toBe(60000);
  });

  it('uses the server time when the claim is later than the server saw it', () => {
    expect(creditedElapsed(30000, 45000)).toBe(30000);
  });

  it('uses the server time when the browser says nothing usable', () => {
    expect(creditedElapsed(42000, undefined)).toBe(42000);
    expect(creditedElapsed(42000, null)).toBe(42000);
    expect(creditedElapsed(42000, 'soon')).toBe(42000);
    expect(creditedElapsed(42000, Number.NaN)).toBe(42000);
  });

  it('never goes below zero', () => {
    expect(creditedElapsed(2000, -500)).toBe(0);
    expect(creditedElapsed(0, 0)).toBe(0);
  });
});
