import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { startGame, friendlyError } from '@/lib/api';
import { play } from '@/lib/sound';
import PageShell, { PageHeading } from '@/components/wf/PageShell';
import { AlertIcon, ArrowRight, ChevronDown } from '@/components/wf/Icons';
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
/** Endless Practice remembers its own settings, apart from Singleplayer's. */
const PRACTICE_SETTINGS_KEY = 'bibleoguessr:lastPracticeSettings';

function loadRememberedSettings(key) {
  const fallback = {
    popularity: POPULARITY_DEFAULT,
    rounds: ROUND_COUNT_DEFAULT,
    timer: TIMER_DEFAULT,
  };
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const validated = validateGameSettings(JSON.parse(raw));
    return validated.ok ? validated.value : fallback;
  } catch {
    return fallback;
  }
}

function rememberSettings(key, settings) {
  try {
    localStorage.setItem(key, JSON.stringify(settings));
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

/**
 * Game setup, for Singleplayer and for Endless Practice. Practice is the same
 * game with no round count and nothing recorded, so it shares this page minus
 * the Rounds setting.
 */
export default function PlaySetup({ practice = false }) {
  const settingsKey = practice ? PRACTICE_SETTINGS_KEY : SETTINGS_KEY;
  const navigate = useNavigate();

  const remembered = useState(() => loadRememberedSettings(settingsKey))[0];
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

  function changePopularity(value) {
    setPopularity(value);
    play('slide', { value: value / 100 });
  }

  async function handleStart() {
    setError('');

    const validated = validateGameSettings({ popularity, rounds, timer });
    if (!validated.ok) {
      play('error');
      setError(validated.error);
      return;
    }

    setBusy(true);
    try {
      rememberSettings(settingsKey, validated.value);
      // The server draws the verses and keeps them; all we get back is a game
      // id and the text of round one.
      const game = await startGame(
        practice
          ? { popularity: validated.value.popularity, timer: validated.value.timer, mode: 'practice' }
          : validated.value
      );
      navigate(`/game/${game.gameId}`, { state: { game } });
    } catch (err) {
      play('error');
      setError(friendlyError(err));
      setBusy(false);
    }
  }

  return (
    <PageShell width="max-w-[860px]">
      <PageHeading
        crumbs={[{ label: 'Home', to: '/home' }, { label: practice ? 'Endless Practice' : 'Singleplayer' }]}
        title={practice ? 'Endless Practice' : 'Singleplayer'}
      >
        {practice
          ? 'Round after round, for as long as you like. Nothing is counted or recorded.'
          : 'Set the rules, then open the book.'}
      </PageHeading>

      <section aria-label="Game settings" className="wf-tray wf-dark">
        {/* --- 1. Popularity ------------------------------------------------ */}
        <SettingRow number={1}>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="popularity" className="flex items-center gap-2.5 text-lg font-extrabold sm:text-xl">
              <MobileNumber n={1} />
              Verse popularity
            </label>
            <output
              htmlFor="popularity"
              className="min-w-[48px] rounded bg-wf-ink px-2 pb-[3px] pt-1.5 text-center text-xl font-extrabold tabular-nums text-wf-amber sm:min-w-[56px] sm:px-2.5 sm:text-[22px]"
            >
              {popularity}
            </output>
          </div>

          <div className="relative h-11 sm:h-[30px]">
            <input
              id="popularity"
              type="range"
              min={0}
              max={100}
              step={1}
              value={popularity}
              onChange={(e) => changePopularity(Number(e.target.value))}
              aria-describedby="popularity-help"
              className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0"
            />
            <div aria-hidden="true" className="absolute inset-x-0 top-[17px] h-2.5 rounded-[5px] bg-wf-track sm:top-2.5" />
            <div
              aria-hidden="true"
              className="absolute left-0 top-[17px] h-2.5 rounded-l-[5px] bg-wf-cobalt sm:top-2.5"
              style={{ width: `${popularity}%` }}
            />
            <div
              aria-hidden="true"
              className="absolute top-1 -ml-[18px] box-border h-9 w-9 rounded-full border-[3px] border-wf-ink bg-wf-amber transition-transform peer-hover:scale-110 peer-active:scale-110 peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-wf-cobalt sm:top-0 sm:-ml-[15px] sm:h-[30px] sm:w-[30px]"
              style={{ left: `${popularity}%` }}
            />
          </div>

          <div className="flex justify-between text-sm font-bold text-wf-muted">
            <span>Random</span>
            <span>Popular</span>
          </div>
          <p id="popularity-help" className="m-0 text-[15px] leading-[1.45] sm:text-base">
            {popularityDescription(popularity)}
          </p>
        </SettingRow>

        {/* --- 2. Rounds (not in practice, which has none) ------------------- */}
        {!practice && (
        <SettingRow number={2}>
          <span id="rounds-label" className="flex items-center gap-2.5 text-lg font-extrabold sm:text-xl">
            <MobileNumber n={2} />
            Rounds
          </span>
          <div
            role="group"
            aria-labelledby="rounds-label"
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2.5"
          >
            <div className="flex items-stretch">
              <button
                type="button"
                onClick={() => stepRounds(-1)}
                disabled={rounds <= ROUND_COUNT_MIN}
                aria-label="One fewer round"
                data-sound="stepDown"
                className="h-14 w-16 rounded-l box-border border-2 border-wf-ink bg-wf-ink text-[26px] font-extrabold leading-none text-white hover:border-wf-ink2 hover:bg-wf-ink2 disabled:border-wf-ink disabled:bg-wf-off disabled:text-wf-muted sm:h-[52px] sm:w-[52px] sm:text-2xl"
              >
                −
              </button>
              <output
                aria-labelledby="rounds-label"
                aria-live="polite"
                className="box-border grid flex-1 place-items-center border-y-2 border-wf-ink bg-white pt-[3px] text-[30px] font-extrabold tabular-nums sm:w-[72px] sm:flex-none sm:text-[28px]"
              >
                {rounds}
              </output>
              <button
                type="button"
                onClick={() => stepRounds(1)}
                disabled={rounds >= ROUND_COUNT_MAX}
                aria-label="One more round"
                data-sound="stepUp"
                className="h-14 w-16 rounded-r box-border border-2 border-wf-ink bg-wf-ink text-[26px] font-extrabold leading-none text-white hover:border-wf-ink2 hover:bg-wf-ink2 disabled:border-wf-ink disabled:bg-wf-off disabled:text-wf-muted sm:h-[52px] sm:w-[52px] sm:text-2xl"
              >
                +
              </button>
            </div>
            <span className="text-sm text-wf-muted sm:text-[15px]">
              {ROUND_COUNT_MIN}–{ROUND_COUNT_MAX} · up to{' '}
              <b className="text-wf-ink">{(rounds * 5000).toLocaleString()}</b> points
            </span>
          </div>
        </SettingRow>

        )}

        {/* --- 3. Timer (2 in practice) -------------------------------------- */}
        <SettingRow number={practice ? 2 : 3}>
          <label htmlFor="timer" className="flex items-center gap-2.5 text-lg font-extrabold sm:text-xl">
            <MobileNumber n={practice ? 2 : 3} />
            Round timer
          </label>
          {/* The border lives on the wrapper, so the arrow block can fill the inside
              edge exactly — no sliver of white can open up around it. */}
          <div className="relative box-border flex h-14 overflow-hidden rounded border-2 border-wf-ink bg-white has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-wf-cobalt sm:h-[52px] sm:max-w-[360px]">
            <select
              id="timer"
              value={timer}
              onChange={(e) => setTimer(Number(e.target.value))}
              aria-describedby="timer-help"
              className="block h-full w-full cursor-pointer appearance-none border-0 bg-transparent pl-3.5 pr-[60px] pt-[3px] font-wf text-[17px] font-bold text-wf-ink focus-visible:outline-none"
            >
              {TIMER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 grid w-[48px] place-items-center bg-wf-ink sm:w-[44px]"
            >
              <ChevronDown color="#e3a52b" />
            </span>
          </div>
          <p id="timer-help" className="m-0 text-sm leading-[1.45] text-wf-muted sm:text-[15px]">
            {timer === 0
              ? practice
                ? 'Untimed: take as long as you like on each round.'
                : `Untimed: take as long as you like on each round. All ${rounds} rounds still apply.`
              : 'When the clock runs out the round submits automatically and scores zero.'}
          </p>
        </SettingRow>

        {error && (
          <p className="wf-alert-error m-0" role="alert">
            <AlertIcon />
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-[5px] sm:flex-row sm:flex-wrap sm:gap-1.5">
          <Link
            to="/home"
            className="wf-btn-mist h-[52px] text-[17px] sm:h-auto sm:flex-[1_1_160px]"
            style={{ padding: '18px 20px 15px' }}
          >
            Back
          </Link>
          <button
            type="button"
            onClick={handleStart}
            disabled={busy}
            data-sound="submit"
            className="wf-btn-amber wf-btn-lg h-[60px] sm:h-auto sm:flex-[3_1_320px]"
          >
            {busy ? 'Drawing verses…' : 'Start Game'}
            {!busy && <ArrowRight size={20} color="#23262b" />}
          </button>
        </div>
      </section>
    </PageShell>
  );
}

/** One numbered setting: a number tab on desktop, the setting beside it. */
function SettingRow({ number, children }) {
  return (
    <div className="flex items-stretch overflow-hidden rounded bg-wf-mist">
      <div
        aria-hidden="true"
        className="hidden min-h-[72px] flex-[0_0_72px] place-items-center bg-wf-mist2 text-[28px] font-extrabold sm:grid"
      >
        {number}
      </div>
      <div className="flex flex-1 flex-col gap-3 px-3.5 pb-4 pt-3.5 sm:px-6 sm:pb-5 sm:pt-[18px]">
        {children}
      </div>
    </div>
  );
}

/** The step number, shown inline on phones where there is no number tab. */
function MobileNumber({ n }) {
  return (
    <span
      aria-hidden="true"
      className="grid h-7 w-7 place-items-center rounded bg-wf-mist2 pt-0.5 text-[15px] sm:hidden"
    >
      {n}
    </span>
  );
}
