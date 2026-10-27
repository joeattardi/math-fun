import type { VoiceStyle } from '../audio/speech';

/** Distinct voices: Chomp is low and hungry, Waddles is fancy and slow, Hops is quick and squeaky. */
export const voices = {
  chomp: { pitch: 0.7, rate: 1.0 },
  waddles: { pitch: 1.15, rate: 0.9, lang: 'en-GB' },
  hops: { pitch: 1.7, rate: 1.12 },
} satisfies Record<string, VoiceStyle>;
