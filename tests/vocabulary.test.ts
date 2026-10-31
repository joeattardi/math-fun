import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { chompLines } from '../src/games/greater-or-less/lines/chomp';
import { waddlesLines } from '../src/games/greater-or-less/lines/waddles';
import { hopsLines } from '../src/games/greater-or-less/lines/hops';
import { hintConclusion } from '../src/games/greater-or-less/lines/praise';
import { explainPair } from '../src/games/ordering-numbers/explain';
import { chompLines as onChomp } from '../src/games/ordering-numbers/lines/chomp';
import { hopsLines as onHops } from '../src/games/ordering-numbers/lines/hops';
import { waddlesLines as onWaddles } from '../src/games/ordering-numbers/lines/waddles';
import { TEACH_STEPS } from '../src/games/ordering-numbers/teach/script';

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

describe('ordering numbers vocabulary', () => {
  const banks = { chomp: onChomp, waddles: onWaddles, hops: onHops };
  for (const [name, bank] of Object.entries(banks)) {
    for (const [situation, lines] of Object.entries(bank)) {
      it(`${name} ${situation} has at least 15 unique lines`, () => {
        expect(lines.length).toBeGreaterThanOrEqual(15);
        expect(new Set(lines).size).toBe(lines.length);
      });
    }
    it(`${name} only uses known placeholders`, () => {
      for (const line of Object.values(bank).flat() as string[]) {
        for (const m of line.matchAll(/\{(\w+)\}/g)) expect(['n', 'streak']).toContain(m[1]);
      }
    });
  }

  it('the teach flow uses greatest and least, and left and right', () => {
    const all = TEACH_STEPS.flatMap((s) => [...s.intro, ...(s.outro ?? [])].map((l) => l.say)).join(' ');
    expect(all).toMatch(/greatest to least/);
    expect(all).toMatch(/\bleft\b/);
    expect(all).toMatch(/\bright\b/);
    expect(all).toMatch(/0 hundreds/);
  });

  it('hint explanations say "greater than" and name places', () => {
    expect(explainPair(76, 195).sentences).toEqual([
      '76 has no hundreds. That means 0 hundreds! 195 has 1 hundred.',
      'So 195 is greater than 76!',
    ]);
    expect(explainPair(652, 625).sentences).toEqual([
      'Hundreds: both have 6. Same! Check the next place.',
      'Tens: 652 has 5 tens, and 625 has 2 tens.',
      'So 652 is greater than 625!',
    ]);
    expect(explainPair(7, 152).sentences[0]).toBe('7 has no hundreds. That means 0 hundreds! 152 has 1 hundred.');
    expect(explainPair(45, 49).sentences[0]).toBe('Tens: both have 4. Same! Check the next place.');
  });
});
