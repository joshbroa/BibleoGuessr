import { memo } from 'react';

/**
 * Renders one pre-typeset page.
 *
 * This component is a *painter*, not a layouter. Every line break, every word
 * width and every inter-word gap was decided by
 * `scripts/generate_bible_pages.py` and shipped in the page JSON; all that
 * happens here is placing those measurements into the DOM. That is what makes
 * the page identical on every device, which is what makes scoring by physical
 * page distance mean anything at all.
 */

/** Line-unit heights used by the generator for structural headings. */
const BOOK_SLOTS = 3;
const CHAPTER_SLOTS = 2;

/**
 * Does this word belong to the given verse?
 *
 * Selection is per-verse, so highlighting is a reference comparison rather than
 * a word-index one. That also makes it work for free across line, column and
 * page boundaries — a verse running onto the facing page highlights on both.
 */
export function inVerse(ref, target) {
  // `ref` is absent for a verse number whose first word falls on the next line,
  // so it has to be guarded as carefully as `target`.
  if (!ref || !target) return false;
  return ref[0] === target.book && ref[1] === target.chapter && ref[2] === target.verse;
}

function HeadingLine({ line, manifest }) {
  const slots = line.t === 'book' ? BOOK_SLOTS : CHAPTER_SLOTS;
  // The generator drops the leading air when a heading lands at the top of a
  // column, so the rendered height has to drop it too.
  const height = (line.top ? slots - 1 : slots) * manifest.lineHeight;
  const isBook = line.t === 'book';

  return (
    <div
      style={{
        height,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontSize: manifest.fontSize * (isBook ? 1.5 : 1.02),
          lineHeight: `${manifest.lineHeight * (isBook ? 1.35 : 1)}px`,
          fontWeight: 700,
          letterSpacing: isBook ? '0.08em' : '0.14em',
          textAlign: 'center',
        }}
      >
        {line.x}
      </span>
    </div>
  );
}

function TextLine({
  line,
  manifest,
  pageNumber,
  refs,
  selection,
  answer,
  hovered,
  onSelectWord,
  onHoverVerse,
}) {
  const last = line.e.length - 1;

  /**
   * Which highlight band, if any, this reference falls in.
   *
   * The answer outranks the selection, which outranks the hover. That order
   * only matters when a guess is exactly right and both point at the same
   * verse — and there, green ("you found it") is the more useful signal than
   * gold. During a round the answer is never known to the client, so this
   * costs nothing in play.
   */
  function bandFor(ref) {
    if (inVerse(ref, answer)) return 'is-answer';
    if (inVerse(ref, selection)) return 'is-selected';
    if (inVerse(ref, hovered)) return 'is-hovered';
    return null;
  }

  /** Casts the band sideways into the inter-word gaps so it reads as one block. */
  function bridgeStyle(band, both = true) {
    if (!band) return null;
    const reach = line.s / 2;
    return {
      boxShadow: both
        ? `${-reach}px 0 0 0 var(--hl), ${reach}px 0 0 0 var(--hl)`
        : `${reach}px 0 0 0 var(--hl)`,
    };
  }

  /** The reference of the next actual word after `from` — a verse number's own. */
  function followingRef(from) {
    for (let i = from + 1; i < line.e.length; i += 1) {
      if (line.e[i].w !== undefined) return refs[line.e[i].r];
    }
    return null;
  }

  return (
    <div className="scripture-line" style={{ height: manifest.lineHeight }}>
      {line.e.map((element, index) => {
        const marginRight = index < last ? line.s : 0;

        if (element.v !== undefined) {
          // Verse numbers carry no reference of their own, but they open the
          // verse that follows — so they highlight with it, and the band starts
          // where the verse visually starts.
          const band = bandFor(followingRef(index));

          return (
            <span
              key={`v${index}`}
              className={band ? `scripture-verse-num ${band}` : 'scripture-verse-num'}
              style={{
                width: element.x,
                marginRight,
                fontSize: manifest.fontSize * manifest.superscriptScale,
                // Only reaches rightwards: nothing precedes a verse opening.
                ...bridgeStyle(band, false),
              }}
              aria-hidden="true"
            >
              {element.v}
            </span>
          );
        }

        const ref = refs[element.r];
        const band = bandFor(ref);

        return (
          <span
            key={`w${element.i}`}
            className={band ? `scripture-word ${band}` : 'scripture-word'}
            style={{ width: element.x, marginRight, ...bridgeStyle(band) }}
            role={onSelectWord ? 'button' : undefined}
            tabIndex={-1}
            aria-pressed={onSelectWord ? band === 'is-selected' : undefined}
            onPointerEnter={
              onHoverVerse
                ? () => {
                    const [book, chapter, verse] = ref;
                    onHoverVerse({ book, chapter, verse });
                  }
                : undefined
            }
            onClick={
              onSelectWord
                ? () => {
                    const [book, chapter, verse] = ref;
                    onSelectWord({
                      page: pageNumber,
                      wordIndex: element.i,
                      book,
                      chapter,
                      verse,
                      reference: `${manifest.books[book]} ${chapter}:${verse}`,
                    });
                  }
                : undefined
            }
          >
            {element.w}
          </span>
        );
      })}
    </div>
  );
}

function BiblePage({
  page,
  manifest,
  side = 'left',
  selection,
  answer,
  hovered,
  onSelectWord,
  onHoverVerse,
}) {
  if (!page) {
    return (
      <div
        className="page-paper"
        style={{ width: manifest.pageWidth, height: manifest.pageHeight, opacity: 0.5 }}
        aria-hidden="true"
      />
    );
  }

  const isLeft = side === 'left';

  return (
    <div
      className="page-paper scripture relative overflow-hidden"
      style={{
        width: manifest.pageWidth,
        height: manifest.pageHeight,
        // These two MUST match the generator's FONT_SIZE and LINE_HEIGHT. Every
        // stored word width and line break was measured against them, so an
        // inherited size here would silently desynchronise the whole layout.
        fontSize: manifest.fontSize,
        lineHeight: `${manifest.lineHeight}px`,
      }}
      aria-label={`Page ${page.p}`}
    >
      {/* Running head and folio, positioned exactly as a printed Bible sets
          them: book name toward the outer edge, page number opposite. */}
      <div
        className="absolute flex items-baseline justify-between"
        style={{
          top: manifest.marginTop * 0.42,
          left: manifest.marginX,
          right: manifest.marginX,
          fontSize: manifest.fontSize * 0.72,
          letterSpacing: '0.16em',
          color: '#6b5c47',
        }}
      >
        <span style={{ fontWeight: isLeft ? 700 : 400 }}>{isLeft ? page.head : page.p}</span>
        <span style={{ fontWeight: isLeft ? 400 : 700 }}>{isLeft ? page.p : page.head}</span>
      </div>

      <div
        className="absolute flex"
        style={{
          top: manifest.marginTop,
          left: manifest.marginX,
          right: manifest.marginX,
          gap: manifest.gutter,
        }}
      >
        {page.cols.map((column, columnIndex) => (
          <div key={columnIndex} style={{ width: manifest.columnWidth }}>
            {column.lines.map((line, lineIndex) =>
              line.t === 'text' ? (
                <TextLine
                  key={lineIndex}
                  line={line}
                  manifest={manifest}
                  pageNumber={page.p}
                  refs={page.refs}
                  selection={selection}
                  answer={answer}
                  hovered={hovered}
                  onSelectWord={onSelectWord}
                  onHoverVerse={onHoverVerse}
                />
              ) : (
                <HeadingLine key={lineIndex} line={line} manifest={manifest} />
              )
            )}
          </div>
        ))}
      </div>

      {/* Gutter shadow: the page curving down into the spine. */}
      <div
        className="pointer-events-none absolute inset-y-0"
        style={{
          width: manifest.pageWidth * 0.16,
          [isLeft ? 'right' : 'left']: 0,
          background: `linear-gradient(to ${isLeft ? 'right' : 'left'}, rgba(90,70,40,0) 0%, rgba(90,70,40,0.16) 100%)`,
        }}
      />
    </div>
  );
}

export default memo(BiblePage);
