/** One stop on Hops' trip along the number line. */
export interface HopStop {
  value: number;
  /** Big jump of ten, or a little jump of one. */
  size: 'ten' | 'one';
  /** Count this one out loud (we skip some ones so long trips stay snappy). */
  spoken: boolean;
}

/** Most ones hops we count aloud one by one before only saying the final number. */
const MAX_SPOKEN_ONES = 4;

/**
 * Hops from 0 to `target`: jumps of ten first, then ones.
 * Small ranges (up to 10) count by ones all the way.
 */
export function hopPlan(target: number, rangeMax: number): HopStop[] {
  const stops: HopStop[] = [];
  if (target <= 0) return stops;
  const byTens = rangeMax > 10;
  const tens = byTens ? Math.floor(target / 10) : 0;
  for (let t = 1; t <= tens; t++) stops.push({ value: t * 10, size: 'ten', spoken: true });
  const start = tens * 10;
  const ones = target - start;
  for (let o = 1; o <= ones; o++) {
    const value = start + o;
    stops.push({ value, size: 'one', spoken: !byTens || ones <= MAX_SPOKEN_ONES || o === ones });
  }
  return stops;
}
