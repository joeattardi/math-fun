import { type Rng, pick, randInt } from '../../shared/random';

export const QUESTION_TYPES = ['within-20', 'different-tens', 'trap', 'same-tens', 'reversal'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export interface LevelDef {
  index: number;
  max: number;
  label: string;
  types: readonly QuestionType[];
  /** Types that should feel achievable: used for "easy win" rounds. */
  easyTypes: readonly QuestionType[];
}

export const LEVELS: readonly LevelDef[] = [
  { index: 0, max: 10, label: '0 – 10', types: ['within-20'], easyTypes: ['within-20'] },
  { index: 1, max: 20, label: '0 – 20', types: ['within-20', 'trap'], easyTypes: ['within-20'] },
  {
    index: 2,
    max: 50,
    label: '0 – 50',
    types: QUESTION_TYPES,
    easyTypes: ['within-20', 'different-tens'],
  },
  {
    index: 3,
    max: 100,
    label: '0 – 100',
    types: QUESTION_TYPES,
    easyTypes: ['within-20', 'different-tens'],
  },
];

export const ROUNDS_PER_LEVEL = 10;

export interface Pair {
  /** Left card. */
  a: number;
  /** Right card. */
  b: number;
  type: QuestionType;
}

export const tensDigit = (n: number): number => Math.floor(n / 10);
export const onesDigit = (n: number): number => n % 10;
export const greaterOf = (p: Pair): number => Math.max(p.a, p.b);
export const lessOf = (p: Pair): number => Math.min(p.a, p.b);

/** The lesser number has the greater ones digit, and the tens digits differ. */
export function isTrap(x: number, y: number): boolean {
  const lo = Math.min(x, y);
  const hi = Math.max(x, y);
  return tensDigit(lo) !== tensDigit(hi) && onesDigit(lo) > onesDigit(hi);
}

/** Two two-digit numbers whose digits are swapped, like 28 and 82. */
export function isReversal(x: number, y: number): boolean {
  return (
    x !== y &&
    x >= 10 && x < 100 &&
    y >= 10 && y < 100 &&
    tensDigit(x) === onesDigit(y) &&
    onesDigit(x) === tensDigit(y)
  );
}

/**
 * The single source of truth for what type a pair is. Priority:
 * reversal, then within-20 (unless it's a trap, which we always track as trap),
 * then same-tens, trap, different-tens.
 */
export function classify(x: number, y: number): QuestionType {
  if (x === y) throw new Error('classify: numbers must differ');
  if (isReversal(x, y)) return 'reversal';
  const trap = isTrap(x, y);
  if (Math.max(x, y) <= 20 && !trap) return 'within-20';
  if (tensDigit(x) === tensDigit(y)) return 'same-tens';
  if (trap) return 'trap';
  return 'different-tens';
}

/** Can this level's range produce this type at all? */
export function typeAvailable(type: QuestionType, level: LevelDef): boolean {
  return level.types.includes(type);
}

function bySampling(rng: Rng, lo: number, hi: number, accept: (x: number, y: number) => boolean): [number, number] | null {
  for (let i = 0; i < 2000; i++) {
    const x = randInt(rng, lo, hi);
    const y = randInt(rng, lo, hi);
    if (x !== y && accept(x, y)) return [x, y];
  }
  return null;
}

function sameTens(rng: Rng, max: number): [number, number] | null {
  // Tens 2+ so it isn't classed as within-20. Need room for two different ones digits.
  const tensOptions: number[] = [];
  for (let t = 2; t * 10 + 1 <= max && t <= 9; t++) tensOptions.push(t);
  if (tensOptions.length === 0) return null;
  const t = pick(rng, tensOptions);
  const maxOnes = Math.min(9, max - t * 10);
  const o1 = randInt(rng, 0, maxOnes);
  let o2 = randInt(rng, 0, maxOnes - 1);
  if (o2 >= o1) o2++;
  return [t * 10 + o1, t * 10 + o2];
}

function reversal(rng: Rng, max: number): [number, number] | null {
  const options: [number, number][] = [];
  for (let x = 1; x <= 9; x++) {
    for (let y = x + 1; y <= 9; y++) {
      const lo = x * 10 + y;
      const hi = y * 10 + x;
      if (hi <= max) options.push([lo, hi]);
    }
  }
  return options.length ? pick(rng, options) : null;
}

function rawPair(type: QuestionType, max: number, rng: Rng): [number, number] | null {
  switch (type) {
    case 'within-20':
      return bySampling(rng, 0, Math.min(max, 20), (x, y) => classify(x, y) === 'within-20');
    case 'trap':
      return bySampling(rng, 1, max, (x, y) => classify(x, y) === 'trap');
    case 'different-tens':
      return bySampling(
        rng,
        1,
        max,
        (x, y) =>
          classify(x, y) === 'different-tens' &&
          onesDigit(Math.max(x, y)) > onesDigit(Math.min(x, y)),
      );
    case 'same-tens':
      return sameTens(rng, max);
    case 'reversal':
      return reversal(rng, max);
  }
}

/**
 * Generate a pair of the given type within the level's range.
 * Falls back to an easy type if the range can't produce the requested type.
 * Never returns equal numbers. `avoid` is the previous pair, which is never repeated.
 */
export function generatePair(type: QuestionType, level: LevelDef, rng: Rng, avoid?: Pair): Pair {
  const wanted = typeAvailable(type, level) ? type : level.easyTypes[0];
  for (let attempt = 0; attempt < 20; attempt++) {
    const raw = rawPair(wanted, level.max, rng) ?? rawPair(level.easyTypes[0], level.max, rng);
    if (!raw) continue;
    let [a, b] = raw;
    if (rng() < 0.5) [a, b] = [b, a];
    const pair: Pair = { a, b, type: classify(a, b) };
    const same = avoid && Math.min(a, b) === lessOf(avoid) && Math.max(a, b) === greaterOf(avoid);
    if (!same) return pair;
  }
  // Practically unreachable; a guaranteed-valid easy pair.
  return { a: 2, b: 7, type: 'within-20' };
}
