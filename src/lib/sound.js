/**
 * Sound effects.
 *
 * Every sound is synthesised live with the Web Audio API: no audio files at
 * all, so nothing to download, license or fail to decode. Nothing here may ever
 * throw into the game.
 *
 * Browsers refuse to start audio before the first user gesture, so the context
 * is created lazily and resumed by `unlockAudio`, which the app wires to the
 * first pointer or key press.
 */

const STORAGE_KEY = 'bibleoguessr:sound';
const MASTER_VOLUME = 0.55;

/** Minimum gap between two plays of the same sound, in milliseconds. */
const THROTTLE_MS = {
  click: 40,
  tick: 30,
  hover: 45,
  slide: 28,
  edgeScrub: 22,
  countTick: 32,
  pageTurn: 55,
  riffle: 120,
  timerTick: 300,
};

// ---------------------------------------------------------------------------
// Preference
// ---------------------------------------------------------------------------

function readPreference() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

let enabled = readPreference();
const listeners = new Set();

export function isSoundEnabled() {
  return enabled;
}

export function setSoundEnabled(next) {
  enabled = Boolean(next);
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Storage being unavailable only means the choice is not remembered.
  }
  if (master && context) {
    master.gain.setTargetAtTime(enabled ? MASTER_VOLUME : 0, context.currentTime, 0.02);
  }
  listeners.forEach((listener) => listener(enabled));
}

/** Be told when the setting changes. Returns the unsubscribe function. */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---------------------------------------------------------------------------
// Audio graph
// ---------------------------------------------------------------------------

let context = null;
let master = null;
let noiseBuffer = null;

function audioContextClass() {
  if (typeof window === 'undefined') return null;
  return window.AudioContext || window.webkitAudioContext || null;
}

function ensureContext() {
  if (context) return context;
  const Ctor = audioContextClass();
  if (!Ctor) return null;
  try {
    context = new Ctor();
    master = context.createGain();
    master.gain.value = enabled ? MASTER_VOLUME : 0;
    master.connect(context.destination);
  } catch {
    context = null;
    master = null;
  }
  return context;
}

/** Call from a user gesture: creates or resumes the audio context. */
export function unlockAudio() {
  const ctx = ensureContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume?.().catch?.(() => {});
}

function getNoise(ctx) {
  if (noiseBuffer) return noiseBuffer;
  const length = Math.floor(ctx.sampleRate * 1.2);
  noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

/**
 * One enveloped oscillator note.
 * @param {object} o
 * @param {number} o.freq      start frequency, Hz
 * @param {number} [o.to]      glide to this frequency over the note
 * @param {string} [o.type]    oscillator waveform
 * @param {number} [o.gain]    peak level
 * @param {number} [o.attack]  seconds to peak
 * @param {number} [o.decay]   seconds from peak to silence
 * @param {number} [o.at]      start offset from now, seconds
 */
function tone(ctx, out, { freq, to, type = 'sine', gain = 0.2, attack = 0.004, decay = 0.12, at = 0 }) {
  const start = ctx.currentTime + at;
  const end = start + attack + decay;

  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), end);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(env);
  env.connect(out);
  osc.start(start);
  osc.stop(end + 0.02);
}

/**
 * A burst of filtered noise: paper, breath, friction.
 * @param {object} o
 * @param {number} o.duration  seconds
 * @param {string} [o.filter]  biquad type
 * @param {number} o.from      filter frequency at the start
 * @param {number} [o.to]      filter frequency at the end
 * @param {number} [o.q]       filter resonance
 * @param {number} [o.gain]    peak level
 * @param {number} [o.attack]  seconds to peak
 * @param {number} [o.at]      start offset from now, seconds
 */
function noise(ctx, out, { duration, filter = 'bandpass', from, to, q = 0.9, gain = 0.2, attack = 0.01, at = 0 }) {
  const start = ctx.currentTime + at;
  const end = start + duration;

  const source = ctx.createBufferSource();
  source.buffer = getNoise(ctx);
  // Start each burst at a random point in the buffer so no two sound alike.
  const offset = Math.random() * 0.6;

  const shaper = ctx.createBiquadFilter();
  shaper.type = filter;
  shaper.Q.value = q;
  shaper.frequency.setValueAtTime(from, start);
  if (to) shaper.frequency.exponentialRampToValueAtTime(Math.max(to, 1), end);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, end);

  source.connect(shaper);
  shaper.connect(env);
  env.connect(out);
  source.start(start, offset, duration + 0.05);
  source.stop(end + 0.05);
}

/**
 * Noise through a band-pass filter whose centre rises then falls — the
 * "swish" of a sheet of paper moving through the air.
 */
function swish(ctx, out, { at = 0, duration = 0.24, low = 900, peak = 3400, end = 1300, gain = 0.12 }) {
  const start = ctx.currentTime + at;
  const top = start + duration * 0.38;
  const stop = start + duration;

  const source = ctx.createBufferSource();
  source.buffer = getNoise(ctx);

  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 0.55;
  band.frequency.setValueAtTime(low, start);
  band.frequency.exponentialRampToValueAtTime(peak, top);
  band.frequency.exponentialRampToValueAtTime(end, stop);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, top);
  env.gain.exponentialRampToValueAtTime(0.0001, stop);

  source.connect(band);
  band.connect(env);
  env.connect(out);
  source.start(start, Math.random() * 0.6, duration + 0.05);
  source.stop(stop + 0.05);
}

/** Note frequency from semitones above A4. */
const note = (semitones) => 440 * 2 ** (semitones / 12);

// ---------------------------------------------------------------------------
// The voices
// ---------------------------------------------------------------------------

const VOICES = {
  /**
   * A button or link press: a short, warm wooden "tock" — two inharmonic
   * partials like a struck marimba bar, a felt-soft body underneath, and a
   * slight random tuning so a run of presses never sounds machine-identical.
   */
  click(ctx, out) {
    const pitch = 560 * (0.97 + Math.random() * 0.06);
    tone(ctx, out, { freq: pitch, to: pitch * 0.94, type: 'sine', gain: 0.16, attack: 0.002, decay: 0.07 });
    tone(ctx, out, { freq: pitch * 3.93, type: 'sine', gain: 0.035, attack: 0.001, decay: 0.025 });
    tone(ctx, out, { freq: 170, to: 120, type: 'sine', gain: 0.07, attack: 0.002, decay: 0.05 });
    noise(ctx, out, { duration: 0.012, filter: 'bandpass', from: 1800, q: 1.4, gain: 0.03, attack: 0.001 });
  },

  /** A small detent: dropdown changes, generic ticks. `pitch` scales it. */
  tick(ctx, out, { pitch = 1 } = {}) {
    tone(ctx, out, { freq: 2200 * pitch, type: 'sine', gain: 0.07, decay: 0.03, attack: 0.002 });
  },

  /** Passing over something you could choose. */
  hover(ctx, out) {
    tone(ctx, out, { freq: 1700, type: 'sine', gain: 0.03, decay: 0.025, attack: 0.002 });
  },

  /** A slider moving; `value` (0–1) raises the pitch as it climbs. */
  slide(ctx, out, { value = 0.5 } = {}) {
    tone(ctx, out, { freq: 700 + value * 1100, type: 'triangle', gain: 0.06, decay: 0.03, attack: 0.002 });
  },

  stepUp(ctx, out) {
    tone(ctx, out, { freq: 520, to: 700, type: 'triangle', gain: 0.13, decay: 0.08 });
  },

  stepDown(ctx, out) {
    tone(ctx, out, { freq: 620, to: 440, type: 'triangle', gain: 0.13, decay: 0.08 });
  },

  /** Menus and dialogs opening. */
  menuOpen(ctx, out) {
    noise(ctx, out, { duration: 0.14, from: 900, to: 2600, q: 1.2, gain: 0.08, attack: 0.03 });
    tone(ctx, out, { freq: note(3), type: 'sine', gain: 0.05, decay: 0.1, at: 0.03 });
  },

  menuClose(ctx, out) {
    noise(ctx, out, { duration: 0.12, from: 2400, to: 800, q: 1.2, gain: 0.07, attack: 0.02 });
  },

  /** The sound toggle itself: rising when on, falling when off. */
  toggleOn(ctx, out) {
    tone(ctx, out, { freq: note(7), type: 'sine', gain: 0.12, decay: 0.08 });
    tone(ctx, out, { freq: note(14), type: 'sine', gain: 0.1, decay: 0.12, at: 0.07 });
  },

  toggleOff(ctx, out) {
    tone(ctx, out, { freq: note(14), type: 'sine', gain: 0.1, decay: 0.08 });
    tone(ctx, out, { freq: note(7), type: 'sine', gain: 0.08, decay: 0.12, at: 0.07 });
  },

  /** A thumb running across the closed book's page edges. */
  edgeScrub(ctx, out) {
    noise(ctx, out, {
      duration: 0.035,
      filter: 'highpass',
      from: 2600 + Math.random() * 1600,
      gain: 0.06,
      attack: 0.003,
    });
  },

  /** The book splitting open at the chosen page. */
  bookOpen(ctx, out) {
    tone(ctx, out, { freq: 95, to: 60, type: 'sine', gain: 0.28, decay: 0.22 });
    noise(ctx, out, { duration: 0.42, from: 500, to: 2800, q: 0.7, gain: 0.16, attack: 0.08 });
    noise(ctx, out, { duration: 0.3, from: 2600, to: 900, q: 0.8, gain: 0.08, attack: 0.05, at: 0.32 });
  },

  /** The covers closing. */
  bookClose(ctx, out) {
    noise(ctx, out, { duration: 0.18, from: 1800, to: 500, q: 0.8, gain: 0.1, attack: 0.03 });
    tone(ctx, out, { freq: 85, to: 50, type: 'sine', gain: 0.32, decay: 0.2, at: 0.12 });
    noise(ctx, out, { duration: 0.08, filter: 'lowpass', from: 700, gain: 0.14, attack: 0.002, at: 0.12 });
  },

  /**
   * One leaf turning over, in three parts: the sheet lifting off the page (a
   * faint dry crinkle), swishing through the air (a rising-then-falling
   * band of noise), and settling on the other side (a soft low flap). Every
   * part is randomised a little, so riffling through pages never repeats.
   */
  pageTurn(ctx, out) {
    const vary = () => 0.9 + Math.random() * 0.2;

    for (let i = 0; i < 3; i += 1) {
      noise(ctx, out, {
        duration: 0.012,
        filter: 'highpass',
        from: 4500 + Math.random() * 2500,
        gain: 0.018 + Math.random() * 0.014,
        attack: 0.001,
        at: i * 0.018 + Math.random() * 0.01,
      });
    }

    swish(ctx, out, {
      at: 0.03,
      duration: 0.22 * vary(),
      low: 800 * vary(),
      peak: 3200 * vary(),
      end: 1200 * vary(),
      gain: 0.11,
    });

    noise(ctx, out, { duration: 0.06, filter: 'lowpass', from: 850, gain: 0.07, attack: 0.004, at: 0.22 });
    tone(ctx, out, { freq: 130, to: 85, type: 'sine', gain: 0.035, attack: 0.003, decay: 0.06, at: 0.22 });
  },

  /** Many leaves at once: the round result flipping back to the answer. */
  riffle(ctx, out) {
    for (let i = 0; i < 7; i += 1) {
      noise(ctx, out, {
        duration: 0.07,
        from: 2200 + Math.random() * 1800,
        to: 1100,
        q: 0.8,
        gain: 0.07,
        attack: 0.01,
        at: i * 0.035,
      });
    }
  },

  /** A verse chosen as the guess: a bright, wooden pluck. */
  select(ctx, out) {
    tone(ctx, out, { freq: note(12), type: 'sine', gain: 0.16, decay: 0.22 });
    tone(ctx, out, { freq: note(24), type: 'sine', gain: 0.05, decay: 0.12 });
    noise(ctx, out, { duration: 0.02, filter: 'highpass', from: 4000, gain: 0.05, attack: 0.002 });
  },

  /** Sending the guess off. */
  submit(ctx, out) {
    tone(ctx, out, { freq: 150, to: 90, type: 'sine', gain: 0.26, decay: 0.16 });
    tone(ctx, out, { freq: note(0), to: note(7), type: 'triangle', gain: 0.1, decay: 0.18, at: 0.02 });
  },

  /** Each second of the last ten: a woodblock. */
  timerTick(ctx, out, { urgent = false } = {}) {
    tone(ctx, out, { freq: urgent ? 1250 : 980, type: 'square', gain: 0.045, decay: 0.035, attack: 0.002 });
    tone(ctx, out, { freq: urgent ? 625 : 490, type: 'sine', gain: 0.06, decay: 0.05, attack: 0.002 });
  },

  /** The clock running out. */
  timeUp(ctx, out) {
    tone(ctx, out, { freq: 330, to: 140, type: 'sawtooth', gain: 0.09, decay: 0.45, attack: 0.01 });
    tone(ctx, out, { freq: 165, to: 80, type: 'sine', gain: 0.2, decay: 0.45, attack: 0.01 });
  },

  /** The score counting up. */
  countTick(ctx, out, { value = 0.5 } = {}) {
    tone(ctx, out, { freq: 900 + value * 900, type: 'sine', gain: 0.045, decay: 0.022, attack: 0.002 });
  },

  /**
   * The round's verdict. `quality` (0–1, the score as a share of the maximum)
   * picks how bright it is: a falling minor figure for a miss, a rising major
   * one for a close guess.
   */
  chime(ctx, out, { quality = 0.5 } = {}) {
    const figure =
      quality >= 0.8
        ? [0, 4, 7, 12]
        : quality >= 0.5
          ? [0, 4, 7]
          : quality >= 0.2
            ? [0, 3, 7]
            : [7, 3, 0];
    figure.forEach((step, i) => {
      tone(ctx, out, { freq: note(3 + step), type: 'triangle', gain: 0.12, decay: 0.32, at: i * 0.085 });
      tone(ctx, out, { freq: note(15 + step), type: 'sine', gain: 0.03, decay: 0.2, at: i * 0.085 });
    });
  },

  /** An exact verse. */
  perfect(ctx, out) {
    [0, 4, 7, 12, 16].forEach((step, i) => {
      tone(ctx, out, { freq: note(3 + step), type: 'triangle', gain: 0.13, decay: 0.4, at: i * 0.07 });
    });
    [12, 16, 19].forEach((step) => {
      tone(ctx, out, { freq: note(3 + step), type: 'sine', gain: 0.06, decay: 0.9, attack: 0.02, at: 0.38 });
    });
    noise(ctx, out, { duration: 0.6, filter: 'highpass', from: 6000, gain: 0.025, attack: 0.1, at: 0.35 });
  },

  /** The final results arriving. */
  gameComplete(ctx, out) {
    [0, 7, 12].forEach((step, i) => {
      tone(ctx, out, { freq: note(-2 + step), type: 'triangle', gain: 0.12, decay: 0.28, at: i * 0.11 });
    });
    [0, 4, 7, 12].forEach((step) => {
      tone(ctx, out, { freq: note(-2 + step), type: 'sine', gain: 0.07, decay: 1.1, attack: 0.03, at: 0.36 });
    });
  },

  /** A form saved. */
  success(ctx, out) {
    tone(ctx, out, { freq: note(10), type: 'sine', gain: 0.12, decay: 0.12 });
    tone(ctx, out, { freq: note(15), type: 'sine', gain: 0.12, decay: 0.22, at: 0.09 });
  },

  /** Something refused or failed. */
  error(ctx, out) {
    tone(ctx, out, { freq: 220, type: 'square', gain: 0.05, decay: 0.09 });
    tone(ctx, out, { freq: 175, type: 'square', gain: 0.05, decay: 0.14, at: 0.11 });
  },
};

export const SOUND_NAMES = Object.keys(VOICES);

const lastPlayed = {};

/**
 * Play a sound by name.
 * @param {string} name   one of SOUND_NAMES
 * @param {object} [opts] voice options; `force` skips the repeat throttle
 */
export function play(name, opts = {}) {
  if (!enabled) return;
  const voice = VOICES[name];
  if (!voice) return;

  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const gap = THROTTLE_MS[name] ?? 0;
  if (!opts.force && gap && lastPlayed[name] !== undefined && now - lastPlayed[name] < gap) return;
  lastPlayed[name] = now;

  const ctx = ensureContext();
  if (!ctx || !master) return;
  if (ctx.state === 'suspended') ctx.resume?.().catch?.(() => {});

  try {
    voice(ctx, master, opts);
  } catch {
    // A sound that fails to build is simply not heard.
  }
}

// ---------------------------------------------------------------------------
// Site-wide interaction sounds
// ---------------------------------------------------------------------------

const PRESSABLE = 'button, a[href], [role="button"], summary';

/**
 * Give every button and link a press sound, without each one wiring it up.
 *
 * An element can choose a different sound with `data-sound="<name>"`, or none
 * with `data-sound="none"` — used where the action plays its own sound, so the
 * two do not stack. Scripture words are skipped: choosing a verse has its own.
 *
 * Returns a cleanup function.
 */
export function attachInteractionSounds(root = document) {
  function onFirstGesture() {
    unlockAudio();
  }

  function onClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    const element = target?.closest(PRESSABLE);
    if (!element || element.closest('.scripture')) return;
    if (element.matches(':disabled, [aria-disabled="true"]')) return;

    const name = element.dataset.sound || 'click';
    if (name === 'none') return;
    play(name);
  }

  function onChange(event) {
    if (event.target instanceof HTMLSelectElement) play('tick');
  }

  root.addEventListener('pointerdown', onFirstGesture, { capture: true, passive: true });
  root.addEventListener('keydown', onFirstGesture, { capture: true });
  root.addEventListener('click', onClick, { capture: true });
  root.addEventListener('change', onChange, { capture: true });

  return () => {
    root.removeEventListener('pointerdown', onFirstGesture, { capture: true });
    root.removeEventListener('keydown', onFirstGesture, { capture: true });
    root.removeEventListener('click', onClick, { capture: true });
    root.removeEventListener('change', onChange, { capture: true });
  };
}
