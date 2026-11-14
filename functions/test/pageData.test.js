import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  getManifest,
  getPage,
  getVersePool,
  resolveWord,
  formatReference,
} from '../lib/bibleData.js';
import { buildTargets, evaluateGuess, selectVerses } from '../lib/game.js';
import { decimalPage, MAX_ROUND_SCORE } from '../shared/scoring.js';

/**
 * Integrity of the generated page data.
 *
 * These are the assertions that keep the game honest. If the page array drifts
 * — a word index gets duplicated, a justified line stops summing to the column
 * width, a verse's stored decimal page stops matching where its first word
 * actually sits — then guesses stop being scored against what the player sees.
 * Nothing else in the codebase would notice.
 */

const PAGES_DIR = path.join(process.cwd(), 'functions', 'src', 'bible_pages');
const manifest = getManifest();

/** A fixed spread of pages across the whole book, plus the edges. */
function samplePages(count = 60) {
  const pages = [1, 2, manifest.totalPages - 1, manifest.totalPages];
  const stride = Math.floor(manifest.totalPages / count);
  for (let page = stride; page < manifest.totalPages; page += stride) pages.push(page);
  return [...new Set(pages)];
}

describe('manifest', () => {
  it('describes a two-column page whose geometry adds up', () => {
    expect(manifest.columnWidth * 2 + manifest.gutter + manifest.marginX * 2).toBeCloseTo(
      manifest.pageWidth,
      6
    );
    expect(manifest.linesPerColumn).toBeGreaterThan(0);
    expect(manifest.books).toHaveLength(66);
  });

  it('lands close to the ~3,160 page target', () => {
    expect(manifest.totalPages).toBeGreaterThan(3000);
    expect(manifest.totalPages).toBeLessThan(3300);
  });

  it('has exactly one file per page', () => {
    const files = fs.readdirSync(PAGES_DIR).filter((name) => /^\d+\.json$/.test(name));
    expect(files).toHaveLength(manifest.totalPages);
  });
});

describe('page layout', () => {
  it('numbers every word on a page exactly once, from 0 to wc-1', () => {
    for (const pageNumber of samplePages()) {
      const page = getPage(pageNumber);
      expect(page, `page ${pageNumber} should exist`).toBeTruthy();

      const seen = [];
      for (const column of page.cols) {
        for (const line of column.lines) {
          if (line.t !== 'text') continue;
          for (const element of line.e) {
            if (element.w !== undefined) seen.push(element.i);
          }
        }
      }

      expect(seen).toHaveLength(page.wc);
      // Indices must be sequential in reading order: column 1 top to bottom,
      // then column 2. The decimal page position depends on it.
      expect(seen).toEqual(seen.map((_, index) => index));
    }
  });

  it('justifies text lines to exactly the column width', () => {
    let justifiedLines = 0;

    for (const pageNumber of samplePages(40)) {
      const page = getPage(pageNumber);
      for (const column of page.cols) {
        for (const line of column.lines) {
          if (line.t !== 'text' || !line.j) continue;
          justifiedLines += 1;

          const words = line.e.reduce((sum, element) => sum + element.x, 0);
          const gaps = line.e.length - 1;
          expect(words + line.s * gaps).toBeCloseTo(manifest.columnWidth, 1);
        }
      }
    }

    expect(justifiedLines).toBeGreaterThan(500);
  });

  it('never overflows a column, justified or ragged', () => {
    for (const pageNumber of samplePages(40)) {
      const page = getPage(pageNumber);
      for (const column of page.cols) {
        for (const line of column.lines) {
          if (line.t !== 'text') continue;
          const words = line.e.reduce((sum, element) => sum + element.x, 0);
          expect(words).toBeLessThanOrEqual(manifest.columnWidth + 0.01);
        }
      }
    }
  });

  it('keeps each column within its line budget', () => {
    for (const pageNumber of samplePages(40)) {
      const page = getPage(pageNumber);
      expect(page.cols).toHaveLength(2);

      for (const column of page.cols) {
        const used = column.lines.reduce((sum, line) => {
          if (line.t === 'text') return sum + 1;
          const slots = line.t === 'book' ? 3 : 2;
          return sum + (line.top ? slots - 1 : slots);
        }, 0);
        expect(used).toBeLessThanOrEqual(manifest.linesPerColumn);
      }
    }
  });

  it('gives every word a resolvable reference', () => {
    const page = getPage(1);
    for (const column of page.cols) {
      for (const line of column.lines) {
        if (line.t !== 'text') continue;
        for (const element of line.e) {
          if (element.w === undefined) continue;
          expect(page.refs[element.r]).toBeDefined();
        }
      }
    }
  });
});

describe('verse pool', () => {
  const pool = getVersePool();

  it('holds the whole KJV', () => {
    expect(pool).toHaveLength(31102);
  });

  it('runs in canonical order, so page positions only ever advance', () => {
    for (let i = 1; i < pool.length; i += 1) {
      expect(pool[i].dp).toBeGreaterThanOrEqual(pool[i - 1].dp);
    }
  });

  it('stores a decimal page that matches where the verse actually starts', () => {
    for (let i = 0; i < pool.length; i += 977) {
      const verse = pool[i];
      const page = getPage(verse.p);
      expect(decimalPage(verse.p, verse.i, page.wc)).toBeCloseTo(verse.dp, 5);
    }
  });

  it('opens Genesis 1:1 on page 1 and places John 3:16 correctly', () => {
    expect(pool[0]).toMatchObject({ b: 0, c: 1, v: 1, p: 1, i: 0 });

    const john = pool.find((verse) => verse.b === 42 && verse.c === 3 && verse.v === 16);
    expect(john).toBeTruthy();
    const resolved = resolveWord(john.p, john.i);
    expect(formatReference(resolved.book, resolved.chapter, resolved.verse)).toBe('John 3:16');
  });

  it('scores popularity on a 1–100 scale', () => {
    const scores = pool.map((verse) => verse.pop);
    expect(Math.min(...scores)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...scores)).toBeLessThanOrEqual(100);
  });
});

describe('resolveWord', () => {
  it('round-trips a verse position back to its own reference', () => {
    const pool = getVersePool();
    for (let i = 0; i < pool.length; i += 2311) {
      const verse = pool[i];
      const resolved = resolveWord(verse.p, verse.i);
      expect(resolved).toMatchObject({ book: verse.b, chapter: verse.c, verse: verse.v });
    }
  });

  it('refuses positions that do not exist', () => {
    expect(resolveWord(0, 0)).toBeNull();
    expect(resolveWord(manifest.totalPages + 1, 0)).toBeNull();
    expect(resolveWord(1, -1)).toBeNull();
    expect(resolveWord(1, 99999)).toBeNull();
    expect(resolveWord(1.5, 0)).toBeNull();
  });
});

describe('verse selection', () => {
  it('always returns the requested number of distinct verses', () => {
    for (const popularity of [0, 50, 100]) {
      const verses = selectVerses(popularity, 15);
      expect(verses).toHaveLength(15);
      const keys = new Set(verses.map((v) => `${v.b}_${v.c}_${v.v}`));
      expect(keys.size).toBe(15);
    }
  });

  it('leaves the full pool reachable at slider 0 and biases upward from there', () => {
    const mean = (popularity) => {
      const verses = selectVerses(popularity, 1200);
      return verses.reduce((sum, v) => sum + v.pop, 0) / verses.length;
    };

    // Slider 0 is uniform over all verses, so it should land on the middle of
    // the popularity bell curve.
    expect(mean(0)).toBeGreaterThan(44);
    expect(mean(0)).toBeLessThan(57);

    // And the bias has to be monotonic, or the slider is lying to the player.
    expect(mean(100)).toBeGreaterThan(mean(50) + 8);
    expect(mean(50)).toBeGreaterThan(mean(0) + 8);
  });
});

describe('evaluateGuess', () => {
  const [target] = buildTargets(100, 1);

  it('awards a perfect score for landing on the verse itself', () => {
    const result = evaluateGuess(target, { page: target.page, wordIndex: target.wordIndex });
    expect(result.score).toBe(MAX_ROUND_SCORE);
    expect(result.distance).toBe(0);
    expect(result.guess.reference).toBe(result.answer.reference);
  });

  it('scores zero for no guess at all', () => {
    const result = evaluateGuess(target, null);
    expect(result.score).toBe(0);
    expect(result.guess).toBeNull();
    // Whether the clock ran out or the player simply submitted nothing is not
    // something this function can know; submitGuess decides the wording.
    expect(result.timedOut).toBe(false);
  });

  it('treats an unresolvable position as a non-answer rather than trusting it', () => {
    const result = evaluateGuess(target, { page: target.page, wordIndex: 99999 });
    expect(result.score).toBe(0);
    expect(result.invalid).toBe(true);
    expect(result.guess).toBeNull();
  });

  it('scores a verse, not the particular word clicked inside it', () => {
    const pool = getVersePool();
    // A long verse, so first and last word sit well apart on the page.
    const picked = pool.find((verse) => verse.b === 18 && verse.c === 119 && verse.v === 1);
    // Split the way the generator did, or the last index lands in the next verse.
    const wordCount = picked.t.trim().split(/\s+/).length;

    const first = evaluateGuess(target, { page: picked.p, wordIndex: picked.i });
    const last = evaluateGuess(target, { page: picked.p, wordIndex: picked.i + wordCount - 1 });

    expect(first.guess.reference).toBe(last.guess.reference);
    expect(first.distance).toBe(last.distance);
    expect(first.score).toBe(last.score);
    // Both normalise onto the verse's canonical opening position.
    expect(first.guess.decimalPage).toBeCloseTo(picked.dp, 5);
    expect(last.guess.decimalPage).toBeCloseTo(picked.dp, 5);
  });

  it('always reveals the answer, including its exact word position', () => {
    const result = evaluateGuess(target, null);
    expect(result.answer.wordIndex).toBe(target.wordIndex);
    expect(result.answer.page).toBe(target.page);
    expect(result.answer.reference).toMatch(/^.+ \d+:\d+$/);
  });
});

/**
 * Browsing mode's table of contents sends readers straight to each book. If it
 * pointed at the wrong page the reader would land mid-way through the previous
 * book, so every entry is checked against the page it names.
 */
describe('contents', () => {
  const contents = JSON.parse(fs.readFileSync(path.join(PAGES_DIR, 'contents.json'), 'utf-8'));

  it('lists every book, in order, once', () => {
    expect(contents.map((entry) => entry.book)).toEqual(manifest.books);
  });

  it('starts Genesis on page 1 and climbs from there', () => {
    expect(contents[0].page).toBe(1);
    for (let i = 1; i < contents.length; i += 1) {
      expect(contents[i].page).toBeGreaterThanOrEqual(contents[i - 1].page);
    }
    expect(contents.at(-1).page).toBeLessThanOrEqual(manifest.totalPages);
  });

  it("points each book at the page holding its first verse", () => {
    contents.forEach((entry, bookIndex) => {
      const page = getPage(entry.page);
      const hasFirstVerse = page.refs.some(
        ([book, chapter, verse]) => book === bookIndex && chapter === 1 && verse === 1
      );
      expect(hasFirstVerse, `${entry.book} on page ${entry.page}`).toBe(true);
    });
  });
});
