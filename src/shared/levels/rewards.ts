import { progress } from '../progress';
import { milestonesCrossed, nextSticker } from '../stickers';
import type { LevelCompleteData } from './config';

/**
 * Save a finished level and hand out its rewards: one sticker per level, plus bonus stickers
 * for rounds-played milestones. A full sticker book turns into trophies.
 */
export function completeLevel(opts: {
  gameId: string;
  levelIndex: number;
  levelCount: number;
  stars: 1 | 2 | 3;
  score: number;
  roundsPlayedAtStart: number;
  newRecordStreak: boolean;
  bestStreak: number;
}): LevelCompleteData {
  const result = progress.completeLevel(opts.gameId, opts.levelIndex, opts.stars, opts.score, opts.levelCount);
  const roundsNow = progress.game(opts.gameId).roundsPlayed;
  const awards = 1 + milestonesCrossed(opts.roundsPlayedAtStart, roundsNow);
  const stickers: string[] = [];
  let trophies = 0;
  for (let i = 0; i < awards; i++) {
    const s = nextSticker(progress.snapshot().stickers);
    if (s) {
      progress.addSticker(s.id);
      stickers.push(s.id);
    } else {
      progress.addTrophy();
      trophies++;
    }
  }
  return {
    levelIndex: opts.levelIndex,
    stars: opts.stars,
    newBestStars: result.newBestStars,
    newBestScore: result.newBestScore,
    unlockedNext: result.unlockedNext,
    newRecordStreak: opts.newRecordStreak,
    bestStreak: opts.bestStreak,
    stickers,
    trophies,
  };
}
