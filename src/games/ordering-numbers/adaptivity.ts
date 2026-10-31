import { type Rng, weightedPick } from '../../shared/random';
import type { Pitfall } from './places';
import type { LevelDef } from './sets';

export interface PitfallStats {
  seen: number;
  firstTry: number;
}

export type StatsByPitfall = Partial<Record<string, PitfallStats>>;

/** Every Nth round (starting at 0) is an easy win. */
export const EASY_EVERY = 3;
/** The pitfalls behind his homework trouble get extra practice once warmed up. */
const TRAP_PITFALLS: readonly Pitfall[] = ['digit-trap', 'single-digit'];
const TRAP_BOOST = 2;
const WARMUP_ROUNDS = 1;
const MISS_WEIGHT = 3;
const CONFIDENT_ACCURACY = 0.8;
const CONFIDENT_MIN_SEEN = 4;

/** Laplace-smoothed miss rate: unseen pitfalls start at 0.5. */
export function missRate(stats: PitfallStats | undefined): number {
  const seen = stats?.seen ?? 0;
  const firstTry = stats?.firstTry ?? 0;
  return (seen - firstTry + 1) / (seen + 2);
}

export function isConfident(stats: PitfallStats | undefined): boolean {
  return !!stats && stats.seen >= CONFIDENT_MIN_SEEN && stats.firstTry / stats.seen >= CONFIDENT_ACCURACY;
}

export interface PickContext {
  level: LevelDef;
  stats: StatsByPitfall;
  roundIndex: number;
  lastWasMiss: boolean;
}

export function isEasyRound(ctx: Pick<PickContext, 'roundIndex' | 'lastWasMiss'>): boolean {
  return ctx.roundIndex % EASY_EVERY === 0 || ctx.lastWasMiss;
}

/** Weights for each pitfall this round: more of what he misses, with easy wins mixed in. */
export function pitfallWeights(ctx: PickContext): Partial<Record<Pitfall, number>> {
  const { level, stats, roundIndex } = ctx;
  const weights: Partial<Record<Pitfall, number>> = {};
  if (isEasyRound(ctx)) {
    for (const p of level.easyPitfalls) weights[p] = 1;
    for (const p of level.pitfalls) if (isConfident(stats[p])) weights[p] = 1;
    return weights;
  }
  for (const p of level.pitfalls) {
    let w = 1 + MISS_WEIGHT * missRate(stats[p]);
    if (TRAP_PITFALLS.includes(p) && roundIndex >= WARMUP_ROUNDS) w *= TRAP_BOOST;
    weights[p] = w;
  }
  return weights;
}

export function pickPitfall(ctx: PickContext, rng: Rng): Pitfall {
  return weightedPick(rng, pitfallWeights(ctx));
}
