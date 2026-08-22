import { describe, it, expect } from 'vitest';
import {
  decimalPage,
  pageDistance,
  scoreFromDistance,
  maxGameScore,
  MAX_DISTANCE,
  MAX_ROUND_SCORE,
  DECAY,
} from '@shared/scoring';

describe('decimalPage', () => {
  it('places a word proportionally through its page', () => {
    expect(decimalPage(12, 0, 240)).toBe(12);
    expect(decimalPage(12, 60, 240)).toBe(12.25);
    expect(decimalPage(12, 120, 240)).toBe(12.5);
  });

  it('falls back to the whole page when the page has no words', () => {
    expect(decimalPage(9, 3, 0)).toBe(9);
  });
});

describe('pageDistance', () => {
  it('is symmetric and absolute', () => {
    expect(pageDistance(2701.46, 2650.1)).toBeCloseTo(51.36, 2);
    expect(pageDistance(2650.1, 2701.46)).toBeCloseTo(51.36, 2);
  });
});

describe('scoreFromDistance', () => {
  it('awards a perfect score for a perfect guess', () => {
    expect(scoreFromDistance(0)).toBe(MAX_ROUND_SCORE);
  });

  it('uses the tuned decay constant', () => {
    // Pinned deliberately: changing this reprices every score in the game, so
    // it should never move by accident.
    expect(DECAY).toBe(0.002);
  });

  it('follows the tuned exponential decay curve', () => {
    // round(5000 * e^(-0.002 * d))
    expect(scoreFromDistance(100)).toBe(4094);
    expect(scoreFromDistance(500)).toBe(1839);
    expect(scoreFromDistance(1000)).toBe(677);
    expect(scoreFromDistance(2000)).toBe(92);
  });

  it('pays half marks at about 347 pages', () => {
    const halfway = Math.round(Math.log(2) / DECAY);
    expect(halfway).toBe(347);
    expect(scoreFromDistance(halfway)).toBeCloseTo(MAX_ROUND_SCORE / 2, -1);
  });

  it('decays monotonically', () => {
    let previous = Infinity;
    for (let d = 0; d <= MAX_DISTANCE; d += 50) {
      const score = scoreFromDistance(d);
      expect(score).toBeLessThanOrEqual(previous);
      previous = score;
    }
  });

  it('cuts off hard beyond 2000 pages', () => {
    expect(scoreFromDistance(MAX_DISTANCE)).toBeGreaterThan(0);
    expect(scoreFromDistance(MAX_DISTANCE + 0.001)).toBe(0);
    expect(scoreFromDistance(3000)).toBe(0);
  });

  it('scores a missing guess as zero rather than throwing', () => {
    expect(scoreFromDistance(null)).toBe(0);
    expect(scoreFromDistance(undefined)).toBe(0);
    expect(scoreFromDistance(NaN)).toBe(0);
    expect(scoreFromDistance(-5)).toBe(0);
  });

  it('never exceeds the round maximum', () => {
    for (let d = 0; d < 2500; d += 7) {
      expect(scoreFromDistance(d)).toBeLessThanOrEqual(MAX_ROUND_SCORE);
    }
  });
});

describe('maxGameScore', () => {
  it('matches the default five-round match', () => {
    expect(maxGameScore(5)).toBe(25000);
    expect(maxGameScore(15)).toBe(75000);
  });
});
