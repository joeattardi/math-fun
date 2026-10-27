import * as Tone from 'tone';
import { progress } from '../progress';

/** A loopable procedural track: 4 bars of 8th notes. `null` is a rest. */
interface TrackDef {
  bpm: number;
  /** One chord per bar. */
  chords: string[][];
  bass: (string | null)[];
  melody: (string | null)[];
}

const _ = null;

const TRACKS = {
  menu: {
    bpm: 116,
    chords: [['C4', 'E4', 'G4'], ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['G3', 'B3', 'D4']],
    bass: ['C2', _, 'C3', _, 'G2', _, 'C3', _, 'A1', _, 'A2', _, 'E2', _, 'A2', _, 'F1', _, 'F2', _, 'C2', _, 'F2', _, 'G1', _, 'G2', _, 'D2', _, 'G2', 'B2'],
    melody: ['E5', 'G5', 'E5', 'C5', 'D5', 'E5', 'G5', _, 'A5', 'G5', 'E5', 'C5', 'D5', _, 'E5', _, 'F5', 'A5', 'F5', 'C5', 'D5', 'F5', 'A5', _, 'G5', 'F5', 'E5', 'D5', 'B4', _, 'G4', _],
  },
  game: {
    bpm: 128,
    chords: [['G3', 'B3', 'D4'], ['E3', 'G3', 'B3'], ['C4', 'E4', 'G4'], ['D4', 'F#4', 'A4']],
    bass: ['G1', _, 'G2', 'G1', _, 'G2', 'D2', _, 'E1', _, 'E2', 'E1', _, 'E2', 'B1', _, 'C2', _, 'C3', 'C2', _, 'C3', 'G2', _, 'D2', _, 'D3', 'D2', _, 'A2', 'F#2', _],
    melody: ['B4', 'D5', 'G5', 'D5', 'B4', 'D5', 'G5', 'A5', 'B5', _, 'G5', 'E5', _, 'D5', 'E5', _, 'C5', 'E5', 'G5', 'E5', 'C6', _, 'G5', _, 'A5', 'G5', 'F#5', 'E5', 'D5', _, _, _],
  },
} satisfies Record<string, TrackDef>;

export type TrackName = keyof typeof TRACKS;

const DUCKED = 0.3;

class MusicPlayer {
  private ready = false;
  private wanted: TrackName | null = null;
  private playing: TrackName | null = null;
  private loops: Tone.Sequence[] = [];
  private hypeLevel = 0;

  private duckGain!: Tone.Gain;
  private bus!: Tone.Volume;
  private hypeBus!: Tone.Volume;
  private hype2Bus!: Tone.Volume;
  private lead!: Tone.Synth;
  private pad!: Tone.PolySynth;
  private bass!: Tone.MonoSynth;
  private kick!: Tone.MembraneSynth;
  private snare!: Tone.NoiseSynth;
  private hat!: Tone.MetalSynth;
  private arp!: Tone.Synth;
  private clap!: Tone.NoiseSynth;
  private brass!: Tone.PolySynth;

  /** Call from a user gesture. Safe to call repeatedly. */
  async unlock(): Promise<void> {
    await Tone.start();
    if (this.ready) return;
    this.duckGain = new Tone.Gain(1).toDestination();
    this.bus = new Tone.Volume(-10).connect(this.duckGain);
    this.hypeBus = new Tone.Volume(-Infinity).connect(this.bus);
    this.hype2Bus = new Tone.Volume(-Infinity).connect(this.bus);

    this.lead = new Tone.Synth({ oscillator: { type: 'square8' }, envelope: { attack: 0.01, decay: 0.15, sustain: 0.3, release: 0.15 } }).connect(new Tone.Volume(-14).connect(this.bus));
    this.pad = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.02, decay: 0.3, sustain: 0.2, release: 0.3 } }).connect(new Tone.Volume(-18).connect(this.bus));
    this.bass = new Tone.MonoSynth({ oscillator: { type: 'sawtooth' }, filter: { Q: 2, type: 'lowpass' }, filterEnvelope: { attack: 0.01, decay: 0.15, sustain: 0.2, baseFrequency: 180, octaves: 2.5 }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.1 } }).connect(new Tone.Volume(-12).connect(this.bus));
    this.kick = new Tone.MembraneSynth({ pitchDecay: 0.03, octaves: 6 }).connect(new Tone.Volume(-8).connect(this.bus));
    this.snare = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.14, sustain: 0 } }).connect(new Tone.Volume(-20).connect(this.bus));
    this.hat = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.05, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).connect(new Tone.Volume(-30).connect(this.bus));
    this.arp = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.1, release: 0.05 } }).connect(new Tone.Volume(-12).connect(this.hypeBus));
    this.clap = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.002, decay: 0.2, sustain: 0 } }).connect(new Tone.Volume(-14).connect(this.hype2Bus));
    this.brass = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sawtooth6' }, envelope: { attack: 0.03, decay: 0.2, sustain: 0.6, release: 0.4 } }).connect(new Tone.Volume(-14).connect(this.duckGain));
    this.ready = true;
    if (this.wanted) this.play(this.wanted);
  }

  play(track: TrackName): void {
    this.wanted = track;
    if (!this.ready || !progress.settings.music) return;
    if (this.playing === track) return;
    this.stopLoops();
    const def: TrackDef = TRACKS[track];
    const transport = Tone.getTransport();
    transport.bpm.value = def.bpm;

    const eighths = (notes: (string | null)[], fn: (time: number, note: string) => void) =>
      new Tone.Sequence((time, note) => note && fn(time, note), notes, '8n');

    this.loops.push(
      eighths(def.melody, (t, n) => this.lead.triggerAttackRelease(n, '16n', t)),
      eighths(def.bass, (t, n) => this.bass.triggerAttackRelease(n, '8n', t)),
      new Tone.Sequence((t, bar) => this.pad.triggerAttackRelease(def.chords[bar as number], '2n', t), [0, 1, 2, 3], '1m'),
      new Tone.Sequence((t, hit) => {
        if (hit === 'k') this.kick.triggerAttackRelease('C1', '8n', t);
        if (hit === 's') this.snare.triggerAttackRelease('16n', t);
      }, ['k', _, 's', _, 'k', 'k', 's', _], '8n'),
      new Tone.Sequence((t) => this.hat.triggerAttackRelease('C6', '32n', t, 0.4), [1, 1, 1, 1, 1, 1, 1, 1], '8n'),
      // Hype layer 1: 16th-note arpeggio of the current chord.
      new Tone.Sequence((t, step) => {
        const s = step as number;
        const chord = def.chords[Math.floor(s / 16) % 4];
        const note = Tone.Frequency(chord[s % 3]).transpose(12 + (s % 4 === 3 ? 12 : 0)).toNote();
        this.arp.triggerAttackRelease(note, '32n', t);
      }, Array.from({ length: 64 }, (_, i) => i), '16n'),
      // Hype layer 2: claps on the backbeat.
      new Tone.Sequence((t, hit) => hit && this.clap.triggerAttackRelease('16n', t), [0, 0, 1, 0, 0, 0, 1, 1], '8n'),
    );
    for (const loop of this.loops) loop.start(0);
    transport.position = 0;
    transport.start();
    this.playing = track;
    this.applyHype();
  }

  stop(): void {
    this.wanted = null;
    this.stopLoops();
  }

  private stopLoops(): void {
    for (const loop of this.loops) loop.dispose();
    this.loops = [];
    if (this.ready) Tone.getTransport().stop();
    this.playing = null;
  }

  /** 0 = base track, 1 = arpeggio, 2 = arpeggio + claps. */
  setHype(level: number): void {
    this.hypeLevel = level;
    this.applyHype();
  }

  private applyHype(): void {
    if (!this.ready) return;
    this.hypeBus.volume.rampTo(this.hypeLevel >= 1 ? -4 : -Infinity, 0.4);
    this.hype2Bus.volume.rampTo(this.hypeLevel >= 2 ? -2 : -Infinity, 0.4);
  }

  duck(on: boolean): void {
    if (!this.ready) return;
    this.duckGain.gain.rampTo(on ? DUCKED : 1, on ? 0.12 : 0.5);
  }

  /** Re-read the music setting (after Settings changes it). */
  refresh(): void {
    if (!progress.settings.music) {
      const keep = this.wanted;
      this.stopLoops();
      this.wanted = keep;
    } else if (this.wanted) {
      this.play(this.wanted);
    }
  }

  fanfare(): void {
    if (!this.ready || !progress.settings.music) return;
    const now = Tone.now() + 0.05;
    const notes: [string[], number, string][] = [
      [['G4'], 0, '8n'], [['C5'], 0.16, '8n'], [['E5'], 0.32, '8n'], [['G5'], 0.48, '4n'],
      [['E5'], 0.78, '8n'], [['G5', 'C6', 'E5'], 0.94, '2n'],
    ];
    for (const [chord, at, len] of notes) this.brass.triggerAttackRelease(chord, len, now + at);
  }

  /** Short rising sting for big streaks. */
  sting(): void {
    if (!this.ready || !progress.settings.music) return;
    const now = Tone.now() + 0.02;
    ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => this.brass.triggerAttackRelease([n], '16n', now + i * 0.07));
    this.brass.triggerAttackRelease(['C5', 'E5', 'G5', 'C6'], '4n', now + 0.3);
  }
}

export const music = new MusicPlayer();
