import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  sanitizeInt,
  validateEmail,
  validatePassword,
  validateUsername,
  validateGameSettings,
  usernameCooldown,
  usernameKey,
  USERNAME_COOLDOWN_MS,
} from '@shared/validation';

describe('sanitizeText', () => {
  it('strips markup characters that could carry an injection', () => {
    expect(sanitizeText('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
    expect(sanitizeText('Bob" onload="evil()')).toBe('Bob onload=evil()');
  });

  it('strips control and direction-override characters', () => {
    expect(sanitizeText('ad\u0000min\u202E')).toBe('admin');
    expect(sanitizeText('zero\u200Bwidth')).toBe('zerowidth');
  });

  it('collapses whitespace, trims and clamps length', () => {
    expect(sanitizeText('  a   b  ')).toBe('a b');
    expect(sanitizeText('x'.repeat(500), 10)).toHaveLength(10);
  });

  it('returns an empty string for non-strings', () => {
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(42)).toBe('');
    expect(sanitizeText({})).toBe('');
  });
});

describe('sanitizeInt', () => {
  it('accepts in-range numbers and numeric strings', () => {
    expect(sanitizeInt(5, 1, 15)).toBe(5);
    expect(sanitizeInt('5', 1, 15)).toBe(5);
    expect(sanitizeInt(5.4, 1, 15)).toBe(5);
  });

  it('rejects out-of-range and non-numeric input', () => {
    expect(sanitizeInt(0, 1, 15)).toBeNull();
    expect(sanitizeInt(16, 1, 15)).toBeNull();
    expect(sanitizeInt('abc', 1, 15)).toBeNull();
    expect(sanitizeInt(NaN, 1, 15)).toBeNull();
  });
});

describe('validateEmail', () => {
  it('accepts and lowercases a normal address', () => {
    expect(validateEmail('Player@Example.COM')).toEqual({ ok: true, value: 'player@example.com' });
  });

  it('rejects malformed addresses', () => {
    ['', 'nope', 'a@b', 'a@@b.com', 'a b@c.com'].forEach((input) => {
      expect(validateEmail(input).ok).toBe(false);
    });
  });
});

describe('validatePassword', () => {
  it('accepts 8+ characters with a letter, a number and a special character', () => {
    expect(validatePassword('Passw0rd!').ok).toBe(true);
    expect(validatePassword('abc12345-').ok).toBe(true);
    expect(validatePassword('a1 spaced').ok).toBe(true); // a space is special enough
  });

  it('rejects passwords that are too short', () => {
    expect(validatePassword('Ab1!').ok).toBe(false);
    expect(validatePassword('').ok).toBe(false);
  });

  it('requires each character class', () => {
    expect(validatePassword('12345678!').ok).toBe(false); // no letter
    expect(validatePassword('alphabetic!').ok).toBe(false); // no number
    expect(validatePassword('abc12345').ok).toBe(false); // no special character
  });

  it('names the class that is missing', () => {
    expect(validatePassword('abc12345').error).toMatch(/special character/i);
    expect(validatePassword('alphabetic!').error).toMatch(/number/i);
    expect(validatePassword('12345678!').error).toMatch(/letter/i);
  });

  it('does not alter the password it accepts', () => {
    const raw = '  Sp aces1  <>&  ';
    expect(validatePassword(raw).value).toBe(raw);
  });
});

describe('validateUsername', () => {
  it('accepts letters, numbers and underscores', () => {
    expect(validateUsername('Reader_99')).toEqual({ ok: true, value: 'Reader_99' });
  });

  it('rejects special characters and spaces', () => {
    ['bad name', 'bad-name', 'bad.name', 'bad@name', 'bad!'].forEach((input) => {
      expect(validateUsername(input).ok).toBe(false);
    });
  });

  it('enforces the length bounds', () => {
    expect(validateUsername('ab').ok).toBe(false);
    expect(validateUsername('a'.repeat(21)).ok).toBe(false);
    expect(validateUsername('abc').ok).toBe(true);
  });

  it('blocks profanity, including leetspeak and padded spellings', () => {
    ['shit', 'sh1t', 'FuCk99', 'fuuuck', 'a55hole'].forEach((input) => {
      expect(validateUsername(input).ok).toBe(false);
    });
  });

  it('does not reject innocent names that merely contain a short blocked word', () => {
    // Titus is a book of the Bible; blocking it would be an own goal.
    ['Titus', 'Titus_99', 'Cassidy', 'Hitchcock', 'Essex_Reader'].forEach((input) => {
      expect(validateUsername(input).ok).toBe(true);
    });
  });

  it('still blocks short words when they stand alone as a token', () => {
    ['tit', 'xX_tits_Xx', 'big_ass', 'c0ck'].forEach((input) => {
      expect(validateUsername(input).ok).toBe(false);
    });
  });

  it('blocks names that impersonate the app or its staff', () => {
    expect(validateUsername('admin').ok).toBe(false);
    expect(validateUsername('Support').ok).toBe(false);
    expect(validateUsername('bibleoguessr').ok).toBe(false);
  });

  it('keys uniqueness case-insensitively', () => {
    expect(usernameKey('ReAdEr')).toBe('reader');
  });
});

describe('usernameCooldown', () => {
  const now = 1_700_000_000_000;

  it('allows a first-time claim', () => {
    expect(usernameCooldown(null, now).allowed).toBe(true);
  });

  it('blocks a change inside two weeks', () => {
    const result = usernameCooldown(now - USERNAME_COOLDOWN_MS + 60_000, now);
    expect(result.allowed).toBe(false);
    expect(result.remainingMs).toBe(60_000);
  });

  it('allows a change once two weeks have passed', () => {
    expect(usernameCooldown(now - USERNAME_COOLDOWN_MS, now).allowed).toBe(true);
  });
});

describe('validateGameSettings', () => {
  it('accepts the defaults', () => {
    expect(validateGameSettings({ popularity: 50, rounds: 5, timer: 180 })).toEqual({
      ok: true,
      value: { popularity: 50, rounds: 5, timer: 180 },
    });
  });

  it('accepts untimed play', () => {
    expect(validateGameSettings({ popularity: 0, rounds: 1, timer: 0 }).ok).toBe(true);
  });

  it('enforces the 1–15 round bounds', () => {
    expect(validateGameSettings({ popularity: 50, rounds: 0, timer: 180 }).ok).toBe(false);
    expect(validateGameSettings({ popularity: 50, rounds: 16, timer: 180 }).ok).toBe(false);
    expect(validateGameSettings({ popularity: 50, rounds: 15, timer: 180 }).ok).toBe(true);
  });

  it('rejects a timer that is not one of the offered options', () => {
    expect(validateGameSettings({ popularity: 50, rounds: 5, timer: 45 }).ok).toBe(false);
    expect(validateGameSettings({ popularity: 50, rounds: 5, timer: 99999 }).ok).toBe(false);
  });

  it('rejects an out-of-range popularity slider', () => {
    expect(validateGameSettings({ popularity: -1, rounds: 5, timer: 180 }).ok).toBe(false);
    expect(validateGameSettings({ popularity: 101, rounds: 5, timer: 180 }).ok).toBe(false);
  });
});
