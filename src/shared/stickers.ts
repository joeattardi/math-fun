/** Sticker catalog. Art lives in shared/ui/StickerArt.ts, keyed by id. */
export interface StickerDef {
  id: string;
  name: string;
}

export const STICKERS: readonly StickerDef[] = [
  { id: 'croc-crown', name: 'King Chomp' },
  { id: 'penguin-glasses', name: 'Fancy Waddles' },
  { id: 'frog-cape', name: 'Super Hops' },
  { id: 'pizza-number', name: 'Number Pizza' },
  { id: 'rocket', name: 'Math Rocket' },
  { id: 'taco-cat', name: 'Taco Cat' },
  { id: 'rainbow-star', name: 'Rainbow Star' },
  { id: 'donut', name: 'Galaxy Donut' },
  { id: 'robot', name: 'Beep Boop Bot' },
  { id: 'cactus', name: 'Hugging Cactus' },
  { id: 'ghost', name: 'Giggle Ghost' },
  { id: 'banana', name: 'Disco Banana' },
  { id: 'octopus', name: 'Octo-Counter' },
  { id: 'burger', name: 'Mega Burger' },
  { id: 'dino', name: 'Dino Genius' },
  { id: 'trophy', name: 'Golden Trophy' },
];

/** Rounds-played milestones that award a bonus sticker. */
export const ROUND_MILESTONES = [25, 60, 120, 200, 300, 450, 600];

/** Next sticker to award, or null when the whole book is full. */
export function nextSticker(owned: readonly string[]): StickerDef | null {
  return STICKERS.find((s) => !owned.includes(s.id)) ?? null;
}

/** How many milestones were crossed going from `before` to `after` rounds played. */
export function milestonesCrossed(before: number, after: number): number {
  return ROUND_MILESTONES.filter((m) => before < m && after >= m).length;
}
