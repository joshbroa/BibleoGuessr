/**
 * Input validation and sanitisation.
 *
 * SHARED MODULE — imported by both the Cloud Functions and the React client via
 * the `@shared` alias.
 *
 * The client copy exists purely to give fast, friendly feedback in forms. It is
 * NOT a security boundary: every function in `functions/index.js` re-runs these
 * same checks on the server before touching Firestore, because anything a
 * browser validates a determined caller can skip.
 */

// ---------------------------------------------------------------------------
// Sanitisation
// ---------------------------------------------------------------------------

// C0/C1 control characters, zero-width characters, and the Unicode
// direction-override characters that are a classic way to disguise what a
// string really says. eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;

// Characters that only ever appear in an injection attempt in these fields.
const MARKUP_CHARS = /[<>"'`\\]/g;

/**
 * Strip anything that could carry markup, script or invisible payload out of a
 * free-text field, then normalise whitespace and clamp the length.
 *
 * React already escapes interpolated text, so this is defence in depth: it stops
 * hostile strings from ever reaching Firestore, where they might later be read
 * by some other consumer that is not an escaping renderer.
 *
 * @param {unknown} value
 * @param {number} maxLength
 * @returns {string}
 */
export function sanitizeText(value, maxLength = 200) {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFKC')
    .replace(CONTROL_CHARS, '')
    .replace(MARKUP_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/** Coerce to a finite integer inside [min, max], or return null if impossible. */
export function sanitizeInt(value, min, max) {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < min || rounded > max) return null;
  return rounded;
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function validateEmail(raw) {
  const email = sanitizeText(raw, 254).toLowerCase();
  if (!email) return { ok: false, error: 'Enter your email address.' };
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'That does not look like a valid email address.' };
  return { ok: true, value: email };
}

// ---------------------------------------------------------------------------
// Password
// ---------------------------------------------------------------------------

export const PASSWORD_MIN_LENGTH = 8;

/** Human-readable summary of the password rules, shown under the input. */
export const PASSWORD_RULE_TEXT =
  'At least 8 characters, including a letter, a number and a special character.';

/**
 * Minimum 8 characters, mixing letters, digits and at least one special
 * character.
 *
 * Passwords are deliberately NOT sanitised: every character is meaningful, and
 * the value goes straight to Firebase Auth over HTTPS. It is never written to
 * Firestore, never logged, and never passed to a Cloud Function of ours.
 */
export function validatePassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    return { ok: false, error: 'Enter a password.' };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { ok: false, error: 'Password must contain at least one letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, error: 'Password must contain at least one number.' };
  }
  // Anything that is not a letter or a digit counts, spaces included.
  if (!/[^A-Za-z0-9]/.test(password)) {
    return {
      ok: false,
      error: 'Password must contain at least one special character (for example ! ? # or -).',
    };
  }
  if (password.length > 128) {
    return { ok: false, error: 'Password must be 128 characters or fewer.' };
  }
  return { ok: true, value: password };
}

// ---------------------------------------------------------------------------
// Username
// ---------------------------------------------------------------------------

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

/** Letters, digits and underscore only — no special characters, no spaces. */
export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

/**
 * Words blocked wherever they appear inside a username. These are unambiguous
 * enough that any word containing them is also objectionable.
 */
const PROFANITY_SUBSTRING = [
  'arsehole', 'asshole', 'bastard', 'bitch', 'blowjob', 'bollock', 'cunt', 'dildo', 'fuck', 'goatse',
  'hitler', 'jizz', 'kike', 'nazi', 'nigg', 'nonce', 'porn', 'pussy', 'rapist',
  'retard', 'schlong', 'shit', 'slut', 'twat', 'vagina', 'wank', 'whore',
];

/**
 * Words blocked only when they stand alone as a token.
 *
 * Matching these as substrings would be worse than useless in a Bible app:
 * `tit` sits inside Titus, `ass` inside Cassidy, `cock` inside Hitchcock. So
 * they only match a whole token — `xX_tits_Xx` is rejected, `Titus_99` is not.
 */
const PROFANITY_TOKEN = [
  'anal', 'anus', 'arse', 'ass', 'boob', 'bugger', 'cock', 'coon', 'cum',
  'dick', 'dyke', 'fag', 'paki', 'penis', 'piss', 'prick', 'queer', 'rape',
  'semen', 'sex', 'spic', 'tit', 'tosser',
];

/** Reserved names that would let a user impersonate the app or its staff. */
const RESERVED = [
  'admin', 'administrator', 'bibleoguessr', 'god', 'moderator', 'mod',
  'official', 'root', 'staff', 'support', 'system',
];

const LEET_MAP = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', $: 's', '@': 'a' };

/** Map leetspeak digits back to the letters they stand in for. */
function foldLeetspeak(value) {
  return value
    .toLowerCase()
    .split('')
    .map((ch) => LEET_MAP[ch] ?? ch)
    .join('');
}

/**
 * The forms a username has to be checked against.
 *
 * `stripped` catches plain and leetspeak spellings; `collapsed` additionally
 * catches padded ones like `fuuuck`, which `stripped` would miss.
 */
function foldedForms(username) {
  const stripped = foldLeetspeak(username).replace(/[^a-z]/g, '');
  return [stripped, stripped.replace(/(.)\1+/g, '$1')];
}

/** Individual words within a username, split on underscores and digits. */
function usernameTokens(username) {
  return foldLeetspeak(username)
    .split(/[^a-z]+/)
    .filter(Boolean)
    .flatMap((token) => [token, token.replace(/s$/, '')]);
}

/**
 * Validate a candidate username against shape, profanity and reserved-word
 * rules. Uniqueness is a database question and is checked separately, server
 * side, against the `/usernames` collection.
 *
 * @returns {{ok: true, value: string} | {ok: false, error: string}}
 */
export function validateUsername(raw) {
  const username = sanitizeText(raw, USERNAME_MAX_LENGTH * 2);

  if (!username) {
    return { ok: false, error: 'Enter a username.' };
  }
  if (username.length < USERNAME_MIN_LENGTH) {
    return { ok: false, error: `Username must be at least ${USERNAME_MIN_LENGTH} characters.` };
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return { ok: false, error: `Username must be ${USERNAME_MAX_LENGTH} characters or fewer.` };
  }
  if (!USERNAME_RE.test(username)) {
    return { ok: false, error: 'Username may only contain letters, numbers and underscores.' };
  }

  const forms = foldedForms(username);
  const tokens = usernameTokens(username);

  if (PROFANITY_SUBSTRING.some((word) => forms.some((form) => form.includes(word)))) {
    return { ok: false, error: 'That username is not allowed. Please choose another.' };
  }
  if (PROFANITY_TOKEN.some((word) => tokens.includes(word) || forms.includes(word))) {
    return { ok: false, error: 'That username is not allowed. Please choose another.' };
  }
  if (RESERVED.some((word) => forms.includes(word))) {
    return { ok: false, error: 'That username is reserved. Please choose another.' };
  }

  return { ok: true, value: username };
}

/** Lowercased key used as the document id in `/usernames`, for case-insensitive uniqueness. */
export function usernameKey(username) {
  return username.toLowerCase();
}

// ---------------------------------------------------------------------------
// Username change cooldown
// ---------------------------------------------------------------------------

/** A username may only be changed once every two weeks. */
export const USERNAME_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * @param {number|null} lastChangedMs epoch ms of the last username change
 * @param {number} nowMs
 * @returns {{allowed: boolean, remainingMs: number}}
 */
export function usernameCooldown(lastChangedMs, nowMs = Date.now()) {
  if (!lastChangedMs) return { allowed: true, remainingMs: 0 };
  const elapsed = nowMs - lastChangedMs;
  if (elapsed >= USERNAME_COOLDOWN_MS) return { allowed: true, remainingMs: 0 };
  return { allowed: false, remainingMs: USERNAME_COOLDOWN_MS - elapsed };
}

/** Human-readable "3 days, 4 hours" style remainder for the cooldown message. */
export function formatDuration(ms) {
  const totalMinutes = Math.ceil(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (hours) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (!days && minutes) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  return parts.join(', ') || 'less than a minute';
}

// ---------------------------------------------------------------------------
// Game settings
// ---------------------------------------------------------------------------

export const ROUND_COUNT_MIN = 1;
export const ROUND_COUNT_MAX = 15;
export const ROUND_COUNT_DEFAULT = 5;

export const POPULARITY_MIN = 0;
export const POPULARITY_MAX = 100;
export const POPULARITY_DEFAULT = 50;

/** Timer options in seconds. `0` means untimed. */
export const TIMER_OPTIONS = [
  { value: 10, label: '10 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 180, label: '3 minutes' },
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
  { value: 0, label: 'Untimed' },
];

export const TIMER_DEFAULT = 180;

const TIMER_VALUES = TIMER_OPTIONS.map((option) => option.value);

/**
 * Validate and normalise a game configuration. Called by the setup form and
 * again, authoritatively, by the `startGame` Cloud Function.
 *
 * @returns {{ok: true, value: {popularity: number, rounds: number, timer: number}}
 *          | {ok: false, error: string}}
 */
export function validateGameSettings(raw) {
  const popularity = sanitizeInt(raw?.popularity, POPULARITY_MIN, POPULARITY_MAX);
  if (popularity === null) {
    return { ok: false, error: 'Popularity must be between 0 and 100.' };
  }

  const rounds = sanitizeInt(raw?.rounds, ROUND_COUNT_MIN, ROUND_COUNT_MAX);
  if (rounds === null) {
    return { ok: false, error: `Rounds must be between ${ROUND_COUNT_MIN} and ${ROUND_COUNT_MAX}.` };
  }

  const timer = sanitizeInt(raw?.timer, 0, 600);
  if (timer === null || !TIMER_VALUES.includes(timer)) {
    return { ok: false, error: 'Choose a valid round timer.' };
  }

  return { ok: true, value: { popularity, rounds, timer } };
}
