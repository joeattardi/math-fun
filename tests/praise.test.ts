import { describe, expect, it } from 'vitest';
import { LinePicker, fillTemplate } from '../src/shared/praise';
import { seededRng } from '../src/shared/random';
import * as praise from '../src/games/greater-or-less/lines/praise';

describe('LinePicker', () => {
  it('never repeats a line twice in a row', () => {
    const picker = new LinePicker(seededRng(2));
    const lines = ['a', 'b', 'c'];
    let prev = '';
    for (let i = 0; i < 300; i++) {
      const line = picker.pick('x', lines);
      expect(line).not.toBe(prev);
      prev = line;
    }
  });

  it('uses every line before repeating', () => {
    const picker = new LinePicker(seededRng(3));
    const lines = Array.from({ length: 10 }, (_, i) => `line ${i}`);
    const seen = new Set(Array.from({ length: 10 }, () => picker.pick('y', lines)));
    expect(seen.size).toBe(10);
  });

  it('handles a single-line bank', () => {
    const picker = new LinePicker();
    expect(picker.pick('z', ['only'])).toBe('only');
    expect(picker.pick('z', ['only'])).toBe('only');
  });

  it('fills templates', () => {
    expect(fillTemplate('{greater} is greater than {less}!', { greater: 51, less: 28 })).toBe('51 is greater than 28!');
  });
});

describe('praise banks', () => {
  it('has at least 40 praise lines', () => {
    const total = praise.strategyPraise.length + praise.effortPraise.length + praise.goofyPraise.length;
    expect(total).toBeGreaterThanOrEqual(40);
  });

  it('has no duplicate lines', () => {
    const all = [...praise.strategyPraise, ...praise.effortPraise, ...praise.goofyPraise, ...praise.recoveryPraise];
    expect(new Set(all).size).toBe(all.length);
  });
});
