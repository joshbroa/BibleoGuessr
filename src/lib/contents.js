/** The King James Bible's Old Testament has 39 books; the New, 27. */
const OLD_TESTAMENT_BOOKS = 39;

/**
 * The contents entry for the book a page belongs to: the last book that starts
 * on or before it.
 *
 * @param {{book: string, page: number}[]} contents in book order
 * @param {number} page
 */
export function bookForPage(contents, page) {
  if (!contents?.length) return null;
  let found = contents[0];
  for (const entry of contents) {
    if (entry.page > page) break;
    found = entry;
  }
  return found;
}

/** The contents split into the two testaments, each keeping its own order. */
export function splitTestaments(contents) {
  return {
    oldTestament: contents.slice(0, OLD_TESTAMENT_BOOKS),
    newTestament: contents.slice(OLD_TESTAMENT_BOOKS),
  };
}
