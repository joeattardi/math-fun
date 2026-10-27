import { music } from './music';

/** How a character sounds. */
export interface VoiceStyle {
  pitch: number;
  rate: number;
  /** Prefer an accent if the device has one (e.g. 'en-GB'). */
  lang?: string;
}

export const DEFAULT_VOICE: VoiceStyle = { pitch: 1.1, rate: 1 };

const PREFERRED_NAMES = ['Samantha', 'Karen', 'Moira', 'Tessa', 'Daniel', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny'];

interface QueueItem {
  text: string;
  voice: VoiceStyle;
  resolve: () => void;
}

/** Global speed factor for automated tests (shortens watchdogs). */
let speedFactor = 1;
export function setSpeechSpeed(factor: number): void {
  speedFactor = factor;
}

/** Make text friendly for speech engines: ALL-CAPS words can get spelled out letter by letter. */
export function speakable(text: string): string {
  return text.replace(/\b[A-Z]{2,}\b/g, (w) => w.toLowerCase());
}

class Speech {
  private queue: QueueItem[] = [];
  private current: QueueItem | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private watchdog: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;

  constructor() {
    if (!this.available()) return;
    const load = () => (this.voices = speechSynthesis.getVoices());
    load();
    try {
      speechSynthesis.addEventListener('voiceschanged', load);
    } catch {
      // Older engines: voices just stay as loaded.
    }
  }

  private available(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  }

  /** Call inside a user gesture (Tap to Play) so iOS allows speech later. */
  prime(text = ' '): void {
    if (!this.available()) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.volume = text.trim() ? 1 : 0;
      speechSynthesis.speak(u);
    } catch {
      // Speech is optional.
    }
  }

  private pickVoice(lang?: string): SpeechSynthesisVoice | undefined {
    const english = this.voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
    if (lang) {
      const accent = english.filter((v) => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase());
      const named = accent.find((v) => PREFERRED_NAMES.some((n) => v.name.includes(n)));
      if (named || accent[0]) return named ?? accent[0];
    }
    for (const name of PREFERRED_NAMES) {
      const v = english.find((voice) => voice.name.includes(name));
      if (v) return v;
    }
    return english.find((v) => v.localService) ?? english[0];
  }

  /**
   * Speak a line. Resolves when finished, when interrupted, or when the watchdog fires,
   * so callers can await it without ever blocking gameplay.
   */
  say(text: string, voice: VoiceStyle = DEFAULT_VOICE, opts: { interrupt?: boolean } = {}): Promise<void> {
    if (opts.interrupt) this.cancel();
    return new Promise((resolve) => {
      this.queue.push({ text, voice, resolve });
      if (!this.current) this.next();
    });
  }

  /** Stop everything and resolve all pending lines. */
  cancel(): void {
    this.generation++;
    const pending = [...this.queue, ...(this.current ? [this.current] : [])];
    this.queue = [];
    this.current = null;
    this.clearWatchdog();
    try {
      if (this.available()) speechSynthesis.cancel();
    } catch {
      // ignore
    }
    pending.forEach((p) => p.resolve());
    music.duck(false);
  }

  get speaking(): boolean {
    return this.current !== null;
  }

  private clearWatchdog(): void {
    if (this.watchdog) clearTimeout(this.watchdog);
    this.watchdog = null;
  }

  private next(): void {
    const item = this.queue.shift();
    if (!item) {
      this.current = null;
      music.duck(false);
      return;
    }
    this.current = item;
    const gen = this.generation;
    let finished = false;
    const finish = () => {
      if (finished || gen !== this.generation) return;
      finished = true;
      this.clearWatchdog();
      item.resolve();
      this.next();
    };

    // Rough duration estimate, so a stuck engine can't hold up the game.
    const estimate = (900 + item.text.length * 75) / item.voice.rate;
    this.watchdog = setTimeout(finish, (estimate * 1.6) / speedFactor);

    if (!this.available()) {
      // No speech: still give the bubble time to be read.
      this.clearWatchdog();
      this.watchdog = setTimeout(finish, estimate / speedFactor);
      return;
    }
    try {
      const u = new SpeechSynthesisUtterance(speakable(item.text));
      u.pitch = item.voice.pitch;
      u.rate = item.voice.rate;
      const v = this.pickVoice(item.voice.lang);
      if (v) {
        u.voice = v;
        u.lang = v.lang;
      } else {
        u.lang = 'en-US';
      }
      u.onend = finish;
      u.onerror = finish;
      music.duck(true);
      speechSynthesis.speak(u);
    } catch {
      finish();
    }
  }
}

export const speech = new Speech();
