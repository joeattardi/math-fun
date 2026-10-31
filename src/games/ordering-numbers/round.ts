import { type Pitfall, classifyPair, greatestFirst } from './places';
import { type Mode, SET_SIZE } from './sets';

/**
 * One round: four numbers go into four slots, greatest on the left, least on the right.
 * In 'pick' mode every tap is checked right away. In 'arrange' mode he fills all the slots
 * (and can tap a placed card to take it back), then checks.
 */
export interface RoundState {
  mode: Mode;
  /** Tray order, left to right. */
  numbers: readonly number[];
  /** The answer, greatest first. */
  sorted: readonly number[];
  slots: (number | null)[];
  /** Arrange mode: slots confirmed by a check, which can't be taken back. */
  locked: boolean[];
  /** Wrong picks (pick mode) or wrong checks (arrange mode) this round. */
  misses: number;
  /** Wrong picks on the current pick-mode step, for stronger hints on a second miss. */
  stepMisses: number;
  hintUsed: boolean;
}

export type PickResult =
  | { kind: 'correct'; slot: number; recovered: boolean; last: boolean; roundDone: boolean }
  | { kind: 'wrong'; picked: number; target: number; pitfall: Pitfall; stepMisses: number };

export type CheckResult =
  | { kind: 'correct'; recovered: boolean }
  | {
      kind: 'wrong';
      /** Slots that were right; they lock in place. */
      kept: number[];
      /** Slots that were wrong; their cards go back to the tray. */
      returned: number[];
      /** The first mistake, left to right: `target` belongs where `placed` is. */
      placed: number;
      target: number;
      pitfall: Pitfall;
    };

export function createRound(numbers: readonly number[], mode: Mode): RoundState {
  if (numbers.length !== SET_SIZE || new Set(numbers).size !== SET_SIZE) throw new Error('createRound: need four different numbers');
  return {
    mode,
    numbers: [...numbers],
    sorted: greatestFirst(numbers),
    slots: Array(SET_SIZE).fill(null),
    locked: Array(SET_SIZE).fill(false),
    misses: 0,
    stepMisses: 0,
    hintUsed: false,
  };
}

/** Numbers still in the tray, in tray order. */
export function remaining(state: RoundState): number[] {
  return state.numbers.filter((n) => !state.slots.includes(n));
}

export const filledCount = (state: RoundState): number => state.slots.filter((s) => s !== null).length;
export const firstEmptySlot = (state: RoundState): number => state.slots.indexOf(null);
export const isDone = (state: RoundState): boolean => state.slots.every((s, i) => s === state.sorted[i]);

/** Pick mode: the number that belongs in the next slot. */
export function target(state: RoundState): number | null {
  const slot = firstEmptySlot(state);
  return slot < 0 ? null : state.sorted[slot];
}

/** Pick mode: tap a tray number. A wrong pick stays in the tray so he can try again. */
export function pickNumber(state: RoundState, n: number): PickResult {
  if (state.mode !== 'pick') throw new Error('pickNumber: not a pick round');
  const t = target(state);
  if (t === null) throw new Error('pickNumber: round is already done');
  if (!remaining(state).includes(n)) throw new Error('pickNumber: number is not in the tray');
  if (n !== t) {
    state.misses++;
    state.stepMisses++;
    return { kind: 'wrong', picked: n, target: t, pitfall: classifyPair(n, t), stepMisses: state.stepMisses };
  }
  const slot = firstEmptySlot(state);
  const recovered = state.stepMisses > 0;
  state.slots[slot] = n;
  state.stepMisses = 0;
  return { kind: 'correct', slot, recovered, last: slot === SET_SIZE - 1, roundDone: isDone(state) };
}

/**
 * The pitfalls a pick-mode step tests: each pairing of the right answer with the other tray numbers.
 * Used to credit first-try picks in the stats.
 */
export function stepPitfalls(state: RoundState): Pitfall[] {
  const t = target(state);
  if (t === null) return [];
  const others = remaining(state).filter((n) => n !== t);
  return [...new Set(others.map((n) => classifyPair(n, t)))];
}

/** Trickiest first: these get praise that names the trick he beat. */
const TRICKY_ORDER: readonly Pitfall[] = ['digit-trap', 'single-digit', 'zero', 'third', 'twins', 'second', 'digit-count'];

/**
 * Pick mode: the trickiest comparison in this step, e.g. 195 against 76 (the digit trap).
 * Null when nothing is tricky (or only one card is left).
 */
export function trickiestPair(state: RoundState): { pitfall: Pitfall; greater: number; less: number } | null {
  const t = target(state);
  if (t === null) return null;
  let best: { pitfall: Pitfall; greater: number; less: number } | null = null;
  for (const n of remaining(state)) {
    if (n === t) continue;
    const pitfall = classifyPair(n, t);
    const rank = TRICKY_ORDER.indexOf(pitfall);
    if (rank >= 0 && (!best || rank < TRICKY_ORDER.indexOf(best.pitfall))) best = { pitfall, greater: t, less: n };
  }
  return best;
}

/** Arrange mode: put a tray number in the first empty slot. Returns the slot, or -1. */
export function placeNumber(state: RoundState, n: number): number {
  if (!remaining(state).includes(n)) return -1;
  const slot = firstEmptySlot(state);
  if (slot >= 0) state.slots[slot] = n;
  return slot;
}

/** Arrange mode: take a card back to the tray. Locked slots stay. Returns the number, or null. */
export function takeBack(state: RoundState, slot: number): number | null {
  const n = state.slots[slot];
  if (n === null || state.locked[slot]) return null;
  state.slots[slot] = null;
  return n;
}

/** Arrange mode: check a full row. Right cards lock; wrong ones go back to the tray. */
export function check(state: RoundState): CheckResult {
  if (filledCount(state) < SET_SIZE) throw new Error('check: fill every slot first');
  const wrong = state.slots.map((n, i) => (n === state.sorted[i] ? -1 : i)).filter((i) => i >= 0);
  if (wrong.length === 0) {
    state.locked.fill(true);
    return { kind: 'correct', recovered: state.misses > 0 };
  }
  state.misses++;
  const first = wrong[0];
  const placed = state.slots[first]!;
  const t = state.sorted[first];
  const kept: number[] = [];
  state.slots.forEach((_, i) => {
    if (wrong.includes(i)) state.slots[i] = null;
    else {
      state.locked[i] = true;
      kept.push(i);
    }
  });
  return { kind: 'wrong', kept, returned: wrong, placed, target: t, pitfall: classifyPair(placed, t) };
}

export function markHint(state: RoundState): void {
  state.hintUsed = true;
}

/** First try means no wrong picks or checks. Hints he asks for don't count against him. */
export function wasFirstTry(state: RoundState): boolean {
  return state.misses === 0;
}

/** The finished order as one spoken line: "237, 195, 76, 45. Greatest to least!" */
export function summaryLine(state: RoundState): string {
  return `${state.sorted.join(', ')}. Greatest to least!`;
}
