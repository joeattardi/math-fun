import { type Rng, weightedPick } from '../../shared/random';
import type { LevelDef, QuestionType } from './questions';

export interface TypeStats {
  seen: number;
  firstTry: number;
}

export type StatsByType = Partial<Record<string, TypeStats>>;

/** Rounds before traps get their extra boost, so each level starts with warm-ups. */
export const WARMUP_ROUNDS = 2;
/** Every Nth round (starting at 0) is an easy win. */
export const EASY_EVERY = 3;
const TRAP_BOOST = 2;
const MISS_WEIGHT = 3;
const CONFIDENT_ACCURACY = 0.8;
const CONFIDENT_MIN_SEEN = 3;

/** Laplace-smoothed miss rate: unseen types start at 0.5. */
export function missRate(stats: TypeStats | undefined): number {
  const seen = stats?.seen ?? 0;
  const firstTry = stats?.firstTry ?? 0;
  return (seen - firstTry + 1) / (seen + 2);
}

export function isConfident(stats: TypeStats | undefined): boolean {
  return !!stats && stats.seen >= CONFIDENT_MIN_SEEN && stats.firstTry / stats.seen >= CONFIDENT_ACCURACY;
}

export interface PickContext {
  level: LevelDef;
  stats: StatsByType;
  roundIndex: number;
  lastWasMiss: boolean;
}

export function isEasyRound(ctx: Pick<PickContext, 'roundIndex' | 'lastWasMiss'>): boolean {
  return ctx.roundIndex % EASY_EVERY === 0 || ctx.lastWasMiss;
}

/** Weights for each type this round. Exposed for tests and the parent stats screen. */
export function typeWeights(ctx: PickContext): Partial<Record<QuestionType, number>> {
  const { level, stats, roundIndex } = ctx;
  const weights: Partial<Record<QuestionType, number>> = {};

  if (isEasyRound(ctx)) {
    for (const t of level.easyTypes) weights[t] = 1;
    // Anything he's already confident with also counts as an easy win.
    for (const t of level.types) if (isConfident(stats[t])) weights[t] = 1;
    return weights;
  }

  for (const t of level.types) {
    let w = 1 + MISS_WEIGHT * missRate(stats[t]);
    if (t === 'trap' && roundIndex >= WARMUP_ROUNDS) w *= TRAP_BOOST;
    weights[t] = w;
  }
  return weights;
}

export function pickType(ctx: PickContext, rng: Rng): QuestionType {
  return weightedPick(rng, typeWeights(ctx));
}
