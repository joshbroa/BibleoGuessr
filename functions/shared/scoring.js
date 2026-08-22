/**
 * Scoring and page-space geometry.
 *
 * SHARED MODULE — imported by both the Cloud Functions (directly) and the React
 * client (via the `@shared` Vite alias). There is exactly one copy so the score
 * the client animates can never disagree with the score the server computed.
 *
 * The server remains authoritative: the client only ever renders numbers the
 * server has already returned. These helpers exist client-side for the result
 * bar interpolation and for tests.
 */

/** Guesses further than this many pages away are simply worthless. */
export const MAX_DISTANCE = 2000;

/**
 * Decay constant of the score curve.
 *
 * Half marks land at ln(2)/DECAY ≈ 347 pages. Raised from the original 0.0016
 * (≈433 pages) because that curve paid too well for a vague guess: landing in
 * roughly the right third of the Bible was worth most of the round.
 */
export const DECAY = 0.002;

/** Best possible score for a single round. */
export const MAX_ROUND_SCORE = 5000;

/**
 * A word's position in the Bible's linear page space, expressed as a decimal
 * page number:
 *
 *     decimal page = page number + (word index within page / words on page)
 *
 * So the 60th word of a 240-word page 12 sits at 12.25 — a quarter of the way
 * through that page.
 *
 * @param {number} pageNumber   1-based global page number
 * @param {number} wordIndex    0-based index of the word within that page
 * @param {number} wordsPerPage total word count of that specific page
 * @returns {number}
 */
export function decimalPage(pageNumber, wordIndex, wordsPerPage) {
  if (!Number.isFinite(pageNumber)) return 0;
  if (!wordsPerPage || wordsPerPage <= 0) return pageNumber;
  return pageNumber + wordIndex / wordsPerPage;
}

/**
 * Absolute physical distance across page space between two decimal positions.
 * @returns {number} ΔD, in pages
 */
export function pageDistance(targetDecimalPage, guessDecimalPage) {
  return Math.abs(targetDecimalPage - guessDecimalPage);
}

/**
 * Score a round from its page distance.
 *
 *     ΔD > 2000            -> 0
 *     otherwise            -> round(5000 * e^(-0.002 * ΔD))
 *
 * A null/absent guess (timeout, or an unanswered round) scores 0.
 *
 * @param {number|null} distance ΔD in pages, or null for "no guess submitted"
 * @returns {number} integer 0..5000
 */
export function scoreFromDistance(distance) {
  if (distance === null || distance === undefined) return 0;
  if (!Number.isFinite(distance) || distance < 0) return 0;
  if (distance > MAX_DISTANCE) return 0;
  return Math.round(MAX_ROUND_SCORE * Math.exp(-DECAY * distance));
}

/**
 * Highest score obtainable in a game of `roundCount` rounds — the denominator
 * of the summary screen's master score bar.
 */
export function maxGameScore(roundCount) {
  return roundCount * MAX_ROUND_SCORE;
}

/** Format a decimal page for display, e.g. 2701.4615 -> "p. 2701". */
export function formatPage(decimal) {
  return `p. ${Math.floor(decimal)}`;
}
