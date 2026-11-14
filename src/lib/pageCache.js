/**
 * Fetching for the pre-typeset Bible pages.
 *
 * Page files are immutable and served with a one-year `immutable` cache header
 * (see firebase.json), so a re-fetch of a page the player has already seen is
 * satisfied from the browser's disk cache without touching the network. That is
 * what lets the sliding window hold *exactly* six pages and genuinely drop the
 * trailing frame — evicting a page costs nothing to undo.
 */

const PAGES_BASE = '/bible_pages';

/** In-flight requests, so a window shift never fires the same fetch twice. */
const inFlight = new Map();

let manifestPromise = null;

/** Layout constants and book names, shared with the generator and the backend. */
export function loadManifest() {
  if (!manifestPromise) {
    manifestPromise = Promise.all([
      fetch(`${PAGES_BASE}/manifest.json`).then((response) => {
        if (!response.ok) throw new Error(`Could not load the Bible manifest (${response.status})`);
        return response.json();
      }),
      loadScriptureFont(),
    ]).then(([manifest]) => manifest);
    manifestPromise.catch(() => {
      // Let a failed load be retried rather than caching the rejection forever.
      manifestPromise = null;
    });
  }
  return manifestPromise;
}

/**
 * Wait for the scripture font. A page painted before Tinos arrives would be
 * set in a stand-in serif of different widths, and its words would overlap
 * until the swap. A font that never loads must not block the game, so failure
 * (or a browser without the Font Loading API) resolves anyway.
 */
function loadScriptureFont() {
  if (typeof document === 'undefined' || !document.fonts?.load) return Promise.resolve();
  return Promise.all([document.fonts.load('14px Tinos'), document.fonts.load('bold 14px Tinos')]).catch(() => {});
}

let contentsPromise = null;

/**
 * The table of contents: each book's name and the page its text starts on,
 * written by the generator alongside the pages. Used by Browsing mode.
 * @returns {Promise<{book: string, page: number}[]>}
 */
export function loadContents() {
  if (!contentsPromise) {
    contentsPromise = fetch(`${PAGES_BASE}/contents.json`).then((response) => {
      if (!response.ok) throw new Error(`Could not load the contents (${response.status})`);
      return response.json();
    });
    contentsPromise.catch(() => {
      contentsPromise = null;
    });
  }
  return contentsPromise;
}

/**
 * Load a single typeset page.
 * @param {number} pageNumber 1-based
 * @returns {Promise<object>}
 */
export function loadPage(pageNumber) {
  const existing = inFlight.get(pageNumber);
  if (existing) return existing;

  const request = fetch(`${PAGES_BASE}/${pageNumber}.json`)
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load page ${pageNumber} (${response.status})`);
      return response.json();
    })
    .finally(() => {
      inFlight.delete(pageNumber);
    });

  inFlight.set(pageNumber, request);
  return request;
}

/**
 * The six page numbers the sliding window holds for an active spread.
 *
 * `activePage` is always the left page of the spread and is always odd, so the
 * window is: the previous spread (N-2, N-1), the active spread (N, N+1), and
 * the next spread (N+2, N+3) — precisely the pages a forward or backward page
 * turn needs to have on hand for the fold to be instant.
 *
 * @param {number} activePage
 * @param {number} totalPages
 * @returns {number[]}
 */
export function windowPages(activePage, totalPages) {
  const candidates = [
    activePage - 2,
    activePage - 1,
    activePage,
    activePage + 1,
    activePage + 2,
    activePage + 3,
  ];
  return candidates.filter((page) => page >= 1 && page <= totalPages);
}

/** Left page of the spread containing `page`. Spreads are (odd, even). */
export function spreadStart(page) {
  return page % 2 === 1 ? page : page - 1;
}
