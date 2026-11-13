/**
 * Mapping between a position across the closed Bible's fore edge and a page.
 *
 * `u` runs from 0 (the front cover) to 1 (the back cover). On desktop it comes
 * from the cursor's position on the page edges; on mobile the slider supplies a
 * page and the marker is placed from it, so both directions are needed and they
 * must agree exactly.
 */

/** Page number under a normalised position across the fore edge. */
export function pageFromU(u, totalPages) {
  const page = Math.round(1 + u * (totalPages - 1));
  return Math.min(Math.max(page, 1), totalPages);
}

/** Normalised fore-edge position of a page: the inverse of `pageFromU`. */
export function uFromPage(page, totalPages) {
  if (totalPages <= 1) return 0;
  const clamped = Math.min(Math.max(Math.round(page), 1), totalPages);
  return (clamped - 1) / (totalPages - 1);
}

/**
 * Which side of an open spread a page sits on. Spreads always start on an odd
 * page, so odd pages are left-hand pages, as in a printed book. The single-page
 * mobile view uses this to set the running head the same way the spread does.
 */
export function sideForPage(page) {
  return page % 2 === 1 ? 'left' : 'right';
}
