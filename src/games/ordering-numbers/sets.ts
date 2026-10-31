import { type Rng, pick, randInt, shuffle } from '../../shared/random';
import { type Pitfall, classifyPair, digitCount, greatestFirst, leadingDigit, setPitfalls } from './places';

export const SET_SIZE = 4;
export const ROUNDS_PER_LEVEL = 6;

export type Mode = 'pick' | 'arrange';

export interface LevelDef {
  index: number;
  label: string;
  mode: Mode;
  /** Pitfalls this level practices. Every set features one of them. */
  pitfalls: readonly Pitfall[];
  /** Pitfalls that should feel achievable: used for "easy win" rounds. */
  easyPitfalls: readonly Pitfall[];
  /** Digit counts allowed in a set. */
  digits: readonly (1 | 2 | 3)[];
  /** Every set mixes two-digit and three-digit numbers. */
  mixed: boolean;
  /** Dotted boxes show empty places on the cards. Faded out in the late levels. */
  placeBoxes: boolean;
  /** Every set must include a pair with this pitfall. */
  requires?: Pitfall;
}

export const LEVELS: readonly LevelDef[] = [
  {
    index: 0, label: 'Two Digits', mode: 'pick', digits: [2], mixed: false, placeBoxes: true,
    pitfalls: ['leading', 'second', 'twins'], easyPitfalls: ['leading'],
  },
  {
    index: 1, label: 'Three Digits', mode: 'pick', digits: [3], mixed: false, placeBoxes: true,
    pitfalls: ['leading', 'second', 'third', 'twins'], easyPitfalls: ['leading'],
  },
  {
    index: 2, label: 'Mix It Up!', mode: 'pick', digits: [2, 3], mixed: true, placeBoxes: true, requires: 'digit-trap',
    pitfalls: ['digit-trap', 'digit-count', 'leading'], easyPitfalls: ['digit-count'],
  },
  {
    index: 3, label: 'Super Tricky', mode: 'pick', digits: [2, 3], mixed: false, placeBoxes: true,
    pitfalls: ['twins', 'zero', 'second', 'third', 'digit-trap'], easyPitfalls: ['leading', 'digit-count'],
  },
  {
    index: 4, label: 'Mega Mix', mode: 'pick', digits: [1, 2, 3], mixed: true, placeBoxes: false,
    pitfalls: ['single-digit', 'digit-trap', 'digit-count', 'zero', 'twins', 'second', 'third'], easyPitfalls: ['digit-count', 'leading'],
  },
  {
    index: 5, label: 'Show Off!', mode: 'arrange', digits: [1, 2, 3], mixed: true, placeBoxes: false,
    pitfalls: ['single-digit', 'digit-trap', 'digit-count', 'zero', 'twins', 'second', 'third'], easyPitfalls: ['digit-count', 'leading'],
  },
];

export interface NumberSet {
  /** Display order, left to right in the tray. Never already greatest-first. */
  numbers: number[];
  /** The pitfall this set was built around. */
  focus: Pitfall;
}

const RANGES: Record<1 | 2 | 3, [number, number]> = { 1: [1, 9], 2: [10, 99], 3: [100, 999] };

function numberWithDigits(rng: Rng, digits: 1 | 2 | 3): number {
  const [lo, hi] = RANGES[digits];
  return randInt(rng, lo, hi);
}

/** Two-digit or three-digit number from parts, e.g. (6, 2, 5) is 625. */
const fromDigits = (...d: number[]): number => d.reduce((n, digit) => n * 10 + digit, 0);

/** A pair that tests `pitfall`, using only the allowed digit counts. Null when the level can't make it. */
function pairFor(pitfall: Pitfall, level: LevelDef, rng: Rng): [number, number] | null {
  const allow = (d: 1 | 2 | 3) => level.digits.includes(d);
  for (let i = 0; i < 400; i++) {
    let pair: [number, number] | null = null;
    switch (pitfall) {
      case 'single-digit': {
        if (!allow(1)) return null;
        const longer = pick(rng, level.digits.filter((d) => d > 1));
        const big = numberWithDigits(rng, longer);
        // The trap version: the lone digit is at least the other's first digit (7 vs 152).
        pair = [randInt(rng, leadingDigit(big), 9), big];
        break;
      }
      case 'digit-trap':
      case 'digit-count': {
        if (!allow(2) || !allow(3)) return null;
        pair = [numberWithDigits(rng, 2), numberWithDigits(rng, 3)];
        break;
      }
      case 'zero': {
        if (!allow(3)) return null;
        const h = randInt(rng, 1, 9);
        const t = randInt(rng, 1, 9);
        const o = randInt(rng, 1, 9);
        // Either 405 vs 450 (zero in the tens) or 340 vs 346 (zero in the ones).
        pair = rng() < 0.6 ? [fromDigits(h, 0, o), fromDigits(h, o, 0)] : [fromDigits(h, t, 0), fromDigits(h, t, o)];
        break;
      }
      case 'twins': {
        const d = pick(rng, level.digits.filter((n) => n > 1));
        if (!d) return null;
        const digits = shuffle(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, d);
        pair = [fromDigits(...digits), fromDigits(...[...digits].reverse())];
        break;
      }
      case 'leading':
      case 'second':
      case 'third': {
        if (pitfall === 'third' && !allow(3)) return null;
        const counts = level.digits.filter((n) => n > 1 && (pitfall !== 'third' || n === 3));
        const d = pick(rng, counts);
        pair = [numberWithDigits(rng, d), numberWithDigits(rng, d)];
        break;
      }
    }
    if (pair && pair[0] !== pair[1] && classifyPair(pair[0], pair[1]) === pitfall) return pair;
  }
  return null;
}

/**
 * Hand-picked sets that pack several tricky comparisons together: 99 vs 100, zeros holding places,
 * the same digits shuffled, and numbers where the hundreds and tens match so the ones decide.
 */
export const TRICKY_SETS: readonly (readonly number[])[] = [
  [99, 100, 101, 110],
  [70, 107, 170, 17],
  [909, 990, 99, 900],
  [405, 450, 45, 504],
  [808, 880, 88, 800],
  [111, 11, 101, 110],
  [300, 30, 303, 330],
  [519, 591, 159, 195],
  [128, 182, 812, 821],
  [600, 60, 606, 660],
  [210, 201, 120, 102],
  [998, 989, 899, 99],
  [413, 418, 411, 41],
  [762, 767, 765, 76],
  [347, 342, 349, 34],
  [515, 551, 155, 51],
  [256, 625, 652, 562],
  [252, 512, 625, 652],
  [7, 70, 700, 77],
  [9, 90, 109, 19],
  [5, 50, 105, 15],
];

/**
 * Close calls: three numbers that share the hundreds (and for `third`, the tens too),
 * so he has to keep looking to the right. Plus one number to round out the set.
 */
function closeCluster(pitfall: 'second' | 'third', rng: Rng): number[] {
  const h = randInt(rng, 1, 9);
  const digits = shuffle(rng, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  if (pitfall === 'third') {
    const t = randInt(rng, 0, 9);
    return digits.slice(0, 3).map((o) => fromDigits(h, t, o));
  }
  // Same hundreds, different tens.
  return digits.slice(0, 3).map((t) => fromDigits(h, t, randInt(rng, 0, 9)));
}

/** Chance a round uses a hand-picked tricky set or a close-call cluster, when the level allows it. */
const TRICKY_CHANCE = 0.3;
const CLUSTER_CHANCE = 0.5;
const TRICKY_FOCUS: readonly Pitfall[] = ['zero', 'twins', 'digit-trap', 'single-digit', 'third', 'second'];

/** Four shuffled same-digit numbers for a tricky twins set, like 256, 625, 652, 562. */
function twinQuartet(rng: Rng): number[] {
  const [a, b, c] = shuffle(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3);
  const perms = [[a, b, c], [a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a]].map((p) => fromDigits(...p));
  return shuffle(rng, perms).slice(0, SET_SIZE);
}

function filler(rng: Rng, level: LevelDef, have: number[]): number {
  let digits = pick(rng, level.digits);
  // Mixed levels make sure both two-digit and three-digit numbers appear.
  if (level.mixed && have.length === SET_SIZE - 1) {
    if (!have.some((n) => digitCount(n) === 2)) digits = 2;
    else if (!have.some((n) => digitCount(n) === 3)) digits = 3;
  }
  return numberWithDigits(rng, digits);
}

function valid(numbers: number[], level: LevelDef): boolean {
  if (new Set(numbers).size !== SET_SIZE) return false;
  if (!numbers.every((n) => level.digits.includes(digitCount(n) as 1 | 2 | 3))) return false;
  if (level.mixed && !(numbers.some((n) => digitCount(n) === 2) && numbers.some((n) => digitCount(n) === 3))) return false;
  if (level.requires && !setPitfalls(numbers).has(level.requires)) return false;
  return true;
}

const sameSet = (a: readonly number[], b: readonly number[]) => greatestFirst(a).join() === greatestFirst(b).join();

/** Display order that isn't already greatest to least, so there's always something to do. */
function scramble(rng: Rng, numbers: number[]): number[] {
  const sorted = greatestFirst(numbers).join();
  for (let i = 0; i < 20; i++) {
    const order = shuffle(rng, numbers);
    if (order.join() !== sorted) return order;
  }
  return greatestFirst(numbers).reverse();
}

/**
 * Build a set of four different numbers that tests `focus`.
 * Falls back to the level's easiest pitfall if the level can't make it. Never repeats `avoid`.
 */
export function generateSet(focus: Pitfall, level: LevelDef, rng: Rng, avoid?: readonly number[]): NumberSet {
  const wanted = level.pitfalls.includes(focus) || level.easyPitfalls.includes(focus) ? focus : level.easyPitfalls[0];
  for (let attempt = 0; attempt < 200; attempt++) {
    let numbers: number[];
    const tricky = TRICKY_SETS.filter((t) => valid([...t], level) && setPitfalls(t).has(wanted));
    if (TRICKY_FOCUS.includes(wanted) && level.index >= 3 && tricky.length > 0 && rng() < TRICKY_CHANCE) {
      numbers = [...pick(rng, tricky)];
    } else if ((wanted === 'third' || wanted === 'second') && level.digits.includes(3) && rng() < CLUSTER_CHANCE) {
      numbers = closeCluster(wanted, rng);
      while (numbers.length < SET_SIZE) numbers.push(filler(rng, level, numbers));
    } else if (wanted === 'twins' && level.digits.includes(3) && !level.mixed && rng() < 0.5) {
      // Three-digit twins sometimes come as a whole family of shuffled digits, like the homework.
      numbers = twinQuartet(rng);
    } else {
      const pair = pairFor(wanted, level, rng) ?? pairFor(level.easyPitfalls[0], level, rng);
      if (!pair) continue;
      numbers = [...pair];
      while (numbers.length < SET_SIZE) numbers.push(filler(rng, level, numbers));
    }
    if (!valid(numbers, level)) continue;
    if (avoid && sameSet(numbers, avoid)) continue;
    const focusFound = setPitfalls(numbers).has(wanted) ? wanted : level.easyPitfalls[0];
    return { numbers: scramble(rng, numbers), focus: focusFound };
  }
  // Practically unreachable; a guaranteed-valid set for the level.
  const fallback: Record<string, number[]> = { '2': [45, 82, 17, 63], '3': [512, 652, 252, 625] };
  const key = level.digits.length === 1 ? String(level.digits[0]) : 'mixed';
  return { numbers: fallback[key] ?? [195, 76, 237, 45], focus: level.easyPitfalls[0] };
}
