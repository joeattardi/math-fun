import type { VoiceStyle } from '../audio/speech';

/** Distinct voices: Chomp is soft and calm, Waddles is fancy and slow, Hops is quick and squeaky. */
export const voices = {
  // Natural pitch and an unhurried pace; very low pitches sound harsh on iPad voices.
  chomp: { pitch: 1.0, rate: 0.88, prefer: ['Moira', 'Karen', 'Tessa'] },
  waddles: { pitch: 1.15, rate: 0.9, lang: 'en-GB' },
  hops: { pitch: 1.7, rate: 1.12 },
} satisfies Record<string, VoiceStyle>;
