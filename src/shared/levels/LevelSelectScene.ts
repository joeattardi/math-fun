import Phaser from 'phaser';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { speech } from '../audio/speech';
import { Chomp } from '../characters/Chomp';
import { voices } from '../characters/voices';
import { exposeDebug } from '../debug';
import { progress } from '../progress';
import { CENTER_X, colors, fontSize, stroke, textStyle } from '../theme';
import { Button } from '../ui/Button';
import { drawStar } from '../ui/textures';
import { popIn, puff, shine, squash } from '../ui/effects';
import { addHomeButton, setupScene } from '../../shell/sceneKit';
import { goTo } from '../../shell/transitions';
import { type LevelFlowConfig, levelText } from './config';

/** One row of big tiles for up to four levels; more levels wrap into rows of three. */
const ROW_MAX = 4;
const WRAP_COLUMNS = 3;
const SINGLE_ROW = { w: 220, h: 250, gap: 34, y: 350, labelY: -10, levelY: -80, starsY: 75, starR: 24, labelPx: fontSize.heading - 6 };
const GRID = { w: 300, h: 176, gap: 26, y: 300, rowGap: 22, labelY: -6, levelY: -56, starsY: 52, starR: 18, labelPx: fontSize.heading - 18 };
const TILE_COLORS = [colors.green, colors.blue, colors.orange, colors.pink, colors.purple, colors.red];
const LEARN = { x: 950, y: 668, width: 290, height: 96 };

/** Build the level select scene for a game. */
export function createLevelSelectScene(cfg: LevelFlowConfig): typeof Phaser.Scene {
  return class LevelSelectScene extends Phaser.Scene {
    constructor() {
      super(cfg.scenes.levelSelect);
    }

    create(): void {
      setupScene(this);
      music.play('menu');
      addHomeButton(this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => speech.cancel());

      const title = this.add.text(CENTER_X, 80, cfg.title, textStyle(fontSize.heading + 4, colors.yellowCss, 10)).setOrigin(0.5);
      popIn(this, title);
      this.add.text(CENTER_X, 150, levelText.chooseLevel, textStyle(fontSize.body + 4)).setOrigin(0.5);

      const g = progress.game(cfg.gameId);
      const count = cfg.levels.length;
      const dims = count <= ROW_MAX ? SINGLE_ROW : GRID;
      const columns = count <= ROW_MAX ? count : WRAP_COLUMNS;
      const { w: TILE_W, h: TILE_H } = dims;

      cfg.levels.forEach((level, i) => {
        const col = i % columns;
        const row = Math.floor(i / columns);
        const inRow = Math.min(columns, count - row * columns);
        const rowW = inRow * TILE_W + (inRow - 1) * dims.gap;
        const x = CENTER_X - rowW / 2 + TILE_W / 2 + col * (TILE_W + dims.gap);
        const y = dims.y + row * (TILE_H + (count <= ROW_MAX ? 0 : GRID.rowGap));
        const unlocked = i <= g.unlockedLevel;
        const tile = this.add.container(x, y);
        const bg = this.add.graphics();
        const color = unlocked ? TILE_COLORS[i % TILE_COLORS.length] : 0x8d99ae;
        bg.fillStyle(colors.ink, 1).fillRoundedRect(-TILE_W / 2, -TILE_H / 2 + 9, TILE_W, TILE_H, 32);
        bg.fillStyle(color, 1).fillRoundedRect(-TILE_W / 2, -TILE_H / 2, TILE_W, TILE_H, 32);
        bg.fillStyle(0xffffff, 0.22).fillRoundedRect(-TILE_W / 2 + 12, -TILE_H / 2 + 10, TILE_W - 24, TILE_H * 0.24, 20);
        bg.lineStyle(stroke.medium, colors.ink, 1).strokeRoundedRect(-TILE_W / 2, -TILE_H / 2, TILE_W, TILE_H, 32);
        tile.add(bg);
        tile.add(this.add.text(0, dims.levelY, levelText.levelLabel(i + 1), textStyle(fontSize.body + 2)).setOrigin(0.5));
        const label = this.add.text(0, dims.labelY, level.label, textStyle(dims.labelPx, colors.whiteCss, 8)).setOrigin(0.5);
        if (label.width > TILE_W - 20) label.setScale((TILE_W - 20) / label.width);
        tile.add(label);

        const stars = this.add.graphics({ y: dims.starsY });
        const best = g.bestStars[i] ?? 0;
        for (let s = 0; s < best; s++) drawStar(stars, (s - (best - 1) / 2) * dims.starR * 2.3, 0, dims.starR, colors.yellow, colors.ink, 4);
        tile.add(stars);
        if (!unlocked) {
          const lock = this.add.graphics({ y: dims.starsY - 4 });
          lock.lineStyle(8, colors.ink, 1).beginPath().arc(0, -14, 16, Math.PI, 0).strokePath();
          lock.fillStyle(colors.yellow, 1).fillRoundedRect(-24, -14, 48, 38, 8).lineStyle(4, colors.ink, 1).strokeRoundedRect(-24, -14, 48, 38, 8);
          tile.add(lock);
        }

        popIn(this, tile, 150 + i * 110);
        this.tweens.add({ targets: tile, angle: { from: -2, to: 2 }, duration: 1000 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        tile.setSize(TILE_W, TILE_H).setInteractive({ useHandCursor: true });
        tile.on('pointerdown', (p: Phaser.Input.Pointer) => {
          squash(this, tile);
          puff(this, p.x, p.y, color);
          if (unlocked) {
            sfx.pop();
            this.time.delayedCall(140, () => goTo(this, cfg.scenes.game, { levelIndex: i }, { x, y }));
          } else {
            sfx.boing();
            void speech.say(levelText.locked, voices.chomp, { interrupt: true });
          }
        });
        exposeDebug(`levelTile${i}`, { x, y, unlocked });
      });

      if (cfg.learn) {
        const learn = cfg.learn;
        const btn = new Button(this, {
          ...LEARN,
          label: learn.label,
          color: colors.purple,
          onTap: () => goTo(this, learn.scene),
        });
        popIn(this, btn, 600);
        shine(this, btn.bg, 700, 2400);
        exposeDebug('learnButton', { x: LEARN.x, y: LEARN.y });
      }

      const chomp = new Chomp(this, 140, 690);
      chomp.enter(500, 0.6).then(() => chomp.startIdle());
      this.time.delayedCall(600, () => void speech.say(levelText.chooseLevel, voices.chomp, { interrupt: true }));
    }
  };
}
