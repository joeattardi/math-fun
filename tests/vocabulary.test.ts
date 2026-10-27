import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { chompLines } from '../src/games/greater-or-less/lines/chomp';
import { waddlesLines } from '../src/games/greater-or-less/lines/waddles';
import { hopsLines } from '../src/games/greater-or-less/lines/hops';
import { hintConclusion } from '../src/games/greater-or-less/lines/praise';

const FORBIDDEN = /\b(bigger|biggest|smaller|smallest|larger|largest|tinier|tiniest|more than|fewer than|less big)\b/i;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe('vocabulary', () => {
  it('no source file uses bigger/smaller/larger style words', () => {
    const offenders = walk('src')
      .filter((f) => /\.(ts|html)$/.test(f))
      .flatMap((f) =>
        readFileSync(f, 'utf8')
          .split('\n')
          .map((line, i) => ({ f, i: i + 1, line }))
          .filter(({ line }) => FORBIDDEN.test(line)),
      );
    expect(offenders).toEqual([]);
  });

  const characters = { chomp: chompLines, waddles: waddlesLines, hops: hopsLines };
  for (const [name, bank] of Object.entries(characters)) {
    describe(name, () => {
      for (const [situation, lines] of Object.entries(bank)) {
        it(`${situation} has at least 15 unique lines`, () => {
          expect(lines.length).toBeGreaterThanOrEqual(15);
          expect(new Set(lines).size).toBe(lines.length);
        });
      }
      it('every question names the term', () => {
        for (const line of [...bank.ask, ...bank.askSecond]) expect(line).toContain('{term}');
      });
      it('only uses known placeholders', () => {
        const all = Object.values(bank).flat() as string[];
        for (const line of all) {
          for (const m of line.matchAll(/\{(\w+)\}/g)) expect(['term', 'other', 'n', 'greater', 'less', 'streak']).toContain(m[1]);
        }
      });
    });
  }

  it('hint conclusions use greater or less, and left or right', () => {
    for (const line of hintConclusion) {
      expect(line).toMatch(/greater|less/);
      expect(line).toMatch(/\b(left|right)\b/i);
    }
  });

  it('number line hints describe position with left and right, not "farther along"', () => {
    const hintLines = [...chompLines.hint, ...waddlesLines.hint, ...hopsLines.hint, ...hintConclusion];
    for (const line of hintLines) expect(line).not.toMatch(/farther along|how far|goes farther|closer to zero/i);
  });
});
