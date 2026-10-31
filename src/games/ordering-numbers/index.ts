import { createLevelCompleteScene } from '../../shared/levels/LevelCompleteScene';
import { createLevelSelectScene } from '../../shared/levels/LevelSelectScene';
import type { LevelFlowConfig } from '../../shared/levels/config';
import { progress } from '../../shared/progress';
import { colors } from '../../shared/theme';
import type { GameDefinition } from '../types';
import { GAME_ID, SCENES } from './constants';
import { GameScene } from './GameScene';
import { chompLines } from './lines/chomp';
import { hopsLines } from './lines/hops';
import { bestScorePraise, recordPraise } from './lines/praise';
import { waddlesLines } from './lines/waddles';
import { PITFALLS, PITFALL_NAMES } from './places';
import { LEVELS } from './sets';
import { TeachScene } from './TeachScene';
import { uiText } from './ui-text';

const levelFlow: LevelFlowConfig = {
  gameId: GAME_ID,
  title: uiText.title,
  scenes: SCENES,
  levels: LEVELS,
  partyLines: {
    chomp: chompLines.levelComplete,
    waddles: waddlesLines.levelComplete,
    hops: hopsLines.levelComplete,
    record: recordPraise,
    bestScore: bestScorePraise,
  },
  learn: { scene: SCENES.teach, label: uiText.learn },
};

export const orderingNumbers: GameDefinition = {
  id: GAME_ID,
  title: uiText.title,
  color: colors.purple,
  // The lesson plays automatically the first time; after that the menu goes to level select.
  get entryScene() {
    return progress.game(GAME_ID).teachSeen ? SCENES.levelSelect : SCENES.teach;
  },
  scenes: [createLevelSelectScene(levelFlow), GameScene, createLevelCompleteScene(levelFlow), TeachScene],
  drawIcon: (g) => {
    // Four little cards in a row, stepping down, with an arrow under them.
    const heights = [70, 56, 42, 28];
    heights.forEach((h, i) => {
      const x = -66 + i * 44;
      g.fillStyle(colors.ink, 1).fillRoundedRect(x - 20, 30 - h - 3, 40, h + 6, 10);
      g.fillStyle(colors.cardRims[i], 1).fillRoundedRect(x - 17, 30 - h, 34, h, 8);
    });
    g.lineStyle(10, colors.ink, 1).lineBetween(-70, 54, 50, 54);
    g.fillStyle(colors.ink, 1).fillTriangle(72, 54, 46, 38, 46, 70);
    g.lineStyle(4, colors.white, 1).lineBetween(-66, 54, 50, 54);
    g.fillStyle(colors.white, 1).fillTriangle(64, 54, 50, 45, 50, 63);
  },
  parentStats: () => {
    const g = progress.game(GAME_ID);
    // Short lines: the stats screen is shared by every game.
    const seen = PITFALLS.filter((p) => (g.stats[p]?.seen ?? 0) > 0);
    const unseen = PITFALLS.filter((p) => !seen.includes(p));
    const parts = seen.map((p) => {
      const s = g.stats[p]!;
      return `${PITFALL_NAMES[p]} ${s.firstTry}/${s.seen}`;
    });
    const lines = parts.length === 0 ? ['  First try: nothing yet'] : [];
    for (let i = 0; i < parts.length; i += 4) lines.push(`  ${i === 0 ? 'First try:' : '          '} ${parts.slice(i, i + 4).join(', ')}`);
    if (unseen.length && seen.length) lines.push(`  Not seen yet: ${unseen.map((p) => PITFALL_NAMES[p]).join(', ')}`);
    const stars = LEVELS.map((l) => `${l.label}: ${'★'.repeat(g.bestStars[l.index] ?? 0) || '-'}`).join('   ');
    return [
      ...lines,
      `  Rounds played: ${g.roundsPlayed}   Levels finished: ${g.levelsCompleted}   Best streak: ${g.bestStreak}`,
      `  Unlocked up to: ${LEVELS[g.unlockedLevel].label}   Lesson seen: ${g.teachSeen ? 'yes' : 'no'}`,
      `  Best stars  ${stars}`,
    ];
  },
  unlockAll: () => progress.unlockAll(GAME_ID, LEVELS.length),
};
