import { describe, it, expect } from 'vitest';
import { inVerse } from '@/components/bible/BiblePage';

/**
 * Selection is per-verse, so every word on screen is tested against the
 * selected reference on every render. That makes this the hottest and most
 * exposed predicate in the page renderer — and a throw inside it blanks the
 * whole book rather than degrading quietly.
 */
describe('inVerse', () => {
  const selection = { book: 8, chapter: 30, verse: 10 };

  it('matches only the exact reference', () => {
    expect(inVerse([8, 30, 10], selection)).toBe(true);
    expect(inVerse([8, 30, 11], selection)).toBe(false);
    expect(inVerse([8, 31, 10], selection)).toBe(false);
    expect(inVerse([9, 30, 10], selection)).toBe(false);
  });

  it('is false, not fatal, when there is no selection', () => {
    expect(inVerse([8, 30, 10], null)).toBe(false);
    expect(inVerse([8, 30, 10], undefined)).toBe(false);
  });

  it('is false, not fatal, when the word has no reference', () => {
    // A verse number whose first word falls on the following line has no
    // reference of its own to inherit.
    expect(inVerse(null, selection)).toBe(false);
    expect(inVerse(undefined, selection)).toBe(false);
  });

  it('treats book 0 and chapter 0 as real values rather than falsy ones', () => {
    expect(inVerse([0, 1, 1], { book: 0, chapter: 1, verse: 1 })).toBe(true);
  });
});
