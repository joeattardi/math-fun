import { describe, expect, it } from 'vitest';
import { seededRng } from '../src/shared/random';
import { LEVELS, ROUNDS_PER_LEVEL, type QuestionType } from '../src/games/greater-or-less/questions';
import { isEasyRound, missRate, pickType, typeWeights, type StatsByType } from '../src/games/greater-or-less/adaptivity';

function simulateLevels(stats: StatsByType, levelIndex: number, levels = 300) {
  const rng = seededRng(11);
  const counts: Partial<Record<QuestionType, number>> = {};
  let easy = 0;
  for (let l = 0; l < levels; l++) {
    for (let r = 0; r < ROUNDS_PER_LEVEL; r++) {
      const ctx = { level: LEVELS[levelIndex], stats, roundIndex: r, lastWasMiss: false };
      const t = pickType(ctx, rng);
      counts[t] = (counts[t] ?? 0) + 1;
      if (LEVELS[levelIndex].easyTypes.includes(t)) easy++;
    }
  }
  return { counts, easyShare: easy / (levels * ROUNDS_PER_LEVEL) };
}

describe('adaptivity', () => {
  it('missRate is smoothed', () => {
    expect(missRate(undefined)).toBe(0.5);
    expect(missRate({ seen: 10, firstTry: 10 })).toBeLessThan(0.1);
    expect(missRate({ seen: 10, firstTry: 0 })).toBeGreaterThan(0.9);
  });

  it('level 1 only serves within-20', () => {
    const { counts } = simulateLevels({}, 0, 20);
    expect(Object.keys(counts)).toEqual(['within-20']);
  });

  it('starts every level with an easy win', () => {
    expect(isEasyRound({ roundIndex: 0, lastWasMiss: false })).toBe(true);
    const w = typeWeights({ level: LEVELS[3], stats: {}, roundIndex: 0, lastWasMiss: false });
    expect(Object.keys(w).sort()).toEqual(['different-tens', 'within-20']);
  });

  it('serves an easy win right after a miss', () => {
    const w = typeWeights({ level: LEVELS[3], stats: {}, roundIndex: 4, lastWasMiss: true });
    expect(w.trap).toBeUndefined();
  });

  it('weights missed types more', () => {
    const stats: StatsByType = { trap: { seen: 20, firstTry: 2 }, 'same-tens': { seen: 20, firstTry: 19 } };
    const w = typeWeights({ level: LEVELS[3], stats, roundIndex: 4, lastWasMiss: false });
    expect(w.trap!).toBeGreaterThan(w['same-tens']! * 2);
  });

  it('a struggling player still gets mostly achievable rounds', () => {
    const stats: StatsByType = {
      trap: { seen: 30, firstTry: 3 },
      reversal: { seen: 30, firstTry: 6 },
      'within-20': { seen: 30, firstTry: 29 },
      'different-tens': { seen: 30, firstTry: 27 },
      'same-tens': { seen: 30, firstTry: 26 },
    };
    const { counts, easyShare } = simulateLevels(stats, 3);
    const total = ROUNDS_PER_LEVEL * 300;
    const achievable = (counts['within-20'] ?? 0) + (counts['different-tens'] ?? 0) + (counts['same-tens'] ?? 0);
    expect(easyShare).toBeGreaterThan(0.3);
    expect(achievable / total).toBeGreaterThan(0.55);
    expect(achievable / total).toBeLessThan(0.8);
    // Traps are still served often, since they're the main stumbling block.
    expect((counts.trap ?? 0) / total).toBeGreaterThan(0.2);
  });
});
