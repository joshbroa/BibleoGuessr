import { describe, it, expect } from 'vitest';
import { windowPages, spreadStart } from '@/lib/pageCache';

describe('spreadStart', () => {
  it('anchors every spread on its odd left-hand page', () => {
    expect(spreadStart(1)).toBe(1);
    expect(spreadStart(2)).toBe(1);
    expect(spreadStart(3)).toBe(3);
    expect(spreadStart(2701)).toBe(2701);
    expect(spreadStart(2702)).toBe(2701);
  });
});

describe('windowPages', () => {
  const TOTAL = 3166;

  it('holds exactly the six pages a turn can reach', () => {
    // Previous spread, active spread, next spread.
    expect(windowPages(101, TOTAL)).toEqual([99, 100, 101, 102, 103, 104]);
  });

  it('clamps at the start of the book', () => {
    expect(windowPages(1, TOTAL)).toEqual([1, 2, 3, 4]);
    expect(windowPages(3, TOTAL)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('clamps at the end of the book', () => {
    expect(windowPages(TOTAL - 1, TOTAL)).toEqual([
      TOTAL - 3,
      TOTAL - 2,
      TOTAL - 1,
      TOTAL,
    ]);
  });

  it('always contains the active spread itself', () => {
    for (const page of [1, 3, 999, 2701, TOTAL - 1]) {
      const window = windowPages(page, TOTAL);
      expect(window).toContain(page);
      if (page + 1 <= TOTAL) expect(window).toContain(page + 1);
    }
  });
});
