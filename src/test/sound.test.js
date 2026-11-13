import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * The sound engine must never break the game. jsdom has no Web Audio at all,
 * which stands in for an old or locked-down browser: every call has to be a
 * quiet no-op there. With a (fake) AudioContext present, it must make sound only
 * while enabled, and remember the player's choice.
 */

const STORAGE_KEY = 'bibleoguessr:sound';

/** A minimal stand-in for the Web Audio graph, counting what gets started. */
function installFakeAudio() {
  const started = [];
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  });
  const node = () => ({ connect: vi.fn(() => node()), disconnect: vi.fn() });

  class FakeAudioContext {
    constructor() {
      this.state = 'running';
      this.currentTime = 0;
      this.sampleRate = 44100;
      this.destination = node();
    }
    resume() {
      return Promise.resolve();
    }
    createGain() {
      return { ...node(), gain: param() };
    }
    createOscillator() {
      return {
        ...node(),
        type: 'sine',
        frequency: param(),
        detune: param(),
        start: () => started.push('osc'),
        stop: vi.fn(),
      };
    }
    createBiquadFilter() {
      return { ...node(), type: 'lowpass', frequency: param(), Q: param() };
    }
    createBuffer(channels, length) {
      return { getChannelData: () => new Float32Array(length) };
    }
    createBufferSource() {
      return {
        ...node(),
        buffer: null,
        playbackRate: param(),
        start: () => started.push('buffer'),
        stop: vi.fn(),
      };
    }
    decodeAudioData() {
      return Promise.reject(new Error('no samples in tests'));
    }
  }

  window.AudioContext = FakeAudioContext;
  return started;
}

async function freshEngine() {
  vi.resetModules();
  return import('@/lib/sound');
}

describe('sound engine', () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.AudioContext;
    delete window.webkitAudioContext;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.AudioContext;
  });

  it('is enabled by default', async () => {
    const sound = await freshEngine();
    expect(sound.isSoundEnabled()).toBe(true);
  });

  it('remembers being turned off, and back on', async () => {
    let sound = await freshEngine();
    sound.setSoundEnabled(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('off');

    sound = await freshEngine();
    expect(sound.isSoundEnabled()).toBe(false);

    sound.setSoundEnabled(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('on');
  });

  it('tells subscribers when the setting changes, and stops after unsubscribing', async () => {
    const sound = await freshEngine();
    const listener = vi.fn();
    const unsubscribe = sound.subscribe(listener);

    sound.setSoundEnabled(false);
    expect(listener).toHaveBeenLastCalledWith(false);

    unsubscribe();
    sound.setSoundEnabled(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does nothing, and does not throw, where Web Audio does not exist', async () => {
    const sound = await freshEngine();
    expect(() => {
      sound.unlockAudio();
      sound.SOUND_NAMES.forEach((name) => sound.play(name));
    }).not.toThrow();
  });

  it('ignores names it does not know', async () => {
    installFakeAudio();
    const sound = await freshEngine();
    sound.unlockAudio();
    expect(() => sound.play('definitely-not-a-sound')).not.toThrow();
  });

  it('plays every named sound when enabled', async () => {
    const started = installFakeAudio();
    const sound = await freshEngine();
    sound.unlockAudio();

    sound.SOUND_NAMES.forEach((name) => {
      const before = started.length;
      sound.play(name, { force: true });
      expect(started.length, `${name} made no sound`).toBeGreaterThan(before);
    });
  });

  it('stays silent while muted', async () => {
    const started = installFakeAudio();
    const sound = await freshEngine();
    sound.unlockAudio();
    sound.setSoundEnabled(false);

    sound.play('click');
    sound.play('pageTurn');
    expect(started).toHaveLength(0);
  });

  it('throttles a sound fired repeatedly in the same instant', async () => {
    const started = installFakeAudio();
    const sound = await freshEngine();
    sound.unlockAudio();

    sound.play('tick');
    const once = started.length;
    sound.play('tick');
    sound.play('tick');
    expect(started.length).toBe(once);
  });
});
