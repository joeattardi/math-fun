/** Short on-screen strings for Greater or Less. Kept here so the vocabulary test covers them. */
export const uiText = {
  title: 'Greater or Less?',
  showMe: 'Show me!',
  lineLeft: 'LEFT',
  lineRight: 'RIGHT',
  ask: (term: 'GREATER' | 'LESS') => `Which is ${term}?`,
  levelLabel: (n: number) => `Level ${n}`,
  roundLabel: (n: number, total: number) => `${n} / ${total}`,
  levelDone: 'Level Complete!',
  newSticker: 'New sticker!',
  trophy: 'Bonus trophy!',
  again: 'Play again',
  next: 'Next level',
  menu: 'Menu',
  chooseLevel: 'Pick a level!',
} as const;
