import { describe, it, expect } from 'vitest';
import { PRACTICE_BATCH, nextPracticeTargets, buildTargets } from '../lib/game.js';

/**
 * An Endless Practice game stores only the verses still to come. Each guess
 * drops the one just played, and a fresh batch is drawn when the queue runs
 * dry — so the game never ends, the answers never leave the server, and the
 * stored game stays a handful of verses long however many rounds are played.
 */
describe('nextPracticeTargets', () => {
  it('drops the verse that was just played', () => {
    const queue = buildTargets(50, PRACTICE_BATCH);
    const next = nextPracticeTargets(queue, 50);
    expect(next).toHaveLength(PRACTICE_BATCH - 1);
    expect(next).toEqual(queue.slice(1));
  });

  it('draws a fresh batch when the last queued verse has been played', () => {
    const lastOne = buildTargets(50, 1);
    const next = nextPracticeTargets(lastOne, 50);
    expect(next).toHaveLength(PRACTICE_BATCH);
    expect(next[0]).toHaveProperty('text');
    expect(next[0]).toHaveProperty('decimalPage');
  });

  it('never stores more than one batch, however long the session runs', () => {
    let queue = buildTargets(50, PRACTICE_BATCH);
    for (let round = 0; round < 250; round += 1) {
      queue = nextPracticeTargets(queue, 50);
      expect(queue.length).toBeGreaterThan(0);
      expect(queue.length).toBeLessThanOrEqual(PRACTICE_BATCH);
    }
  });
});
