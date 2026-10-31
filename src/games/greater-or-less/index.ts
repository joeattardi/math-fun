import Phaser from 'phaser';
import { createLevelCompleteScene } from '../../shared/levels/LevelCompleteScene';
import { createLevelSelectScene } from '../../shared/levels/LevelSelectScene';
import { progress } from '../../shared/progress';
import { colors } from '../../shared/theme';
import type { GameDefinition } from '../types';
import { GAME_ID, SCENES } from './constants';
import { GameScene } from './GameScene';
import { levelFlow } from './levelFlow';
import { LEVELS, QUESTION_TYPES } from './questions';

export const greaterOrLess: GameDefinition = {
  id: GAME_ID,
  title: 'Greater or Less?',
  color: colors.green,
  entryScene: SCENES.levelSelect,
  scenes: [createLevelSelectScene(levelFlow), GameScene, createLevelCompleteScene(levelFlow)],
  drawIcon: (g) => {
    const card = (x: number, y: number, angle: number, color: number) => {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const pts = [[-40, -50], [40, -50], [40, 50], [-40, 50]].map(([px, py]) => new Phaser.Math.Vector2(x + px * c - py * s, y + px * s + py * c));
      g.fillStyle(color, 1).fillPoints(pts, true).lineStyle(5, colors.ink, 1).strokePoints(pts, true, true);
    };
    card(-36, 0, -0.2, colors.orange);
    card(36, -6, 0.18, colors.purple);
    // Croc jaws chomping between them.
    g.fillStyle(0x52b788, 1).fillTriangle(-30, 64, 30, 64, 0, 30).lineStyle(4, colors.ink, 1).strokeTriangle(-30, 64, 30, 64, 0, 30);
    g.fillStyle(0xffffff, 1).fillTriangle(-14, 60, -6, 60, -10, 50).fillTriangle(6, 60, 14, 60, 10, 50);
  },
  parentStats: () => {
    const g = progress.game(GAME_ID);
    const lines = QUESTION_TYPES.map((t) => {
      const s = g.stats[t];
      if (!s || s.seen === 0) return `  ${t.padEnd(15)} not seen yet`;
      return `  ${t.padEnd(15)} ${s.firstTry}/${s.seen} right on first try (${Math.round((100 * s.firstTry) / s.seen)}%)`;
    });
    const stars = LEVELS.map((l) => `${l.label}: ${'★'.repeat(g.bestStars[l.index] ?? 0) || '-'}`).join('   ');
    return [
      ...lines,
      `  Rounds played: ${g.roundsPlayed}   Levels finished: ${g.levelsCompleted}   Best streak: ${g.bestStreak}`,
      `  Unlocked up to: ${LEVELS[g.unlockedLevel].label}`,
      `  Best stars  ${stars}`,
    ];
  },
  unlockAll: () => progress.unlockAll(GAME_ID, LEVELS.length),
};
