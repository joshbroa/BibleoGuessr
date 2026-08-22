import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { startGame, friendlyError } from '@/lib/api';
import {
  POPULARITY_DEFAULT,
  ROUND_COUNT_DEFAULT,
  ROUND_COUNT_MIN,
  ROUND_COUNT_MAX,
  TIMER_DEFAULT,
  TIMER_OPTIONS,
  validateGameSettings,
} from '@shared/validation';

/**
 * The last configuration the player actually started a game with.
 *
 * Kept so "Play Again" — and simply coming back later — reopens the setup
 * screen the way they left it, rather than resetting to the defaults every
 * time. Validated on read, so a stale or hand-edited value cannot put the form
 * into a state the server would reject.
 */
const SETTINGS_KEY = 'bibleoguessr:lastSettings';

function loadRememberedSettings() {
  const fallback = {
    popularity: POPULARITY_DEFAULT,
    rounds: ROUND_COUNT_DEFAULT,
    timer: TIMER_DEFAULT,
  };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return fallback;
    const validated = validateGameSettings(JSON.parse(raw));
    return validated.ok ? validated.value : fallback;
  } catch {
    return fallback;
  }
}

function rememberSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage being unavailable is not worth blocking a game over.
  }
}

/** Plain-language read of where the popularity slider currently sits. */
function popularityDescription(value) {
  if (value <= 5) return 'Fully random — all 31,102 verses, equally likely.';
  if (value <= 30) return 'Mostly random, with a slight nudge toward familiar verses.';
  if (value <= 60) return 'A balanced mix. Some you will know, plenty you will not.';
  if (value <= 85) return 'Weighted heavily toward well-known verses.';
  return 'Household verses almost every round.';
}

export default function PlaySetup() {
  const navigate = useNavigate();

  const remembered = useState(loadRememberedSettings)[0];
  const [popularity, setPopularity] = useState(remembered.popularity);
  const [rounds, setRounds] = useState(remembered.rounds);
  const [timer, setTimer] = useState(remembered.timer);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function stepRounds(delta) {
    setRounds((current) =>
      Math.min(ROUND_COUNT_MAX, Math.max(ROUND_COUNT_MIN, current + delta))
    );
  }

  async function handleStart() {
    setError('');

    const validated = validateGameSettings({ popularity, rounds, timer });
    if (!validated.ok) {
      setError(validated.error);
      return;
    }

    setBusy(true);
    try {
      rememberSettings(validated.value);
      // The server draws the verses and keeps them; all we get back is a game
      // id and the text of round one.
      const game = await startGame(validated.value);
      navigate(`/game/${game.gameId}`, { state: { game } });
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-1 font-display text-3xl font-bold text-parchment-50">Singleplayer</h1>
        <p className="mb-8 text-parchment-300">Set the rules, then open the book.</p>

        <div className="panel space-y-8 animate-fade-up">
          {/* --- Popularity --------------------------------------------- */}
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor="popularity" className="field-label mb-0">
                Verse Popularity
              </label>
              <span className="font-display tabular-nums text-lg font-bold text-gilt-400">
                {popularity}
              </span>
            </div>
            <input
              id="popularity"
              type="range"
              min={0}
              max={100}
              step={1}
              value={popularity}
              onChange={(e) => setPopularity(Number(e.target.value))}
              className="w-full accent-gilt-500"
              aria-describedby="popularity-help"
            />
            <div className="mt-1 flex justify-between text-xs uppercase tracking-widest text-parchment-400">
              <span>Random</span>
              <span>Popular</span>
            </div>
            <p id="popularity-help" className="mt-2 text-sm text-parchment-300">
              {popularityDescription(popularity)}
            </p>
          </section>

          {/* --- Round count -------------------------------------------- */}
          <section>
            <span className="field-label" id="rounds-label">
              Rounds
            </span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => stepRounds(-1)}
                disabled={rounds <= ROUND_COUNT_MIN}
                className="btn-secondary h-11 w-11 text-xl leading-none"
                aria-label="One fewer round"
              >
                −
              </button>
              <output
                aria-labelledby="rounds-label"
                className="w-16 text-center font-display text-3xl font-bold tabular-nums text-parchment-50"
              >
                {rounds}
              </output>
              <button
                type="button"
                onClick={() => stepRounds(1)}
                disabled={rounds >= ROUND_COUNT_MAX}
                className="btn-secondary h-11 w-11 text-xl leading-none"
                aria-label="One more round"
              >
                +
              </button>
              <span className="ml-2 text-sm text-parchment-400">
                {ROUND_COUNT_MIN}–{ROUND_COUNT_MAX} · up to{' '}
                {(rounds * 5000).toLocaleString()} points
              </span>
            </div>
          </section>

          {/* --- Timer --------------------------------------------------- */}
          <section>
            <label htmlFor="timer" className="field-label">
              Round Timer
            </label>
            <select
              id="timer"
              value={timer}
              onChange={(e) => setTimer(Number(e.target.value))}
              className="field-input"
              aria-describedby="timer-help"
            >
              {TIMER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p id="timer-help" className="mt-2 text-sm text-parchment-300">
              {timer === 0
                ? `Untimed: take as long as you like on each round. All ${rounds} rounds still apply.`
                : 'When the clock runs out the round submits automatically and scores zero.'}
            </p>
          </section>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="btn-secondary flex-1 py-3"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleStart}
              disabled={busy}
              className="btn-primary flex-[2] py-3 text-base"
            >
              {busy ? 'Drawing verses…' : 'Start Game'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
