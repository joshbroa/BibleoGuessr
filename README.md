# BibleoGuessr

GeoGuessr, but for the King James Bible. You are shown a verse with no reference
attached — just the words — and you have to open a 3D Bible at the page you think
it came from. You are scored on how far off you were, measured as physical
distance across the book's page space.

---

## The one idea everything else follows from

Scoring by *physical page distance* only means something if every player sees the
same word on the same page in the same spot. Browsers do not lay out text
identically, so **the browser is never allowed to lay out scripture.**

`scripts/generate_bible_pages.py` typesets the entire KJV once, offline, using
proportional Times font metrics: it decides every line break, every word width
and every inter-word gap, and writes the result as 3,198 immutable page files —
each book opening on a page of its own. The frontend is a painter, not a layout engine — it places pre-measured boxes at
pre-computed positions.

That single decision is what makes the scoring formula meaningful, and it is what
lets the server evaluate a guess it never showed to anybody.

Half marks land at ΔD ≈ 347 pages; beyond 2,000 pages a guess is worth nothing.

**Verified in-browser:** every rendered word matches its stored width to within
0.013px, and justified lines total 150.00 ± 0.01 units against a 150-unit column.

---

## Anti-cheat

The target verse never exists in client-side state. Concretely:

| Layer | Guarantee |
| --- | --- |
| Wire | `startGame` returns 370 bytes: game id, settings, and the round's verse **text**. No book, chapter, verse, page or word index. |
| Database | `/games` holds the secret targets and is `allow read, write: if false` — unreadable even by the player who owns it. |
| Evaluation | The client submits `{page, wordIndex}`. The server resolves that against its own copy of the page files and decides what was clicked and what it scored. |
| Timing | The round clock is anchored to a server timestamp, so reloading cannot reset it and stalling past the limit scores zero regardless of what the client's countdown did. |
| Sequencing | The round index lives on the server. A replayed or reordered submission cannot answer a round twice or skip ahead. |

## Scoring

A word's position is a decimal page number:

```
decimal page = page number + (word index within page / words on that page)
ΔD           = |target decimal page − guess decimal page|

ΔD > 2000  ->  0
otherwise  ->  round(5000 · e^(−0.002 · ΔD))
```

`functions/shared/scoring.js` is imported by **both** the Cloud Functions and the
React client (via the `@shared` alias), so the score the client animates cannot
drift from the score the server computed. The server stays authoritative — the
client only ever renders numbers it was given.

## Verse selection

Every verse carries a 1–100 popularity score on a Gaussian curve derived from
OpenBible topical vote data. The setup slider maps onto it exponentially, with
the slider position raised to a power so the low and middle range stay gentle:

```
k = 20 · (slider/100)^1.5        weight(verse) ∝ e^(k · popularity/100)
```

| Slider | Mean popularity drawn | Share from the ~500 best-known verses |
| ---: | ---: | ---: |
| 0 | 50 | 1.7% (the natural base rate — a true uniform draw over all 31,102) |
| 50 | 69 | 16% |
| 100 | 91 | 77% |

Weighting is done over 100 popularity buckets rather than 31,102 verses — the
same distribution, ~300× cheaper — and draws use `crypto.randomInt`, because a
predictable PRNG stream would let a player forecast future rounds.

---

## Setup

```bash
npm install && (cd functions && npm install)
```

Copy `.env.example` to `.env.local` and fill in your Firebase web config.

Generate the page data (~40MB, gitignored, takes about a minute):

```bash
npm run pages
```

This writes `public/bible_pages/{1..3198}.json` for the client **and** copies them
to `functions/src/bible_pages/` so Cloud Functions can score guesses from local
disk with `fs` — no network hop, and no dependence on anything the client sends.

## Running

```bash
npm run dev
```

This starts the **whole stack**: the Firebase emulator suite (Auth, Firestore,
Functions) and the Vite dev server pointed at it. One command, and the game is
playable. Ctrl+C shuts both down. Requires Java, for the Firestore emulator.

The game cannot function without its backend — the verses, the scoring and the
answers all live in Cloud Functions — so running the emulators is the default
rather than an opt-in. Firestore is deliberately on **port 8088** rather than the
default 8080; the app and `firebase.json` must agree on this.

Emulator data (accounts, game history) is in-memory and resets on each restart.

To point the dev server at the **deployed** project instead:

```bash
npm run dev:live
```

That only works once the functions are actually deployed. If they are not, the
app says so plainly rather than failing with an opaque CORS error — a callable
aimed at a function that does not exist gets a 404 with no CORS headers, which
the browser reports as a CORS violation and which is otherwise miserable to
diagnose.

## Testing

```bash
npm test
```

70 tests. Beyond the usual unit coverage of scoring and validation, the suite
asserts the integrity of the generated page data: that word indices are
sequential with no gaps or duplicates, that justified lines sum exactly to the
column width, that no column overflows its line budget, and that every verse's
stored decimal page matches where its first word actually sits. If the typesetter
ever drifts, guesses silently stop being scored against what players see —
nothing else in the codebase would notice, so these tests are the guard.

## Deploying

```bash
npm run pages          # page data must exist before deploying functions
npm run deploy         # build + hosting + functions + rules
```

Every Cloud Function declares `maxInstances: 10` — set both globally and
per-function — so a traffic spike or a deliberate flood cannot fan out into a
runaway bill.

---

## Layout

```
scripts/generate_bible_pages.py   The typesetter. Source of truth for the page array.
bible_data/                       Raw KJV + popularity pipeline (pre-existing).

src/
  context/AuthContext.jsx         Anonymous auth, and credential linking on signup.
  context/GameContext.jsx         Game state, position in the book, submission.
  components/bible/
    ClosedBible3D.jsx             Phase 1: R3F book seen edge-on; cursor → page,
                                  drag to yaw the book (camera never moves).
    BibleSpread.jsx               Phase 2: two-page spread, GSAP folds, 6-page window.
                                  Turns commit on release and animate independently,
                                  so folds overlap and the book can be riffled.
    BiblePage.jsx                 Paints one pre-typeset page.
  lib/pageCache.js                Sliding window fetching.

functions/
  index.js                        Callables. All maxInstances: 10.
  lib/game.js                     Verse selection and guess evaluation.
  lib/bibleData.js                Local page-file access.
  shared/                         Scoring + validation, shared with the client.
```

### Guest accounts

Guests play immediately under Firebase Anonymous Auth. Signing up **links** the
email credential onto the existing anonymous user rather than creating a new one,
so the uid is preserved — and because every history document is keyed by uid, the
guest's games transfer to the new account with no copying and no migration window
where records could be lost.

### Translation

KJV only, and deliberately so. It is public domain; modern translations (ESV,
NIV, NASB) prohibit distributing full-text databases in an app.
