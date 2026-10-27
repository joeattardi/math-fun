import { describe, expect, it } from 'vitest';
import { seededRng } from '../src/shared/random';
import { answer, createRound, currentAsk, summarySentences, targetFor, wasFirstTry } from '../src/games/greater-or-less/round';

const pair = { a: 28, b: 51, type: 'trap' as const };

describe('round', () => {
  it('asks both terms, in either order', () => {
    const orders = new Set<string>();
    const rng = seededRng(1);
    for (let i = 0; i < 50; i++) {
      const r = createRound(pair, rng);
      expect([...r.order].sort()).toEqual(['greater', 'less']);
      orders.add(r.order.join());
    }
    expect(orders.size).toBe(2);
  });

  it('a wrong answer keeps the same question for a retry', () => {
    const r = createRound(pair, () => 0); // greater first
    expect(currentAsk(r)).toBe('greater');
    expect(answer(r, 28)).toEqual({ kind: 'wrong', ask: 'greater' });
    expect(currentAsk(r)).toBe('greater');
    expect(targetFor(r)).toBe(51);
    expect(answer(r, 51)).toEqual({ kind: 'correct', ask: 'greater', recovered: true, roundDone: false });
    expect(currentAsk(r)).toBe('less');
    expect(answer(r, 28)).toEqual({ kind: 'correct', ask: 'less', recovered: false, roundDone: true });
    expect(wasFirstTry(r)).toBe(false);
  });

  it('first try when both answers are right', () => {
    const r = createRound(pair, () => 0.9); // less first
    expect(currentAsk(r)).toBe('less');
    answer(r, 28);
    answer(r, 51);
    expect(wasFirstTry(r)).toBe(true);
    expect(currentAsk(r)).toBeNull();
  });

  it('says the full sentences', () => {
    expect(summarySentences(pair)).toEqual(['51 is greater than 28!', '28 is less than 51!']);
  });
});
