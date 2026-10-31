/** What a game hands the shared level select and level complete scenes. */
export interface LevelFlowConfig {
  gameId: string;
  title: string;
  scenes: { levelSelect: string; game: string; levelComplete: string };
  /** Short tile names, e.g. '0 – 10' or 'Mix It Up!'. */
  levels: readonly { label: string }[];
  /** Party lines for the level complete dance-off and personal-best callouts. */
  partyLines: {
    chomp: readonly string[];
    waddles: readonly string[];
    hops: readonly string[];
    /** Uses {n} for the streak. */
    record: readonly string[];
    bestScore: readonly string[];
  };
  /** Optional "learn it" button on the level select screen. */
  learn?: { scene: string; label: string };
}

export interface LevelCompleteData {
  levelIndex: number;
  stars: 1 | 2 | 3;
  newBestStars: boolean;
  newBestScore: boolean;
  unlockedNext: boolean;
  newRecordStreak: boolean;
  bestStreak: number;
  /** Sticker ids awarded this time. */
  stickers: string[];
  trophies: number;
}

/** Short on-screen strings shared by every game's level screens. */
export const levelText = {
  levelLabel: (n: number) => `Level ${n}`,
  chooseLevel: 'Pick a level!',
  locked: 'Finish the level before this one to unlock it!',
  levelDone: 'Level Complete!',
  newSticker: 'New sticker!',
  trophy: 'Bonus trophy!',
  again: 'Play again',
  next: 'Next level',
} as const;
