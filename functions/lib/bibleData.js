/**
 * Server-side access to the pre-computed Bible page data.
 *
 * The page files live on the function's own filesystem (`functions/src/`), put
 * there by `scripts/generate_bible_pages.py`. Reading them locally — rather than
 * fetching from `public/` over HTTP — matters for three reasons:
 *
 *   1. Correctness. The server never has to trust, or wait on, the client.
 *   2. Speed. Evaluating a guess is a synchronous file read, not a network hop.
 *   3. Security. The answer never leaves the backend, so a guess can be scored
 *      without ever telling the browser where the verse actually was.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(HERE, '..', 'src');
const PAGES_DIR = path.join(DATA_DIR, 'bible_pages');

/** Pages held in memory per instance. Bounded so a cold instance stays small. */
const PAGE_CACHE_LIMIT = 256;

let versePool = null;
let manifest = null;
let popularityBuckets = null;
let verseIndex = null;
const pageCache = new Map();

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * Every verse in the KJV with its popularity score and its precomputed decimal
 * page position. ~31,100 entries, loaded once per warm instance.
 */
export function getVersePool() {
  if (!versePool) {
    versePool = readJson(path.join(DATA_DIR, 'verse_pool.json'));
  }
  return versePool;
}

/** Layout constants and book names, shared with the client. */
export function getManifest() {
  if (!manifest) {
    manifest = readJson(path.join(PAGES_DIR, 'manifest.json'));
  }
  return manifest;
}

export function getTotalPages() {
  return getManifest().totalPages;
}

export function getBookName(bookIndex) {
  return getManifest().books[bookIndex] ?? 'Unknown';
}

/**
 * Verse indices grouped by their 1–100 popularity score.
 *
 * The weighted selector needs to bias 31,102 verses by popularity. Weighting
 * each verse individually would mean 31,102 `Math.exp` calls per game; because
 * popularity is an integer, weighting the 100 buckets instead and then picking
 * uniformly inside the chosen bucket is mathematically identical and ~300x
 * cheaper.
 */
export function getPopularityBuckets() {
  if (!popularityBuckets) {
    const pool = getVersePool();
    const buckets = new Map();
    for (let i = 0; i < pool.length; i += 1) {
      const pop = pool[i].pop;
      let bucket = buckets.get(pop);
      if (!bucket) {
        bucket = [];
        buckets.set(pop, bucket);
      }
      bucket.push(i);
    }
    popularityBuckets = [...buckets.entries()]
      .map(([popularity, indices]) => ({ popularity, indices }))
      .sort((a, b) => a.popularity - b.popularity);
  }
  return popularityBuckets;
}

/**
 * Load one page of the typeset Bible.
 * @param {number} pageNumber 1-based
 * @returns {object|null} the page record, or null if out of range / missing
 */
export function getPage(pageNumber) {
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > getTotalPages()) {
    return null;
  }

  const cached = pageCache.get(pageNumber);
  if (cached) return cached;

  let page;
  try {
    page = readJson(path.join(PAGES_DIR, `${pageNumber}.json`));
  } catch {
    return null;
  }

  if (pageCache.size >= PAGE_CACHE_LIMIT) {
    // Plain FIFO eviction. Guess pages are scattered all over the book, so
    // there is no locality worth the bookkeeping of a real LRU.
    pageCache.delete(pageCache.keys().next().value);
  }
  pageCache.set(pageNumber, page);
  return page;
}

/**
 * Resolve a clicked word back to the scripture reference it belongs to.
 *
 * This is the anti-cheat boundary: the client submits nothing but a page number
 * and a word index, and the server decides what that actually points at.
 *
 * @param {number} pageNumber
 * @param {number} wordIndex 0-based index of the word within the page
 * @returns {{book: number, chapter: number, verse: number, word: string,
 *            wordsPerPage: number}|null}
 */
export function resolveWord(pageNumber, wordIndex) {
  const page = getPage(pageNumber);
  if (!page) return null;
  if (!Number.isInteger(wordIndex) || wordIndex < 0 || wordIndex >= page.wc) return null;

  for (const column of page.cols) {
    for (const line of column.lines) {
      if (line.t !== 'text') continue;
      for (const element of line.e) {
        if (element.w !== undefined && element.i === wordIndex) {
          const [book, chapter, verse] = page.refs[element.r];
          return { book, chapter, verse, word: element.w, wordsPerPage: page.wc };
        }
      }
    }
  }
  return null;
}

/**
 * Look up a verse by reference.
 *
 * Players guess a whole verse, not a word, so a guess has to resolve to that
 * verse's canonical position — the same first-word position the targets are
 * measured at. Without this, clicking the first word of a verse and clicking
 * its last word would be scored as marginally different guesses, which is not
 * what the player thinks they are doing.
 *
 * @returns {object|null} the verse pool entry
 */
export function getVerse(bookIndex, chapter, verse) {
  if (!verseIndex) {
    verseIndex = new Map();
    for (const entry of getVersePool()) {
      verseIndex.set(`${entry.b}|${entry.c}|${entry.v}`, entry);
    }
  }
  return verseIndex.get(`${bookIndex}|${chapter}|${verse}`) ?? null;
}

/** Words on a given page — the denominator of that page's decimal positions. */
export function getWordsPerPage(pageNumber) {
  const page = getPage(pageNumber);
  return page ? page.wc : 0;
}

/** Human reference string, e.g. "John 3:16". */
export function formatReference(bookIndex, chapter, verse) {
  return `${getBookName(bookIndex)} ${chapter}:${verse}`;
}
