/**
 * The teach flow, step by step. Every line is spoken and shown in a bubble.
 * Scenes draw each step's `visual`; the words all live here so they're easy to edit
 * and the vocabulary test covers them.
 */

import type { Place } from '../places';

export type Speaker = 'waddles' | 'chomp' | 'hops';

/** Something the visual does as a line starts. */
export type TeachCue =
  | { highlight: Place }
  | { zeros: true }
  | { blocks: 'hundreds' | 'tens' | 'cover' };

export interface TeachLine {
  who: Speaker;
  say: string;
  /** Shorter bubble text when the spoken line is long. */
  show?: string;
  cue?: TeachCue;
}

/** A quick one-tap check at the end of a step. Two choices at most. */
export interface TeachCheck {
  ask: string;
  options: [number, number];
  answer: number;
  /** Said after a right tap. */
  right: string;
  /** Said after a wrong tap, before he tries again. */
  retry: string;
}

export type TeachVisual =
  | { kind: 'hello'; numbers: number[] }
  | { kind: 'places'; n: number }
  | { kind: 'empty-place'; n: number }
  | { kind: 'blocks'; a: number; b: number }
  | { kind: 'line-up'; numbers: number[] }
  | { kind: 'compare'; a: number; b: number }
  | { kind: 'strategy'; numbers: number[] }
  | { kind: 'your-turn'; numbers: number[] };

export interface TeachStep {
  id: string;
  /** Big heading for the step. */
  title: string;
  visual: TeachVisual;
  /** Spoken before the visual's animation. */
  intro: TeachLine[];
  /** Spoken after the visual's animation. */
  outro?: TeachLine[];
  check?: TeachCheck;
}

export const TEACH_STEPS: readonly TeachStep[] = [
  {
    id: 'hello',
    title: 'Ordering Numbers',
    visual: { kind: 'hello', numbers: [237, 195, 76, 45] },
    intro: [
      { who: 'waddles', say: 'Hello, my friend! Today we learn to put numbers in order, from greatest to least.', show: 'Greatest to least!' },
      { who: 'hops', say: 'The greatest number goes on the left. The least number goes on the right!', show: 'Greatest on the LEFT. Least on the RIGHT.' },
    ],
    outro: [
      { who: 'waddles', say: '237 is the greatest, so it goes first. 45 is the least, so it goes last.', show: '237 is the greatest. 45 is the least.' },
      { who: 'chomp', say: 'Let me show you the secret for figuring that out! It is all about places!', show: 'The secret: places!' },
    ],
  },
  {
    id: 'places',
    title: 'Every digit has a place',
    visual: { kind: 'places', n: 352 },
    intro: [
      { who: 'waddles', say: 'First, a secret. Every digit lives in a place.' },
    ],
    outro: [
      { who: 'waddles', say: 'In 352, the 3 is in the hundreds place. That is 3 hundreds.', show: '3 hundreds', cue: { highlight: 'hundreds' } },
      { who: 'hops', say: 'The 5 is in the tens place. 5 tens!', show: '5 tens', cue: { highlight: 'tens' } },
      { who: 'chomp', say: 'And the 2 is in the ones place. 2 ones! Yum!', show: '2 ones', cue: { highlight: 'ones' } },
    ],
  },
  {
    id: 'empty-place',
    title: 'No hundreds? That means 0!',
    visual: { kind: 'empty-place', n: 76 },
    intro: [
      { who: 'waddles', say: 'Now look at 76. It only has two digits.' },
    ],
    outro: [
      { who: 'waddles', say: 'The 7 is in the tens place. The 6 is in the ones place.', show: '7 tens and 6 ones', cue: { highlight: 'tens' } },
      { who: 'hops', say: 'But the hundreds place is empty!', show: 'The hundreds place is empty!', cue: { highlight: 'hundreds' } },
      { who: 'waddles', say: 'An empty hundreds place means 0 hundreds. 76 has 0 hundreds!', show: '76 has 0 hundreds!', cue: { zeros: true } },
    ],
    check: {
      ask: 'How many hundreds does 76 have?',
      options: [7, 0],
      answer: 0,
      right: 'Yes! 76 has 0 hundreds. The 7 is in the tens place!',
      retry: 'Hmm! The 7 is in the tens place. Look at the hundreds place. It is empty!',
    },
  },
  {
    id: 'trap',
    title: 'The sneaky trap',
    visual: { kind: 'blocks', a: 76, b: 195 },
    intro: [
      { who: 'waddles', say: 'Here is a tricky one: 76 and 195. 76 has a big 7 in front, but 7 is in the tens place. Let us build them with blocks!', show: '76 and 195' },
    ],
    outro: [
      { who: 'waddles', say: '195 has 1 hundred. That big flat is 100!', show: '195 has 1 hundred', cue: { blocks: 'hundreds' } },
      { who: 'hops', say: '76 has 7 tens and 6 ones, and no hundreds at all!', show: '76 has 0 hundreds', cue: { blocks: 'tens' } },
      { who: 'waddles', say: 'Look! One hundred is greater than 7 tens and 6 ones. So 195 is greater than 76.', show: '195 is greater than 76', cue: { blocks: 'cover' } },
      { who: 'waddles', say: 'Remember: a three-digit number is always greater than a two-digit number.', show: 'A 3-digit number is greater than any 2-digit number!' },
    ],
    check: {
      ask: 'Which is greater?',
      options: [76, 195],
      answer: 195,
      right: 'Yes! 195 has a hundred, and 76 has 0 hundreds!',
      retry: 'Sneaky trap! Look at the hundreds place. 76 has 0 hundreds.',
    },
  },
  {
    id: 'line-up',
    title: 'Line up the ones',
    visual: { kind: 'line-up', numbers: [195, 76, 237, 45] },
    intro: [
      { who: 'waddles', say: 'To compare numbers, we stack them up, with ones under ones and tens under tens.', show: 'Ones under ones!' },
    ],
    outro: [
      { who: 'hops', say: 'See? All the ones are lined up on the right!', show: 'The ones line up!', cue: { highlight: 'ones' } },
      { who: 'waddles', say: 'Now look at the hundreds. 76 and 45 have empty hundreds places. That means 0 hundreds!', show: '76 and 45 have 0 hundreds', cue: { highlight: 'hundreds' } },
      { who: 'chomp', say: 'Zeros to the rescue! Now we can compare them!', show: 'Zeros hold the places!', cue: { zeros: true } },
    ],
  },
  {
    id: 'from-left',
    title: 'Compare from the left',
    visual: { kind: 'compare', a: 625, b: 652 },
    intro: [
      { who: 'waddles', say: 'When numbers have the same number of digits, we compare from the left.', show: 'Compare from the LEFT.' },
      { who: 'waddles', say: 'Hundreds first. If they are the same, check the tens. Then the ones.', show: 'Hundreds, then tens, then ones.' },
    ],
    check: {
      ask: 'Which is greater?',
      options: [625, 652],
      answer: 652,
      right: 'Yes! Same hundreds, and 5 tens is greater than 2 tens!',
      retry: 'The hundreds are the same. Look at the tens!',
    },
  },
  {
    id: 'ones-decide',
    title: 'Sometimes the ones decide',
    visual: { kind: 'compare', a: 518, b: 513 },
    intro: [
      { who: 'hops', say: 'What if the hundreds AND the tens are the same?', show: 'Same hundreds AND tens?' },
      { who: 'waddles', say: 'Then the ones place decides!' },
    ],
  },
  {
    id: 'zeros',
    title: 'Zero holds a place',
    visual: { kind: 'compare', a: 405, b: 450 },
    intro: [
      { who: 'chomp', say: 'These two have the same digits! 405 and 450. Which is greater?', show: '405 or 450?' },
      { who: 'waddles', say: 'A zero holds a place. Zero tens is less than 5 tens!', show: 'Zero holds a place.' },
    ],
    check: {
      ask: 'Which is greater?',
      options: [405, 450],
      answer: 450,
      right: 'Yes! 450 has 5 tens, and 405 has 0 tens!',
      retry: 'Same hundreds. Look at the tens. 0 tens or 5 tens?',
    },
  },
  {
    id: 'single-digit',
    title: 'One digit? Two empty places!',
    visual: { kind: 'empty-place', n: 7 },
    intro: [
      { who: 'hops', say: 'Look at 7! It has just one digit.' },
    ],
    outro: [
      { who: 'waddles', say: '7 has 0 hundreds and 0 tens. Just 7 ones.', show: '0 hundreds, 0 tens, 7 ones', cue: { zeros: true } },
      { who: 'chomp', say: 'So 7 is less than any number with two or three digits!', show: '7 is less than 152!' },
    ],
    check: {
      ask: 'Which is greater?',
      options: [7, 152],
      answer: 152,
      right: 'Yes! 152 has a hundred. 7 has 0 hundreds!',
      retry: 'Sneaky! 7 has 0 hundreds and 0 tens. Look at 152!',
    },
  },
  {
    id: 'strategy',
    title: 'Greatest, then the next greatest',
    visual: { kind: 'strategy', numbers: [195, 76, 237, 45] },
    intro: [
      { who: 'waddles', say: 'Now, the master plan for ordering four numbers.' },
      { who: 'waddles', say: 'Find the greatest one, and put it first. Then find the greatest one left. Keep going!', show: 'Find the greatest. Then the greatest one left!' },
    ],
    outro: [
      { who: 'waddles', say: '237, 195, 76, 45. Greatest to least!' },
      { who: 'chomp', say: 'The three-digit numbers came first, because they have hundreds!', show: 'Three-digit numbers first!' },
    ],
  },
  {
    id: 'your-turn',
    title: 'Your turn!',
    visual: { kind: 'your-turn', numbers: [64, 182, 9, 215] },
    intro: [
      { who: 'hops', say: 'Your turn! I will keep the places lined up for you.', show: 'Your turn!' },
    ],
    outro: [
      { who: 'waddles', say: 'Splendid! You are ready to play!' },
    ],
  },
];

/** The worked example's narration, one line per pick (greatest first), shown with the strategy visual. */
export const STRATEGY_NARRATION: readonly string[] = [
  '237 and 195 both have hundreds. 2 hundreds is greater than 1 hundred. 237 goes first!',
  'The greatest one left is 195. It is the only one left with hundreds!',
  '76 and 45 have 0 hundreds. 7 tens is greater than 4 tens. 76 is next!',
  'And 45 is the least!',
];
