/**
 * Game logic: picking the verses, and ruling on the guesses.
 *
 * Everything in here runs server-side only. The client is never told which
 * verse it is looking at, only the bare text of the prompt.
 */

import crypto from 'node:crypto';
import {
  getVersePool,
  getPopularityBuckets,
  resolveWord,
  getVerse,
  formatReference,
} from './bibleData.js';
import { decimalPage, pageDistance, scoreFromDistance } from '../shared/scoring.js';

// ---------------------------------------------------------------------------
// Weighted verse selection
// ---------------------------------------------------------------------------

/**
 * Strength of the popularity bias at slider = 100.
 *
 * The bias is exponential in normalised popularity, so this is the natural log
 * of the odds ratio between the most and least popular verse.
 */
const K_MAX = 20;

/**
 * Curvature of the slider's response.
 *
 * A linear slider would already feel biased at the halfway mark, because verse
 * popularity is a bell curve and even a modest exponent pulls hard on its tail.
 * Raising the slider position to this power keeps the low and middle range
 * gentle and saves the aggressive bias for the top end. The resulting spread:
 *
 *     slider   0 -> mean popularity 50 (uniform over all 31,102 verses)
 *     slider  50 -> mean popularity 69
 *     slider 100 -> mean popularity 91 (~77% of draws are household verses)
 */
const SLIDER_EXPONENT = 1.5;

/**
 * Cryptographically strong uniform float in [0, 1).
 *
 * Math.random would be fine for fairness, but the verse choice is the secret the
 * whole anti-cheat design protects — a predictable PRNG stream would let a
 * determined player forecast future rounds.
 */
function secureRandom() {
  return crypto.randomInt(0, 2 ** 32) / 2 ** 32;
}

/**
 * Pick `count` distinct verses, biased by the popularity slider.
 *
 *   slider 0   -> every one of the 31,102 verses is equally likely
 *   slider 100 -> household verses dominate
 *
 * @param {number} popularity slider position, 0..100
 * @param {number} count number of verses to draw
 * @returns {Array<object>} entries from the verse pool
 */
export function selectVerses(popularity, count) {
  const pool = getVersePool();
  const buckets = getPopularityBuckets();

  const k = K_MAX * Math.pow(popularity / 100, SLIDER_EXPONENT);

  // Weight per bucket = (verses in bucket) x (exponential popularity bias).
  // Multiplying by the bucket size is what keeps slider 0 exactly uniform over
  // verses rather than uniform over popularity scores.
  const weights = buckets.map((bucket) => {
    const normalised = (bucket.popularity - 1) / 99;
    return bucket.indices.length * Math.exp(k * normalised);
  });

  const cumulative = [];
  let running = 0;
  for (const weight of weights) {
    running += weight;
    cumulative.push(running);
  }

  const chosen = [];
  const seen = new Set();
  // Rejection sampling for distinctness. With 31k verses and at most 15 rounds a
  // collision is vanishingly rare even at full popularity bias, but the attempt
  // ceiling guarantees termination regardless.
  const maxAttempts = count * 50;

  for (let attempt = 0; attempt < maxAttempts && chosen.length < count; attempt += 1) {
    const target = secureRandom() * running;

    let lo = 0;
    let hi = cumulative.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] < target) lo = mid + 1;
      else hi = mid;
    }

    const bucket = buckets[lo];
    const poolIndex = bucket.indices[Math.floor(secureRandom() * bucket.indices.length)];
    if (seen.has(poolIndex)) continue;

    seen.add(poolIndex);
    chosen.push(pool[poolIndex]);
  }

  // Only reachable if the bias is so extreme that the eligible set is smaller
  // than the requested round count; fall back to uniform to fill the gap.
  while (chosen.length < count) {
    const poolIndex = Math.floor(secureRandom() * pool.length);
    if (seen.has(poolIndex)) continue;
    seen.add(poolIndex);
    chosen.push(pool[poolIndex]);
  }

  return chosen;
}

/**
 * Build the secret round targets stored on the game document.
 * `text` is the only field that will ever be sent to the browser.
 */
export function buildTargets(popularity, rounds) {
  return selectVerses(popularity, rounds).map((verse) => ({
    book: verse.b,
    chapter: verse.c,
    verse: verse.v,
    text: verse.t,
    popularity: verse.pop,
    page: verse.p,
    wordIndex: verse.i,
    decimalPage: verse.dp,
  }));
}

// ---------------------------------------------------------------------------
// Endless Practice
// ---------------------------------------------------------------------------

/** Verses drawn at a time for an Endless Practice game. */
export const PRACTICE_BATCH = 10;

/**
 * An Endless Practice game stores only the verses still to come, with the one
 * being played first. After each guess: drop that verse, and when the queue is
 * empty draw a fresh batch. Rounds already played are kept nowhere, so the game
 * stays small and has no length limit.
 */
export function nextPracticeTargets(targets, popularity) {
  const remaining = targets.slice(1);
  return remaining.length ? remaining : buildTargets(popularity, PRACTICE_BATCH);
}

// ---------------------------------------------------------------------------
// Guess evaluation
// ---------------------------------------------------------------------------

/**
 * Score one guess against one target.
 *
 * @param {object} target a target entry from `buildTargets`
 * @param {{page: number, wordIndex: number}|null} guess null means no guess was
 *        made (the round timed out, or the player submitted nothing)
 * @returns {object} the full, now-revealable round result
 */
export function evaluateGuess(target, guess) {
  const answer = {
    book: target.book,
    chapter: target.chapter,
    verse: target.verse,
    reference: formatReference(target.book, target.chapter, target.verse),
    page: target.page,
    // Index of the verse's first word on that page — lets the result screen
    // highlight the exact spot the player was hunting for.
    wordIndex: target.wordIndex,
    decimalPage: target.decimalPage,
    text: target.text,
    popularity: target.popularity,
  };

  if (!guess) {
    // No guess is worth nothing either way, but *why* there was no guess is the
    // caller's to say: an expired clock and a player who submitted an empty
    // board both land here, and only `submitGuess` knows which.
    return {
      guess: null,
      answer,
      distance: null,
      score: 0,
      timedOut: false,
    };
  }

  const resolved = resolveWord(guess.page, guess.wordIndex);
  if (!resolved) {
    // The client pointed at a word that does not exist on that page. Treat it
    // exactly like a non-answer rather than guessing at intent.
    return {
      guess: null,
      answer,
      distance: null,
      score: 0,
      timedOut: false,
      invalid: true,
    };
  }

  // The player picked a verse, so score the verse — not the particular word they
  // happened to click inside it. Both sides of the comparison are then measured
  // the same way: the position of the verse's first word.
  const picked = getVerse(resolved.book, resolved.chapter, resolved.verse);
  const guessDecimalPage = picked
    ? picked.dp
    : decimalPage(guess.page, guess.wordIndex, resolved.wordsPerPage);

  const distance = pageDistance(target.decimalPage, guessDecimalPage);
  const score = scoreFromDistance(distance);

  return {
    guess: {
      book: resolved.book,
      chapter: resolved.chapter,
      verse: resolved.verse,
      reference: formatReference(resolved.book, resolved.chapter, resolved.verse),
      page: picked ? picked.p : guess.page,
      wordIndex: picked ? picked.i : guess.wordIndex,
      decimalPage: Number(guessDecimalPage.toFixed(6)),
    },
    answer,
    distance: Number(distance.toFixed(4)),
    score,
    timedOut: false,
  };
}
