import { describe, it, expect } from 'vitest';
import { pageFromU, uFromPage, sideForPage } from '@/lib/pageMath';
import { spreadStart } from '@/lib/pageCache';

/**
 * The closed Bible maps a position across its fore edge (u, 0–1) to a page.
 * Desktop reads u from the cursor; the mobile slider goes the other way and
 * places the marker from a page number. The two must agree, or the marker would
 * sit somewhere other than the page the book then opens at.
 */
describe('pageFromU', () => {
  it('maps the two ends of the fore edge to the first and last page', () => {
    expect(pageFromU(0, 3198)).toBe(1);
    expect(pageFromU(1, 3198)).toBe(3198);
  });

  it('clamps positions outside the fore edge', () => {
    expect(pageFromU(-0.2, 3198)).toBe(1);
    expect(pageFromU(1.4, 3198)).toBe(3198);
  });
});

describe('uFromPage', () => {
  it('is the inverse of pageFromU for every page', () => {
    for (const page of [1, 2, 3, 674, 1039, 1040, 3197, 3198]) {
      expect(pageFromU(uFromPage(page, 3198), 3198)).toBe(page);
    }
  });

  it('clamps out-of-range pages', () => {
    expect(uFromPage(0, 3198)).toBe(0);
    expect(uFromPage(5000, 3198)).toBe(1);
  });

  it('does not divide by zero for a one-page book', () => {
    expect(uFromPage(1, 1)).toBe(0);
  });
});

describe('sideForPage', () => {
  it('puts odd pages on the left, matching the spread', () => {
    expect(sideForPage(1)).toBe('left');
    expect(sideForPage(2)).toBe('right');
    expect(sideForPage(1039)).toBe('left');
    // The spread always opens on an odd page, so its left page is that page.
    expect(sideForPage(spreadStart(1040))).toBe('left');
  });
});
