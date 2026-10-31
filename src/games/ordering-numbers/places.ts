/** Place value helpers: digits, places, and how two numbers compare from the left. */

export const PLACES = ['hundreds', 'tens', 'ones'] as const;
export type Place = (typeof PLACES)[number];

/** Digits of n in the hundreds, tens and ones places (0 for an empty place). */
export function placeDigits(n: number): Record<Place, number> {
  return { hundreds: Math.floor(n / 100) % 10, tens: Math.floor(n / 10) % 10, ones: n % 10 };
}

export function digitCount(n: number): number {
  return n >= 100 ? 3 : n >= 10 ? 2 : 1;
}

/** The leading (leftmost written) digit, e.g. 7 for 76 and 1 for 195. */
export function leadingDigit(n: number): number {
  return Number(String(n)[0]);
}

/** Places that are empty when n is written, e.g. ['hundreds'] for 76. */
export function emptyPlaces(n: number): Place[] {
  return PLACES.slice(0, 3 - digitCount(n));
}

/** One column of the left-to-right comparison. */
export interface PlaceStep {
  place: Place;
  /** Digit of the greater number in this place. */
  greater: number;
  /** Digit of the lesser number in this place. */
  less: number;
  /** The lesser number has no digit written here (e.g. 76 in the hundreds place). */
  lessEmpty: boolean;
  same: boolean;
}

/**
 * Compare two different numbers the way his teacher does: line up the ones, then check
 * places from the left until one differs. Starts at the greater number's leading place.
 */
export function comparisonSteps(x: number, y: number): PlaceStep[] {
  if (x === y) throw new Error('comparisonSteps: numbers must differ');
  const g = Math.max(x, y);
  const l = Math.min(x, y);
  const gd = placeDigits(g);
  const ld = placeDigits(l);
  const lessEmpty = new Set(emptyPlaces(l));
  const steps: PlaceStep[] = [];
  for (const place of PLACES.slice(3 - digitCount(g))) {
    const same = gd[place] === ld[place];
    steps.push({ place, greater: gd[place], less: ld[place], lessEmpty: lessEmpty.has(place), same });
    if (!same) break;
  }
  return steps;
}

/** The place where the two numbers first differ. */
export function decidingPlace(x: number, y: number): Place {
  const steps = comparisonSteps(x, y);
  return steps[steps.length - 1].place;
}

/** Which tricky thing a pair of numbers tests. Every pair has exactly one. */
export const PITFALLS = ['single-digit', 'digit-trap', 'digit-count', 'zero', 'twins', 'leading', 'second', 'third'] as const;
export type Pitfall = (typeof PITFALLS)[number];

/** Parent stats names. */
export const PITFALL_NAMES: Record<Pitfall, string> = {
  'single-digit': '7 vs 152',
  'digit-trap': '76 vs 195 (trap)',
  'digit-count': '45 vs 537',
  zero: '405 vs 450',
  twins: '625 vs 652',
  leading: 'first digit',
  second: 'same first digit',
  third: 'ones decide',
};

function sameDigits(x: number, y: number): boolean {
  return digitCount(x) === digitCount(y) && [...String(x)].sort().join() === [...String(y)].sort().join();
}

/**
 * Classify a pair. Priority, from what trips him up most:
 * a single digit against more digits; fewer digits but a greater-or-equal first digit (the big one);
 * any other digit-count difference; a zero in the deciding place; shuffled digits;
 * then which place decides it.
 */
export function classifyPair(x: number, y: number): Pitfall {
  if (x === y) throw new Error('classifyPair: numbers must differ');
  const g = Math.max(x, y);
  const l = Math.min(x, y);
  if (digitCount(l) !== digitCount(g)) {
    if (digitCount(l) === 1) return 'single-digit';
    return leadingDigit(l) >= leadingDigit(g) ? 'digit-trap' : 'digit-count';
  }
  const last = comparisonSteps(g, l).at(-1)!;
  if (last.greater === 0 || last.less === 0) return 'zero';
  if (sameDigits(g, l)) return 'twins';
  const index = comparisonSteps(g, l).length;
  return index === 1 ? 'leading' : index === 2 ? 'second' : 'third';
}

/** Every pitfall tested by a set of numbers. */
export function setPitfalls(numbers: readonly number[]): Set<Pitfall> {
  const out = new Set<Pitfall>();
  for (let i = 0; i < numbers.length; i++) {
    for (let j = i + 1; j < numbers.length; j++) out.add(classifyPair(numbers[i], numbers[j]));
  }
  return out;
}

export const greatestFirst = (numbers: readonly number[]): number[] => [...numbers].sort((a, b) => b - a);
