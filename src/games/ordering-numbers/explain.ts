import { type Place, type PlaceStep, comparisonSteps } from './places';

const SINGULAR: Record<Place, string> = { hundreds: 'hundred', tens: 'ten', ones: 'one' };

/** "1 hundred", "0 hundreds", "7 tens". */
export function countOf(digit: number, place: Place): string {
  return `${digit} ${digit === 1 ? SINGULAR[place] : place}`;
}

/** One spoken sentence per column checked, ending with the place that decides it. */
function stepSentence(step: PlaceStep, greater: number, less: number): string {
  const { place } = step;
  if (step.same) return `${capital(place)}: both have ${step.greater}. Same! Check the next place.`;
  if (step.lessEmpty) {
    return `${less} has no ${place}. That means ${countOf(0, place)}! ${greater} has ${countOf(step.greater, place)}.`;
  }
  return `${capital(place)}: ${greater} has ${countOf(step.greater, place)}, and ${less} has ${countOf(step.less, place)}.`;
}

const capital = (s: string) => s[0].toUpperCase() + s.slice(1);

export interface Explanation {
  /** The columns highlighted one at a time, matching `sentences` before the conclusion. */
  steps: PlaceStep[];
  /** Spoken in order: one per step, then the conclusion. */
  sentences: string[];
  conclusion: string;
}

/**
 * The hint for "why is this one greater?": line them up and compare places from the left.
 * Always says "greater than" (see the vocabulary rules in CLAUDE.md).
 */
export function explainPair(x: number, y: number): Explanation {
  const greater = Math.max(x, y);
  const less = Math.min(x, y);
  const steps = comparisonSteps(greater, less);
  const conclusion = `So ${greater} is greater than ${less}!`;
  return { steps, sentences: [...steps.map((s) => stepSentence(s, greater, less)), conclusion], conclusion };
}
