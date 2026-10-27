import Phaser from 'phaser';
import { sfx } from '../shared/audio/sfx';
import { speech } from '../shared/audio/speech';
import { voices } from '../shared/characters/voices';
import { progress } from '../shared/progress';
import { STICKERS } from '../shared/stickers';
import { CENTER_X, colors, fontSize, textStyle } from '../shared/theme';
import { drawSticker } from '../shared/ui/StickerArt';
import { popIn, sparkleBurst, squash } from '../shared/ui/effects';
import { addHomeButton, setupScene } from './sceneKit';

const COLS = 6;
const CELL_X = 168;
const CELL_Y = 168;
const TOP = 230;
const SCALE = 0.95;

export class StickerBookScene extends Phaser.Scene {
  constructor() {
    super('StickerBook');
  }

  create(): void {
    setupScene(this, { water: false });
    addHomeButton(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => speech.cancel());

    const owned = progress.snapshot().stickers;
    const trophies = progress.snapshot().trophies;
    const title = this.add.text(CENTER_X, 70, 'Sticker Book', textStyle(fontSize.heading + 6, colors.yellowCss, 10)).setOrigin(0.5);
    popIn(this, title);
    this.add.text(CENTER_X, 130, `${owned.length} of ${STICKERS.length} stickers${trophies ? `  +  ${trophies} trophies` : ''}`, textStyle(fontSize.body)).setOrigin(0.5);

    STICKERS.forEach((s, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const rowCount = Math.min(COLS, STICKERS.length - row * COLS);
      const x = CENTER_X + (col - (rowCount - 1) / 2) * CELL_X;
      const y = TOP + row * CELL_Y;
      const have = owned.includes(s.id);
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      drawSticker(g, s.id, !have);
      c.add(g);
      if (!have) c.add(this.add.text(0, 0, '?', textStyle(fontSize.heading, '#adb5bd', 0)).setOrigin(0.5));
      popIn(this, c, 100 + i * 45, SCALE);
      this.tweens.add({ targets: c, angle: { from: -3, to: 3 }, duration: 900 + (i % 4) * 150, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      c.setSize(130, 130).setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => {
        squash(this, c, SCALE);
        if (have) {
          sfx.sparkle();
          sparkleBurst(this, x, y, 14);
          void speech.say(s.name, voices.hops, { interrupt: true });
        } else {
          sfx.boing();
          void speech.say('Keep playing to unlock this one!', voices.chomp, { interrupt: true });
        }
      });
    });
  }
}
