import { describe, expect, it } from 'vitest';
import { seededRng } from '../src/shared/random';
import {
  LEVELS, QUESTION_TYPES, classify, generatePair, isReversal, isTrap, onesDigit, tensDigit,
} from '../src/games/greater-or-less/questions';

const SAMPLES = 400;

describe('classify', () => {
  it('matches the examples from the spec', () => {
    expect(classify(28, 51)).toBe('trap');
    expect(classify(39, 42)).toBe('trap');
    expect(classify(34, 67)).toBe('different-tens');
    expect(classify(43, 47)).toBe('same-tens');
    expect(classify(28, 82)).toBe('reversal');
    expect(classify(3, 15)).toBe('within-20');
    expect(classify(9, 12)).toBe('trap');
  });

  it('rejects equal numbers', () => {
    expect(() => classify(5, 5)).toThrow();
  });
});

describe('generatePair', () => {
  for (const level of LEVELS) {
    for (const type of level.types) {
      it(`level ${level.label}: ${type} pairs are valid`, () => {
        const rng = seededRng(level.index * 100 + QUESTION_TYPES.indexOf(type));
        for (let i = 0; i < SAMPLES; i++) {
          const p = generatePair(type, level, rng);
          expect(p.a).not.toBe(p.b);
          expect(Math.min(p.a, p.b)).toBeGreaterThanOrEqual(0);
          expect(Math.max(p.a, p.b)).toBeLessThanOrEqual(level.max);
          expect(p.type).toBe(classify(p.a, p.b));
          expect(p.type).toBe(type);
        }
      });
    }
  }

  it('trap pairs always satisfy the definition', () => {
    const rng = seededRng(42);
    for (const level of LEVELS.filter((l) => l.types.includes('trap'))) {
      for (let i = 0; i < SAMPLES; i++) {
        const p = generatePair('trap', level, rng);
        const lo = Math.min(p.a, p.b);
        const hi = Math.max(p.a, p.b);
        expect(isTrap(p.a, p.b)).toBe(true);
        expect(tensDigit(lo)).not.toBe(tensDigit(hi));
        expect(onesDigit(lo)).toBeGreaterThan(onesDigit(hi));
      }
    }
  });

  it('different-tens: the greater number has the greater ones digit', () => {
    const rng = seededRng(7);
    for (let i = 0; i < SAMPLES; i++) {
      const p = generatePair('different-tens', LEVELS[3], rng);
      const lo = Math.min(p.a, p.b);
      const hi = Math.max(p.a, p.b);
      expect(tensDigit(lo)).not.toBe(tensDigit(hi));
      expect(onesDigit(hi)).toBeGreaterThan(onesDigit(lo));
    }
  });

  it('reversal pairs swap digits', () => {
    const rng = seededRng(9);
    for (let i = 0; i < SAMPLES; i++) {
      const p = generatePair('reversal', LEVELS[3], rng);
      expect(isReversal(p.a, p.b)).toBe(true);
    }
  });

  it('falls back to an easy type when a type is not in the level', () => {
    const p = generatePair('reversal', LEVELS[0], seededRng(1));
    expect(p.type).toBe('within-20');
    expect(Math.max(p.a, p.b)).toBeLessThanOrEqual(10);
  });

  it('never repeats the previous pair', () => {
    const rng = seededRng(3);
    let prev = generatePair('within-20', LEVELS[0], rng);
    for (let i = 0; i < SAMPLES; i++) {
      const p = generatePair('within-20', LEVELS[0], rng, prev);
      expect([Math.min(p.a, p.b), Math.max(p.a, p.b)]).not.toEqual([Math.min(prev.a, prev.b), Math.max(prev.a, prev.b)]);
      prev = p;
    }
  });

  it('puts the greater number on both sides', () => {
    const rng = seededRng(5);
    let left = 0;
    for (let i = 0; i < SAMPLES; i++) {
      const p = generatePair('trap', LEVELS[3], rng);
      if (p.a > p.b) left++;
    }
    expect(left).toBeGreaterThan(SAMPLES * 0.35);
    expect(left).toBeLessThan(SAMPLES * 0.65);
  });
});
