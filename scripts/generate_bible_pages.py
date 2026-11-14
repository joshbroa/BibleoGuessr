"""
generate_bible_pages.py
=======================

Pre-computes the immutable, deterministic typographic layout of the entire KJV
Bible into a global page array.

Why this exists
---------------
BibleoGuessr scores a guess as the *physical distance across the linear page
space of the Bible*. That is only meaningful if every player, on every browser
and every device, sees the exact same word on the exact same page at the exact
same position. Browser text layout is not portable, so we do not let the browser
break lines. Instead we break every line here, once, using proportional
PostScript Times font metrics, and ship the result as immutable page data.

Typesetting rules enforced
--------------------------
* A page is a fixed bounding box containing exactly 2 columns.
* Book titles render large + bold, chapter breaks render bold.
* Verse numbers are inline superscripts and are NOT words (they never count
  toward a word index).
* Lines are justified by storing ``spaceWidth`` per line:

      S = (COLUMN_WIDTH - W_words) / (k - 1)

  The frontend applies S as ``margin-right`` between words, so it reproduces
  our justification exactly rather than inventing its own.

Outputs
-------
  public/bible_pages/{n}.json          -> client UI (fetched by sliding window cache)
  public/bible_pages/manifest.json     -> layout constants + book names
  public/bible_pages/contents.json     -> each book's starting page (Browsing)
  functions/src/bible_pages/{n}.json   -> identical copy, read by Cloud Functions
                                          via node fs (no network hop, no client trust)
  functions/src/bible_pages/manifest.json
  functions/src/verse_pool.json        -> every verse + popularity + decimal page,
                                          used by the weighted random selector and
                                          by server-side guess evaluation

Usage
-----
  python scripts/generate_bible_pages.py
  python scripts/generate_bible_pages.py --stats-only   # calibrate without writing
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from typing import Any, Dict, List

# --------------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------------

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_JSON = os.path.join(ROOT, "bible_data", "KJV_with_popularity.json")
CLIENT_OUT = os.path.join(ROOT, "public", "bible_pages")
FUNCTIONS_OUT = os.path.join(ROOT, "functions", "src", "bible_pages")
VERSE_POOL_OUT = os.path.join(ROOT, "functions", "src", "verse_pool.json")

# --------------------------------------------------------------------------
# Page geometry (layout units == CSS px at 100% zoom on the rendered page)
# --------------------------------------------------------------------------

PAGE_WIDTH = 396.0
PAGE_HEIGHT = 598.0
MARGIN_X = 36.0
MARGIN_TOP = 48.0
MARGIN_BOTTOM = 36.0
GUTTER = 24.0

COLUMN_WIDTH = (PAGE_WIDTH - (2 * MARGIN_X) - GUTTER) / 2.0
COLUMN_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM

FONT_SIZE = 14.0
LINE_HEIGHT = 19.0
LINES_PER_COLUMN = int(COLUMN_HEIGHT // LINE_HEIGHT)

# Vertical slots consumed by structural headings, expressed in line units.
BOOK_TITLE_SLOTS = 3     # leading air + oversized title
CHAPTER_SLOTS = 2        # leading air + bold chapter line

# Space metrics, in ems, before scaling by FONT_SIZE.
NATURAL_SPACE_EM = 0.25  # Times-Roman `space` advance width (250/1000)
MIN_SPACE_EM = 0.19      # tightest we allow when fitting a line
MAX_SPACE_EM = 0.85      # beyond this a justified line looks like a river; leave it ragged

# Superscript verse numbers.
SUPERSCRIPT_SCALE = 0.62
SUPERSCRIPT_GAP_EM = 0.10

# --------------------------------------------------------------------------
# Times-Roman advance widths, in 1/1000 em (Adobe AFM).
# Using real metrics (rather than a monospace guess) is what makes the stored
# line breaks match what the browser actually paints in a Times/serif stack.
# --------------------------------------------------------------------------

CHAR_WIDTHS: Dict[str, int] = {
    " ": 250, "!": 333, '"': 408, "#": 500, "$": 500, "%": 833, "&": 778,
    "'": 333, "(": 333, ")": 333, "*": 500, "+": 564, ",": 250, "-": 333,
    ".": 250, "/": 278, ":": 278, ";": 278, "<": 564, "=": 564, ">": 564,
    "?": 444, "@": 921, "[": 333, "\\": 278, "]": 333, "^": 469, "_": 500,
    "`": 333, "{": 480, "|": 200, "}": 480, "~": 541,
    "0": 500, "1": 500, "2": 500, "3": 500, "4": 500, "5": 500, "6": 500,
    "7": 500, "8": 500, "9": 500,
    "A": 722, "B": 667, "C": 667, "D": 722, "E": 611, "F": 556, "G": 722,
    "H": 722, "I": 333, "J": 389, "K": 722, "L": 611, "M": 889, "N": 722,
    "O": 722, "P": 556, "Q": 722, "R": 667, "S": 556, "T": 611, "U": 722,
    "V": 722, "W": 944, "X": 722, "Y": 722, "Z": 611,
    "a": 444, "b": 500, "c": 444, "d": 500, "e": 444, "f": 333, "g": 500,
    "h": 500, "i": 278, "j": 278, "k": 500, "l": 278, "m": 778, "n": 500,
    "o": 500, "p": 500, "q": 500, "r": 333, "s": 389, "t": 278, "u": 500,
    "v": 500, "w": 722, "x": 500, "y": 500, "z": 444,
    # Non-ASCII actually present in this KJV source text.
    "’": 333,   # right single quote
    "–": 500,   # en dash (used inside proper names, e.g. Maher-shalal-hash-baz)
    "—": 1000,  # em dash
    "Æ": 889,   # AE ligature
}
FALLBACK_WIDTH = 500


def text_width(text: str, size: float = FONT_SIZE) -> float:
    """Advance width of a string at the given font size, in layout units."""
    total = 0
    for ch in text:
        total += CHAR_WIDTHS.get(ch, FALLBACK_WIDTH)
    return total * size / 1000.0


def r2(value: float) -> float:
    return round(value + 0.0, 2)


# --------------------------------------------------------------------------
# Token stream
# --------------------------------------------------------------------------
#
# The Bible is flattened into one linear stream of tokens. Everything after this
# point is pure layout: the stream never changes, so the page array is stable.
#
#   ("book",    book_name,  ref)
#   ("chapter", "CHAPTER n", ref)
#   ("verse",   "12",        ref)   -> superscript, not a word
#   ("word",    "beginning", ref)   -> clickable, counts toward word index
#
# ``ref`` is (book_index, chapter, verse).


def build_token_stream(bible: Dict[str, Any]):
    tokens: List[tuple] = []
    verses: List[Dict[str, Any]] = []
    book_names: List[str] = []

    for b_idx, book in enumerate(bible["books"]):
        name = book["name"]
        book_names.append(name)
        tokens.append(("book", name.upper(), (b_idx, 1, 1)))

        for chapter_obj in book["chapters"]:
            ch = chapter_obj["chapter"]
            tokens.append(("chapter", f"CHAPTER {ch}", (b_idx, ch, 1)))

            for verse_obj in chapter_obj["verses"]:
                v = verse_obj["verse"]
                ref = (b_idx, ch, v)
                tokens.append(("verse", str(v), ref))

                words = verse_obj["text"].split()
                for w in words:
                    tokens.append(("word", w, ref))

                verses.append({
                    "b": b_idx,
                    "c": ch,
                    "v": v,
                    "t": verse_obj["text"],
                    "pop": int(verse_obj.get("popularity", 50)),
                    "words": len(words),
                })

            # A chapter is one continuous justified paragraph; this marks its end
            # so the closing line is left ragged instead of stretched.
            tokens.append(("break", "", (b_idx, ch, 0)))

    return tokens, verses, book_names


# --------------------------------------------------------------------------
# Layout engine
# --------------------------------------------------------------------------


class PageBuilder:
    """Greedy line-breaker that fills fixed two-column pages in order."""

    def __init__(self) -> None:
        self.pages: List[Dict[str, Any]] = []
        self._start_page()

    # -- page/column lifecycle ------------------------------------------

    def _start_page(self) -> None:
        self.page_no = len(self.pages) + 1
        self.columns: List[List[Dict[str, Any]]] = [[], []]
        self.col_index = 0
        self.col_used = 0          # line-units consumed in the current column
        self.refs: List[List[int]] = []
        self.ref_lookup: Dict[tuple, int] = {}
        self.word_index = 0        # word ordinal within THIS page
        self.page_head = None      # running head, from the first ref on the page

    def _flush_page(self) -> None:
        self.pages.append({
            "p": self.page_no,
            "wc": self.word_index,
            "head": self.page_head or "",
            "refs": self.refs,
            "cols": [{"lines": lines} for lines in self.columns],
        })
        self._start_page()

    def _advance_column(self) -> None:
        if self.col_index == 0:
            self.col_index = 1
            self.col_used = 0
        else:
            self._flush_page()

    def _room(self) -> int:
        return LINES_PER_COLUMN - self.col_used

    def _break_page(self) -> None:
        """
        Force whatever comes next onto a fresh page.

        Used at the start of each book: printed Bibles open a new book on its
        own page rather than running it on from the end of the last one, and
        the running head would otherwise name a book the page has finished with.
        """
        if any(self.columns):
            self._flush_page()

    # -- helpers ---------------------------------------------------------

    def _ref_id(self, ref: tuple) -> int:
        existing = self.ref_lookup.get(ref)
        if existing is not None:
            return existing
        idx = len(self.refs)
        self.ref_lookup[ref] = idx
        self.refs.append([ref[0], ref[1], ref[2]])
        return idx

    def _note_head(self, head: str) -> None:
        if self.page_head is None:
            self.page_head = head

    def _push(self, line: Dict[str, Any], slots: int) -> None:
        self.columns[self.col_index].append(line)
        self.col_used += slots

    # -- structural lines ------------------------------------------------

    def add_heading(self, kind: str, label: str, ref: tuple, head: str) -> None:
        slots = BOOK_TITLE_SLOTS if kind == "book" else CHAPTER_SLOTS

        # Every book opens on a page of its own.
        if kind == "book":
            self._break_page()

        # A heading stranded at the foot of a column with nothing under it reads
        # as a mistake, so require at least two text lines of company.
        elif self._room() < slots + 2:
            self._advance_column()

        # At the very top of a column the leading air is dead space; drop it.
        at_column_top = not self.columns[self.col_index]
        effective_slots = slots - 1 if at_column_top else slots

        self._note_head(head)
        self._push({"t": kind, "x": label, "top": at_column_top}, effective_slots)

    # -- justified text --------------------------------------------------

    def add_text_line(self, raw_elements: List[Dict[str, Any]], words_width: float,
                      justify: bool) -> List[tuple]:
        """
        Commit one assembled line.

        Word indices and reference ids are assigned *here*, after the target
        column and page are settled — never while the line is still being
        assembled. A line that only just failed to fit gets pushed onto the next
        page by this call, and numbering it any earlier would leave its words
        counted against the page they were displaced from.

        @return the (page_number, word_index) of each word, in order.
        """
        if self._room() < 1:
            self._advance_column()

        gaps = len(raw_elements) - 1
        justified = bool(justify and gaps > 0)

        if justified:
            space = (COLUMN_WIDTH - words_width) / gaps
            # A line this loose reads as a river of white running down the
            # column; better to leave it ragged and honest about it.
            if space > MAX_SPACE_EM * FONT_SIZE:
                space = NATURAL_SPACE_EM * FONT_SIZE
                justified = False
        else:
            space = NATURAL_SPACE_EM * FONT_SIZE

        elements: List[Dict[str, Any]] = []
        positions: List[tuple] = []

        for raw in raw_elements:
            if raw["kind"] == "verse":
                elements.append({"v": raw["text"], "x": r2(raw["w"])})
                continue

            self._note_head(raw["head"])
            index = self.word_index
            self.word_index += 1
            positions.append((self.page_no, index))
            elements.append({
                "w": raw["text"],
                "x": r2(raw["w"]),
                "r": self._ref_id(raw["ref"]),
                "i": index,
            })

        self._push({"t": "text", "s": r2(space), "j": justified, "e": elements}, 1)
        return positions

    def finish(self) -> List[Dict[str, Any]]:
        # The trailing partial page is still a real page of the book, so commit
        # it. _flush_page primes a fresh empty page afterwards which is simply
        # never appended.
        if any(self.columns):
            self._flush_page()
        return self.pages


def layout(tokens: List[tuple], book_names: List[str]):
    builder = PageBuilder()

    # The line currently being assembled. Elements stay in a raw, unnumbered
    # form until the line is committed, because until then we do not yet know
    # which page it will land on.
    line_elements: List[Dict[str, Any]] = []
    line_width = 0.0          # summed element widths, excluding spaces

    # Word positions, as (page_number, word_index_within_page), in the order the
    # words appear in the global stream.
    word_positions: List[tuple] = []

    def head_for(ref: tuple) -> str:
        return book_names[ref[0]].upper()

    def flush_line(justify: bool) -> None:
        nonlocal line_elements, line_width
        if not line_elements:
            return
        word_positions.extend(builder.add_text_line(line_elements, line_width, justify))
        line_elements = []
        line_width = 0.0

    def fits(extra_width: float) -> bool:
        gaps = len(line_elements)  # adding one more element adds one more gap
        return (line_width + extra_width + gaps * MIN_SPACE_EM * FONT_SIZE) <= COLUMN_WIDTH

    for kind, value, ref in tokens:
        if kind == "break":
            flush_line(justify=False)
            continue

        if kind in ("book", "chapter"):
            flush_line(justify=False)
            builder.add_heading(kind, value, ref, head_for(ref))
            continue

        if kind == "verse":
            width = text_width(value, FONT_SIZE * SUPERSCRIPT_SCALE) + \
                SUPERSCRIPT_GAP_EM * FONT_SIZE
            if not fits(width):
                flush_line(justify=True)
            line_elements.append({"kind": "verse", "text": value, "w": width})
            line_width += width
            continue

        # kind == "word"
        width = text_width(value)
        if not fits(width):
            flush_line(justify=True)
        line_elements.append({
            "kind": "word",
            "text": value,
            "w": width,
            "ref": ref,
            "head": head_for(ref),
        })
        line_width += width

    flush_line(justify=False)
    pages = builder.finish()
    return pages, word_positions


# --------------------------------------------------------------------------
# Output
# --------------------------------------------------------------------------


def write_json(path: str, data: Any) -> None:
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, separators=(",", ":"), ensure_ascii=False)


def reset_dir(path: str) -> None:
    if os.path.isdir(path):
        shutil.rmtree(path)
    os.makedirs(path, exist_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stats-only", action="store_true",
                        help="Report page geometry without writing any files.")
    args = parser.parse_args()

    print(f"Reading {SOURCE_JSON} ...")
    with open(SOURCE_JSON, "r", encoding="utf-8") as fh:
        bible = json.load(fh)

    tokens, verses, book_names = build_token_stream(bible)
    print(f"  {len(book_names)} books, {len(verses)} verses, "
          f"{sum(v['words'] for v in verses)} words")

    print("Typesetting ...")
    pages, word_positions = layout(tokens, book_names)
    total_pages = len(pages)
    total_words = sum(p["wc"] for p in pages)
    print(f"  COLUMN_WIDTH={COLUMN_WIDTH}  LINES_PER_COLUMN={LINES_PER_COLUMN}")
    print(f"  {total_pages} pages, {total_words / total_pages:.1f} words/page")

    if args.stats_only:
        return 0

    # Decimal page position of every verse == position of its first word.
    # A verse's own words are contiguous in the stream, so the first word's
    # ordinal is the running total of the words preceding it.
    verse_pool: List[Dict[str, Any]] = []
    cursor = 0
    for verse in verses:
        page_no, word_idx = word_positions[cursor]
        words_per_page = pages[page_no - 1]["wc"]
        decimal_page = page_no + (word_idx / words_per_page if words_per_page else 0)
        verse_pool.append({
            "b": verse["b"],
            "c": verse["c"],
            "v": verse["v"],
            "t": verse["t"],
            "pop": verse["pop"],
            "p": page_no,
            "i": word_idx,
            "dp": round(decimal_page, 6),
        })
        cursor += verse["words"]

    manifest = {
        "totalPages": total_pages,
        "pageWidth": PAGE_WIDTH,
        "pageHeight": PAGE_HEIGHT,
        "marginX": MARGIN_X,
        "marginTop": MARGIN_TOP,
        "marginBottom": MARGIN_BOTTOM,
        "gutter": GUTTER,
        "columnWidth": COLUMN_WIDTH,
        "fontSize": FONT_SIZE,
        "lineHeight": LINE_HEIGHT,
        "linesPerColumn": LINES_PER_COLUMN,
        "superscriptScale": SUPERSCRIPT_SCALE,
        "books": book_names,
        "totalVerses": len(verse_pool),
    }

    # The table of contents for Browsing mode: the page each book's text starts
    # on, i.e. the page holding its first verse's first word. Kept out of the
    # manifest on purpose: the manifest is cached as immutable, so a new field
    # there would never reach a browser that already holds the old copy.
    contents = [
        {"book": book_names[entry["b"]], "page": entry["p"]}
        for entry in verse_pool
        if entry["c"] == 1 and entry["v"] == 1
    ]

    print(f"Writing {total_pages} page files to public/bible_pages ...")
    reset_dir(CLIENT_OUT)
    for page in pages:
        write_json(os.path.join(CLIENT_OUT, f"{page['p']}.json"), page)
    write_json(os.path.join(CLIENT_OUT, "manifest.json"), manifest)
    write_json(os.path.join(CLIENT_OUT, "contents.json"), contents)

    # The backend must never depend on the client for page data, so it gets its
    # own on-disk copy that Cloud Functions read with node fs.
    print("Copying page files to functions/src/bible_pages ...")
    reset_dir(FUNCTIONS_OUT)
    for name in os.listdir(CLIENT_OUT):
        shutil.copyfile(os.path.join(CLIENT_OUT, name),
                        os.path.join(FUNCTIONS_OUT, name))

    os.makedirs(os.path.dirname(VERSE_POOL_OUT), exist_ok=True)
    write_json(VERSE_POOL_OUT, verse_pool)

    print("Done.")
    print(f"  public/bible_pages/1..{total_pages}.json")
    print(f"  functions/src/bible_pages/1..{total_pages}.json")
    print(f"  functions/src/verse_pool.json ({len(verse_pool)} verses)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
