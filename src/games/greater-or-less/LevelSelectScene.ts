import Phaser from 'phaser';
import { music } from '../../shared/audio/music';
import { sfx } from '../../shared/audio/sfx';
import { speech } from '../../shared/audio/speech';
import { Chomp } from '../../shared/characters/Chomp';
import { voices } from '../../shared/characters/voices';
import { exposeDebug } from '../../shared/debug';
import { progress } from '../../shared/progress';
import { CENTER_X, colors, fontSize, stroke, textStyle } from '../../shared/theme';
import { drawStar } from '../../shared/ui/textures';
import { popIn, puff, squash } from '../../shared/ui/effects';
import { addHomeButton, setupScene } from '../../shell/sceneKit';
import { goTo } from '../../shell/transitions';
import { GAME_ID, SCENES } from './constants';
import { LEVELS } from './questions';
import { uiText } from './ui-text';

const TILE_W = 220;
const TILE_H = 250;
const GAP = 34;
const TILE_COLORS = [colors.green, colors.blue, colors.orange, colors.pink];

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super(SCENES.levelSelect);
  }

  create(): void {
    setupScene(this);
    music.play('menu');
    addHomeButton(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => speech.cancel());

    const title = this.add.text(CENTER_X, 80, uiText.title, textStyle(fontSize.heading + 4, colors.yellowCss, 10)).setOrigin(0.5);
    popIn(this, title);
    this.add.text(CENTER_X, 150, uiText.chooseLevel, textStyle(fontSize.body + 4)).setOrigin(0.5);

    const g = progress.game(GAME_ID);
    const totalW = LEVELS.length * TILE_W + (LEVELS.length - 1) * GAP;
    LEVELS.forEach((level, i) => {
      const x = CENTER_X - totalW / 2 + TILE_W / 2 + i * (TILE_W + GAP);
      const y = 350;
      const unlocked = i <= g.unlockedLevel;
      const tile = this.add.container(x, y);
      const bg = this.add.graphics();
      const color = unlocked ? TILE_COLORS[i] : 0x8d99ae;
      bg.fillStyle(colors.ink, 1).fillRoundedRect(-TILE_W / 2, -TILE_H / 2 + 9, TILE_W, TILE_H, 32);
      bg.fillStyle(color, 1).fillRoundedRect(-TILE_W / 2, -TILE_H / 2, TILE_W, TILE_H, 32);
      bg.fillStyle(0xffffff, 0.22).fillRoundedRect(-TILE_W / 2 + 12, -TILE_H / 2 + 10, TILE_W - 24, 60, 20);
      bg.lineStyle(stroke.medium, colors.ink, 1).strokeRoundedRect(-TILE_W / 2, -TILE_H / 2, TILE_W, TILE_H, 32);
      tile.add(bg);
      tile.add(this.add.text(0, -80, uiText.levelLabel(i + 1), textStyle(fontSize.body + 2)).setOrigin(0.5));
      tile.add(this.add.text(0, -10, level.label, textStyle(fontSize.heading - 6, colors.whiteCss, 8)).setOrigin(0.5));

      const stars = this.add.graphics({ y: 75 });
      const best = g.bestStars[i] ?? 0;
      for (let s = 0; s < best; s++) drawStar(stars, (s - (best - 1) / 2) * 56, 0, 24, colors.yellow, colors.ink, 4);
      tile.add(stars);
      if (!unlocked) {
        const lock = this.add.graphics({ y: 70 });
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
          this.time.delayedCall(140, () => goTo(this, SCENES.game, { levelIndex: i }, { x, y }));
        } else {
          sfx.boing();
          void speech.say('Finish the level before this one to unlock it!', voices.chomp, { interrupt: true });
        }
      });
      exposeDebug(`levelTile${i}`, { x, y, unlocked });
    });

    const chomp = new Chomp(this, 140, 690);
    chomp.enter(500, 0.6).then(() => chomp.startIdle());
    this.time.delayedCall(600, () => void speech.say(uiText.chooseLevel, voices.chomp, { interrupt: true }));
  }
}
