import type { Rng } from '../../shared/random';
import { type Pair, greaterOf, lessOf } from './questions';

export type Ask = 'greater' | 'less';

export interface RoundState {
  pair: Pair;
  order: [Ask, Ask];
  /** 0 = first question, 1 = second question, 2 = done. */
  step: 0 | 1 | 2;
  /** Misses for each of the two questions. */
  misses: [number, number];
  /** A hint (automatic or "Show me!") was shown during this round. */
  hintUsed: boolean;
}

export type AnswerResult =
  | { kind: 'correct'; ask: Ask; recovered: boolean; roundDone: boolean }
  | { kind: 'wrong'; ask: Ask };

export function createRound(pair: Pair, rng: Rng): RoundState {
  const order: [Ask, Ask] = rng() < 0.5 ? ['greater', 'less'] : ['less', 'greater'];
  return { pair, order, step: 0, misses: [0, 0], hintUsed: false };
}

export function currentAsk(state: RoundState): Ask | null {
  return state.step === 2 ? null : state.order[state.step];
}

export function targetFor(state: RoundState): number | null {
  const ask = currentAsk(state);
  if (!ask) return null;
  return ask === 'greater' ? greaterOf(state.pair) : lessOf(state.pair);
}

/** Apply a tap. Mutates and returns the result. Wrong answers keep the same step so he retries. */
export function answer(state: RoundState, tapped: number): AnswerResult {
  const ask = currentAsk(state);
  if (!ask) throw new Error('answer: round is already done');
  const stepIndex = state.step as 0 | 1;
  if (tapped !== targetFor(state)) {
    state.misses[stepIndex]++;
    return { kind: 'wrong', ask };
  }
  const recovered = state.misses[stepIndex] > 0;
  state.step = (state.step + 1) as 1 | 2;
  return { kind: 'correct', ask, recovered, roundDone: state.step === 2 };
}

export function markHint(state: RoundState): void {
  state.hintUsed = true;
}

/** First-try means no misses on either question. Hints from "Show me!" don't count against him. */
export function wasFirstTry(state: RoundState): boolean {
  return state.misses[0] === 0 && state.misses[1] === 0;
}

/** The answer review, in the order the round asked: e.g. less first gives "28 is less than 51!" then "51 is greater than 28!". */
export function summarySentences(pair: Pair, order: readonly [Ask, Ask] = ['greater', 'less']): [string, string] {
  const g = greaterOf(pair);
  const l = lessOf(pair);
  const sentence = (ask: Ask) => (ask === 'greater' ? `${g} is greater than ${l}!` : `${l} is less than ${g}!`);
  return [sentence(order[0]), sentence(order[1])];
}

/**
 * The whole spoken question, nothing more, in two parts spoken with a pause between:
 * "Which number is greater?" then "28 or 51?" (left card, then right card).
 */
export function questionParts(ask: Ask, a: number, b: number): [string, string] {
  return [`Which number is ${ask}?`, `${a} or ${b}?`];
}
