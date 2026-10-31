import * as Tone from 'tone';
import { progress } from '../progress';

/**
 * Procedural sound effects on raw Web Audio nodes (sharing Tone's context),
 * so sweeps and envelopes are sample-accurate and cheap.
 */

let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;

function ctx(): AudioContext | null {
  try {
    const c = Tone.getContext().rawContext as AudioContext;
    return c.state === 'running' ? c : null;
  } catch {
    return null;
  }
}

function out(c: AudioContext): GainNode {
  if (!master || master.context !== c) {
    master = c.createGain();
    master.gain.value = 0.55;
    master.connect(c.destination);
  }
  return master;
}

function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

function enabled(): AudioContext | null {
  return progress.settings.sound ? ctx() : null;
}

interface ToneOpts {
  type?: OscillatorType;
  from: number;
  to?: number;
  dur: number;
  vol?: number;
  delay?: number;
  attack?: number;
  /** Vibrato depth in Hz and rate in Hz. */
  vibrato?: [number, number];
}

function blip(c: AudioContext, o: ToneOpts): void {
  const t = c.currentTime + (o.delay ?? 0);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.from, t);
  if (o.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + o.dur);
  const vol = o.vol ?? 0.5;
  const attack = o.attack ?? 0.005;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  if (o.vibrato) {
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = o.vibrato[1];
    lfoGain.gain.value = o.vibrato[0];
    lfo.connect(lfoGain).connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + o.dur + 0.05);
  }
  osc.connect(gain).connect(out(c));
  osc.start(t);
  osc.stop(t + o.dur + 0.05);
}

interface NoiseOpts {
  dur: number;
  vol?: number;
  delay?: number;
  filter?: BiquadFilterType;
  freq: number;
  freqTo?: number;
  q?: number;
}

function hiss(c: AudioContext, o: NoiseOpts): void {
  const t = c.currentTime + (o.delay ?? 0);
  const src = c.createBufferSource();
  src.buffer = noise(c);
  const filter = c.createBiquadFilter();
  filter.type = o.filter ?? 'bandpass';
  filter.Q.value = o.q ?? 1;
  filter.frequency.setValueAtTime(o.freq, t);
  if (o.freqTo) filter.frequency.exponentialRampToValueAtTime(o.freqTo, t + o.dur);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(o.vol ?? 0.4, t + o.dur * 0.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  src.connect(filter).connect(gain).connect(out(c));
  src.start(t, Math.random() * 0.5);
  src.stop(t + o.dur + 0.05);
}

const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];

export const sfx = {
  pop(): void {
    const c = enabled();
    if (!c) return;
    blip(c, { from: 380 + Math.random() * 120, to: 1100, dur: 0.09, vol: 0.45 });
  },
  boing(): void {
    const c = enabled();
    if (!c) return;
    blip(c, { type: 'triangle', from: 140, to: 520, dur: 0.45, vol: 0.5, vibrato: [40, 18] });
  },
  whoosh(): void {
    const c = enabled();
    if (!c) return;
    hiss(c, { dur: 0.38, freq: 300, freqTo: 3200, q: 1.5, vol: 0.35 });
  },
  slideWhistle(up = false): void {
    const c = enabled();
    if (!c) return;
    blip(c, { from: up ? 450 : 1500, to: up ? 1500 : 380, dur: 0.7, vol: 0.32, attack: 0.05, vibrato: [14, 7] });
  },
  bonk(): void {
    const c = enabled();
    if (!c) return;
    blip(c, { type: 'triangle', from: 320, to: 90, dur: 0.22, vol: 0.6 });
    hiss(c, { dur: 0.05, freq: 1800, q: 4, vol: 0.25 });
  },
  sparkle(): void {
    const c = enabled();
    if (!c) return;
    for (let i = 0; i < 6; i++) {
      blip(c, { from: 1800 + Math.random() * 1800, dur: 0.18, vol: 0.14, delay: i * 0.045 });
    }
  },
  /** Rising chime: pass the streak or step so each one climbs higher. */
  chime(step = 0): void {
    const c = enabled();
    if (!c) return;
    const base = Math.min(step, PENTATONIC.length - 3);
    [0, 1, 2].forEach((k, i) => {
      const f = PENTATONIC[base + k];
      blip(c, { from: f, dur: 0.5, vol: 0.28, delay: i * 0.07 });
      blip(c, { from: f * 2, dur: 0.3, vol: 0.08, delay: i * 0.07 });
    });
  },
  /** Woodblock tick for counting hops; climbs with the count. */
  tick(count = 0): void {
    const c = enabled();
    if (!c) return;
    blip(c, { type: 'square', from: 600 + Math.min(count, 20) * 30, to: 300, dur: 0.06, vol: 0.12 });
  },
  drumroll(seconds = 1.4): void {
    const c = enabled();
    if (!c) return;
    const hits = Math.floor(seconds / 0.045);
    for (let i = 0; i < hits; i++) {
      hiss(c, { dur: 0.05, freq: 900, q: 0.8, vol: 0.08 + (0.3 * i) / hits, delay: i * 0.045 });
    }
    hiss(c, { dur: 1.2, freq: 6000, filter: 'highpass', q: 0.5, vol: 0.4, delay: seconds });
  },
  /** Silly descending "wah-wah-woo" for a character goof (never aimed at the player). */
  goof(): void {
    const c = enabled();
    if (!c) return;
    blip(c, { type: 'triangle', from: 600, to: 420, dur: 0.18, vol: 0.3 });
    blip(c, { type: 'triangle', from: 420, to: 700, dur: 0.25, vol: 0.3, delay: 0.18, vibrato: [30, 12] });
  },
  firework(): void {
    const c = enabled();
    if (!c) return;
    blip(c, { from: 300, to: 1600, dur: 0.35, vol: 0.12 });
    hiss(c, { dur: 0.7, freq: 2500, filter: 'lowpass', q: 0.4, vol: 0.45, delay: 0.32 });
  },
  /** Party horn blast: a buzzy rising toot with a wobble. */
  partyHorn(): void {
    const c = enabled();
    if (!c) return;
    blip(c, { type: 'sawtooth', from: 330, to: 660, dur: 0.12, vol: 0.18 });
    blip(c, { type: 'sawtooth', from: 660, dur: 0.45, vol: 0.2, delay: 0.12, vibrato: [18, 11] });
    hiss(c, { dur: 0.3, freq: 3000, q: 0.6, vol: 0.12, delay: 0.1 });
  },
  /** Silly clown-nose honk-honk. */
  honk(): void {
    const c = enabled();
    if (!c) return;
    [0, 0.2].forEach((delay) => {
      blip(c, { type: 'square', from: 420, to: 360, dur: 0.14, vol: 0.16, delay });
      blip(c, { type: 'square', from: 630, to: 540, dur: 0.14, vol: 0.08, delay });
    });
  },
  /** Kazoo "ta-da!" in three notes. */
  kazoo(): void {
    const c = enabled();
    if (!c) return;
    [[392, 0, 0.14], [523, 0.15, 0.14], [659, 0.3, 0.45]].forEach(([f, delay, dur]) => {
      blip(c, { type: 'sawtooth', from: f, dur, vol: 0.13, delay, vibrato: [9, 7] });
      hiss(c, { dur, freq: f * 3, q: 3, vol: 0.06, delay });
    });
  },
  /** Bouncy spring: boing-boing-boing, each higher. */
  boingBoing(): void {
    const c = enabled();
    if (!c) return;
    [0, 0.16, 0.32].forEach((delay, i) => {
      blip(c, { type: 'triangle', from: 160 + i * 80, to: 520 + i * 160, dur: 0.22, vol: 0.4, delay, vibrato: [30, 20] });
    });
  },
  /** Cartoon "wheee!" whistle swooping up and down. */
  whee(): void {
    const c = enabled();
    if (!c) return;
    blip(c, { from: 600, to: 1800, dur: 0.35, vol: 0.25, attack: 0.03 });
    blip(c, { from: 1800, to: 900, dur: 0.35, vol: 0.22, delay: 0.33, vibrato: [20, 9] });
  },
  splash(): void {
    const c = enabled();
    if (!c) return;
    hiss(c, { dur: 0.5, freq: 1200, freqTo: 400, q: 0.7, vol: 0.35 });
  },
};

export type SfxName = keyof typeof sfx;

/** Celebration noises, picked at random so correct answers stay surprising. */
const FUNNY: readonly SfxName[] = ['partyHorn', 'honk', 'kazoo', 'boingBoing', 'whee'];
let lastFunny: SfxName | null = null;

/** Play a random funny celebration sound, never the same one twice in a row. */
export function funnySound(rng: () => number = Math.random): void {
  const options = FUNNY.filter((n) => n !== lastFunny);
  const name = options[Math.floor(rng() * options.length)];
  lastFunny = name;
  sfx[name]();
}
