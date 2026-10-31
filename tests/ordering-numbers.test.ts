import { describe, expect, it } from 'vitest';
import { seededRng } from '../src/shared/random';
import { isEasyRound, pickPitfall, pitfallWeights } from '../src/games/ordering-numbers/adaptivity';
import {
  PITFALLS, classifyPair, comparisonSteps, decidingPlace, digitCount, emptyPlaces, greatestFirst, placeDigits, setPitfalls,
} from '../src/games/ordering-numbers/places';
import {
  check, createRound, pickNumber, placeNumber, remaining, stepPitfalls, summaryLine, takeBack, target, trickiestPair, wasFirstTry,
} from '../src/games/ordering-numbers/round';
import { pitfallPraise } from '../src/games/ordering-numbers/lines/praise';
import { LEVELS, SET_SIZE, TRICKY_SETS, generateSet } from '../src/games/ordering-numbers/sets';

describe('places', () => {
  it('splits digits into places, with 0 for empty places', () => {
    expect(placeDigits(195)).toEqual({ hundreds: 1, tens: 9, ones: 5 });
    expect(placeDigits(76)).toEqual({ hundreds: 0, tens: 7, ones: 6 });
    expect(placeDigits(7)).toEqual({ hundreds: 0, tens: 0, ones: 7 });
    expect(emptyPlaces(76)).toEqual(['hundreds']);
    expect(emptyPlaces(7)).toEqual(['hundreds', 'tens']);
    expect(emptyPlaces(405)).toEqual([]);
  });

  it('compares from the left until a place differs', () => {
    expect(comparisonSteps(76, 195)).toEqual([{ place: 'hundreds', greater: 1, less: 0, lessEmpty: true, same: false }]);
    expect(comparisonSteps(625, 652).map((s) => [s.place, s.same])).toEqual([['hundreds', true], ['tens', false]]);
    expect(decidingPlace(518, 513)).toBe('ones');
    expect(decidingPlace(45, 49)).toBe('ones');
    expect(decidingPlace(45, 82)).toBe('tens');
    expect(() => comparisonSteps(5, 5)).toThrow();
  });

  it('classifies the homework pitfalls', () => {
    expect(classifyPair(76, 195)).toBe('digit-trap');
    expect(classifyPair(195, 76)).toBe('digit-trap');
    expect(classifyPair(89, 102)).toBe('digit-trap');
    expect(classifyPair(45, 237)).toBe('digit-trap');
    expect(classifyPair(45, 537)).toBe('digit-count');
    expect(classifyPair(7, 152)).toBe('single-digit');
    expect(classifyPair(405, 450)).toBe('zero');
    expect(classifyPair(340, 346)).toBe('zero');
    expect(classifyPair(625, 652)).toBe('twins');
    expect(classifyPair(28, 82)).toBe('twins');
    expect(classifyPair(252, 625)).toBe('leading');
    expect(classifyPair(45, 49)).toBe('second');
    expect(classifyPair(518, 513)).toBe('third');
  });
});

describe('set generation', () => {
  for (const level of LEVELS) {
    describe(level.label, () => {
      const rng = seededRng(level.index + 11);
      const sets = Array.from({ length: 300 }, (_, i) => generateSet(level.pitfalls[i % level.pitfalls.length], level, rng));

      it('makes four different numbers in range, never already in order', () => {
        for (const s of sets) {
          expect(s.numbers).toHaveLength(SET_SIZE);
          expect(new Set(s.numbers).size).toBe(SET_SIZE);
          for (const n of s.numbers) expect(level.digits).toContain(digitCount(n));
          expect(s.numbers.join()).not.toBe(greatestFirst(s.numbers).join());
        }
      });

      it('includes the pitfall it was built around', () => {
        for (const s of sets) expect(setPitfalls(s.numbers).has(s.focus)).toBe(true);
        for (const p of level.pitfalls) expect(sets.some((s) => s.focus === p)).toBe(true);
      });

      if (level.mixed) {
        it('always mixes two-digit and three-digit numbers', () => {
          for (const s of sets) {
            expect(s.numbers.some((n) => digitCount(n) === 2)).toBe(true);
            expect(s.numbers.some((n) => digitCount(n) === 3)).toBe(true);
          }
        });
      }
      if (level.requires) {
        it(`always includes ${level.requires}`, () => {
          for (const s of sets) expect(setPitfalls(s.numbers).has(level.requires!)).toBe(true);
        });
      }
    });
  }

  it('never repeats the previous set', () => {
    const rng = seededRng(5);
    let prev = generateSet('leading', LEVELS[0], rng);
    for (let i = 0; i < 200; i++) {
      const next = generateSet('leading', LEVELS[0], rng, prev.numbers);
      expect(greatestFirst(next.numbers).join()).not.toBe(greatestFirst(prev.numbers).join());
      prev = next;
    }
  });

  it('tricky sets are four different numbers, each packing a tricky comparison', () => {
    for (const t of TRICKY_SETS) {
      expect(new Set(t).size).toBe(SET_SIZE);
      const p = setPitfalls(t);
      expect(['zero', 'twins', 'digit-trap', 'single-digit', 'third'].some((x) => p.has(x as never))).toBe(true);
    }
  });

  it('later levels serve close calls where the hundreds and tens match and the ones decide', () => {
    const rng = seededRng(21);
    const sets = Array.from({ length: 200 }, () => generateSet('third', LEVELS[3], rng));
    const sharesTwo = (ns: number[]) => {
      const groups = new Map<number, number>();
      for (const n of ns.filter((n) => n >= 100)) groups.set(Math.floor(n / 10), (groups.get(Math.floor(n / 10)) ?? 0) + 1);
      return Math.max(0, ...groups.values()) >= 3;
    };
    expect(sets.filter((s) => sharesTwo(s.numbers)).length).toBeGreaterThan(40);
    expect(sets.some((s) => TRICKY_SETS.some((t) => greatestFirst(t).join() === greatestFirst(s.numbers).join()))).toBe(true);
  });

  it('Mega Mix brings in single digits', () => {
    const rng = seededRng(9);
    const sets = Array.from({ length: 50 }, () => generateSet('single-digit', LEVELS[4], rng));
    expect(sets.every((s) => s.numbers.some((n) => n < 10))).toBe(true);
  });
});

describe('pick round', () => {
  it('checks each pick and keeps wrong picks in the tray', () => {
    const r = createRound([195, 76, 237, 45], 'pick');
    expect(target(r)).toBe(237);
    expect(stepPitfalls(r).sort()).toEqual(['digit-trap', 'leading']);
    expect(pickNumber(r, 76)).toEqual({ kind: 'wrong', picked: 76, target: 237, pitfall: 'digit-trap', stepMisses: 1 });
    expect(pickNumber(r, 237)).toEqual({ kind: 'correct', slot: 0, recovered: true, last: false, roundDone: false });
    expect(pickNumber(r, 195)).toMatchObject({ kind: 'correct', slot: 1, recovered: false });
    expect(remaining(r)).toEqual([76, 45]);
    expect(pickNumber(r, 76)).toMatchObject({ kind: 'correct', slot: 2 });
    expect(pickNumber(r, 45)).toEqual({ kind: 'correct', slot: 3, recovered: false, last: true, roundDone: true });
    expect(wasFirstTry(r)).toBe(false);
    expect(summaryLine(r)).toBe('237, 195, 76, 45. Greatest to least!');
  });

  it('finds the trickiest comparison for specific praise', () => {
    const r = createRound([195, 76, 237, 45], 'pick');
    expect(trickiestPair(r)).toEqual({ pitfall: 'digit-trap', greater: 237, less: 76 });
    pickNumber(r, 237);
    expect(trickiestPair(r)?.pitfall).toBe('digit-trap');
    const close = createRound([518, 513, 516, 12], 'pick');
    expect(trickiestPair(close)).toEqual({ pitfall: 'third', greater: 518, less: 513 });
    expect(trickiestPair(createRound([600, 500, 400, 300], 'pick'))).toBeNull();
  });

  it('counts misses per step', () => {
    const r = createRound([12, 34, 56, 78], 'pick');
    pickNumber(r, 12);
    expect(pickNumber(r, 34)).toMatchObject({ stepMisses: 2 });
    pickNumber(r, 78);
    expect(r.stepMisses).toBe(0);
  });
});

describe('arrange round', () => {
  it('locks the right cards and returns the wrong ones', () => {
    const r = createRound([195, 76, 237, 45], 'arrange');
    for (const n of [237, 76, 195, 45]) placeNumber(r, n);
    const result = check(r);
    expect(result).toEqual({ kind: 'wrong', kept: [0, 3], returned: [1, 2], placed: 76, target: 195, pitfall: 'digit-trap' });
    expect(r.slots).toEqual([237, null, null, 45]);
    expect(takeBack(r, 0)).toBeNull();
    expect(placeNumber(r, 195)).toBe(1);
    expect(placeNumber(r, 76)).toBe(2);
    expect(check(r)).toEqual({ kind: 'correct', recovered: true });
  });

  it('lets him take back unlocked cards', () => {
    const r = createRound([1, 2, 3, 4], 'arrange');
    placeNumber(r, 1);
    expect(takeBack(r, 0)).toBe(1);
    expect(remaining(r)).toEqual([1, 2, 3, 4]);
    expect(placeNumber(r, 9)).toBe(-1);
    expect(() => check(r)).toThrow();
  });

  it('first try needs no wrong checks', () => {
    const r = createRound([3, 1, 4, 2], 'arrange');
    for (const n of [4, 3, 2, 1]) placeNumber(r, n);
    expect(check(r)).toEqual({ kind: 'correct', recovered: false });
    expect(wasFirstTry(r)).toBe(true);
  });
});

describe('praise', () => {
  it('pitfall praise only uses {greater} and {less}, and never repeats a line within a bank', () => {
    for (const bank of Object.values(pitfallPraise)) {
      expect(new Set(bank).size).toBe(bank.length);
      for (const line of bank) for (const m of line.matchAll(/\{(\w+)\}/g)) expect(['greater', 'less']).toContain(m[1]);
    }
  });
});

describe('adaptivity', () => {
  const level = LEVELS[2];
  it('serves easy wins every third round and after a miss', () => {
    expect(isEasyRound({ roundIndex: 0, lastWasMiss: false })).toBe(true);
    expect(isEasyRound({ roundIndex: 1, lastWasMiss: true })).toBe(true);
    expect(Object.keys(pitfallWeights({ level, stats: {}, roundIndex: 0, lastWasMiss: false }))).toEqual(level.easyPitfalls);
  });

  it('weights missed pitfalls and the digit trap more', () => {
    const w = pitfallWeights({ level, stats: { leading: { seen: 10, firstTry: 10 } }, roundIndex: 1, lastWasMiss: false });
    expect(w['digit-trap']!).toBeGreaterThan(w['digit-count']!);
    expect(w['digit-count']!).toBeGreaterThan(w.leading!);
  });

  it('only picks pitfalls the level practices', () => {
    const rng = seededRng(3);
    for (const l of LEVELS) {
      for (let i = 0; i < 50; i++) {
        const p = pickPitfall({ level: l, stats: {}, roundIndex: i, lastWasMiss: false }, rng);
        expect([...l.pitfalls, ...l.easyPitfalls]).toContain(p);
        expect(PITFALLS).toContain(p);
      }
    }
  });
});
