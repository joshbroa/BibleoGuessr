# BibleoGuessr

**GeoGuessr, but for the Bible.** You're shown a verse from the King James Bible
with no reference attached, just the words. Open a 3D Bible to the page you think
it came from and click the verse. The closer you land, the more points you score.

**▶ Play it at [bibleoguessr.com](https://bibleoguessr.com)** with no sign-up
needed. You can play as a guest straight away.

<!-- GIF 1 (hero): replace this comment with the line below once the file exists.
![A full round of BibleoGuessr](docs/media/hero.gif)
-->

---

## How to play

1. **Choose your settings.** Pick how well known the verses should be, how many
   rounds to play (1–15) and how long you get per round (10 seconds to
   untimed).
2. **Read the verse.** Only the text is shown. There's no book, chapter or verse
   number.
3. **Find the page.** Move along the closed Bible to choose roughly where to open
   it, then turn pages until you find the passage.
4. **Click the verse.** Your guess is scored by how many pages away you were.
   A perfect guess is worth 5,000 points.
5. **See how you did.** Each round shows where the verse really was. At the end
   you get a summary of the whole game.

<!-- GIF 2 (choosing a page): replace this comment with the line below once the file exists.
![Choosing a page on the closed 3D Bible](docs/media/choose-page.gif)
-->

<!-- GIF 3 (turning pages and guessing): replace this comment with the line below once the file exists.
![Turning pages and clicking a verse](docs/media/turn-and-guess.gif)
-->

<!-- GIF 4 (result): replace this comment with the line below once the file exists.
![The round result screen](docs/media/result.gif)
-->

## Features

- **Interactive 3D Bible** with animated page turns that you can flick through
  quickly.
- **Difficulty slider** that ranges from famous verses (John 3:16) to obscure
  ones from anywhere in the 31,102.
- **Guest play.** Start a game instantly. If you sign up later, your guest games
  move to your new account.
- **Accounts** with email verification, password reset, game history and
  usernames.
- **Cheat-resistant scoring.** The answer never reaches your browser, so it
  can't be found by inspecting the page.

## Built with

| Area | Tools |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS, Three.js (React Three Fiber), GSAP |
| Backend | Firebase: Authentication, Firestore, Cloud Functions |
| Hosting | Vercel for the site, Firebase for the backend |
| Testing | Vitest, Testing Library |
| Data prep | Python (offline typesetting and verse popularity) |

---

## How it works

### Every player sees exactly the same pages

Scoring by page distance only works if a verse is on the same page, in the same
place, for everyone. Browsers don't lay out text identically, so the browser is
**never allowed to lay out the Bible text**.

Instead, [`scripts/generate_bible_pages.py`](scripts/generate_bible_pages.py)
typesets the whole Bible once, offline. It decides every line break and the
position of every word, and saves the result as 3,198 fixed page files. The
website just draws words at positions that were worked out in advance.

### Scoring

Each word has a decimal page number. Half-way down page 120 is roughly 120.5.

```
decimal page = page number + (word position on page / words on that page)
distance     = |answer decimal page − guess decimal page|

score = round(5000 × e^(−0.002 × distance))    (0 if more than 2,000 pages off)
```

You get half marks for being about 350 pages away. The same scoring code
([`functions/shared/scoring.js`](functions/shared/scoring.js)) runs on the server
and in the browser, so the score you see always matches the one that was saved.

### Keeping the answer secret

The server holds the answer and never sends it to the browser:

- Starting a game sends back only the verse **text**: no book, chapter, page or
  position.
- Games are stored in a Firestore collection that the browser is not allowed to
  read at all ([`firestore.rules`](firestore.rules)).
- The browser sends only the page and word that were clicked. The server works
  out the score from its own copy of the pages.
- The round timer and the current round number are tracked on the server, so
  reloading the page, resubmitting or skipping ahead doesn't help.

### Choosing verses

Every verse has a popularity score from 1 to 100, based on community votes from
[OpenBible.info](https://www.openbible.info/topics/). The difficulty slider
controls how strongly the draw favours popular verses. All the way down picks
evenly from the entire Bible; all the way up mostly picks well-known verses.
Verses are drawn with a cryptographically secure random number generator, so
future rounds can't be predicted.

### Guest accounts

Guests play using Firebase anonymous sign-in. When a guest signs up, their email
and password are *linked* to the same account rather than a new one being
created. Their game history is filed under that account, so it carries over
automatically.

---

## Running it locally

**You'll need:** Node.js 22, Python 3, Java (for the Firestore emulator), the
[Firebase CLI](https://firebase.google.com/docs/cli) and a Firebase project of
your own.

1. Install dependencies:

   ```bash
   npm install
   cd functions && npm install && cd ..
   ```

2. Copy `.env.example` to `.env.local` and fill in your Firebase web app
   config.

3. Generate the page data (about 40 MB, takes around a minute):

   ```bash
   npm run pages
   ```

4. Start everything:

   ```bash
   npm run dev
   ```

   This runs the Firebase emulators (Auth, Firestore, Functions) and the Vite dev
   server together, so the whole game works locally without touching a real
   project. Emulator data resets each time you restart.

## Testing

```bash
npm test
```

The test suite covers scoring, input validation, redirect safety and page
caching. It also checks the generated page data itself: that word positions
have no gaps, that every justified line fills its column exactly, and that each
verse's stored page matches where it actually appears. If the typesetter ever
changed by accident, these tests would catch it before players were scored
against the wrong pages.

## Deploying

The site is deployed on Vercel, which rebuilds automatically on every push to
`main`. The backend is deployed to Firebase:

```bash
npm run deploy:rules       # Firestore security rules and indexes
npm run deploy:functions   # Cloud Functions
```

[DEPLOYMENT.md](DEPLOYMENT.md) has the full first-time setup: Firebase, Vercel,
the custom domain, email settings and a launch checklist.

## Project structure

```
scripts/            Offline typesetter that builds the page files
bible_data/         KJV text and the verse popularity pipeline
src/
  pages/            One component per screen
  components/bible/ The 3D closed Bible, the open page spread and page rendering
  context/          Sign-in state and in-game state
  lib/              API calls, page caching and site settings
functions/
  index.js          Cloud Functions (start game, submit guess, accounts)
  lib/              Verse selection and guess checking
  shared/           Scoring and validation, shared with the frontend
firestore.rules     Database security rules
```

---

## About this project

I built BibleoGuessr to learn how to take a web app all the way to production:
hosting on Vercel, accounts and data on Firebase, a custom domain with its own
email, and GitHub for version control and automatic deployments.

I built it with AI coding tools (Claude Code), writing the specifications,
reviewing the changes, and checking the results with automated tests and
hands-on play testing.

## Credits

- **Bible text:** King James Version (1611).
- **Verse popularity:** derived from topical vote data by
  [OpenBible.info](https://www.openbible.info/topics/), used under its Creative
  Commons Attribution (CC BY) licence.
