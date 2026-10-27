import Phaser from 'phaser';
import { music } from '../shared/audio/music';
import { sfx } from '../shared/audio/sfx';
import { speech } from '../shared/audio/speech';
import { Chomp } from '../shared/characters/Chomp';
import { Hops } from '../shared/characters/Hops';
import { Waddles } from '../shared/characters/Waddles';
import { CENTER_X, colors, fontSize, textStyle } from '../shared/theme';
import { Button } from '../shared/ui/Button';
import { shine, sparkleBurst } from '../shared/ui/effects';
import { setupScene } from './sceneKit';
import { goTo } from './transitions';

const TITLE = 'Math Fun!';
const LETTER_COLORS = ['#ff5d8f', '#ffd60a', '#06d6a0', '#3a86ff', '#9b5de5', '#ff9f1c'];

/** First screen. Its tap unlocks Web Audio and speech on iOS. */
export class TapToStartScene extends Phaser.Scene {
  private started = false;

  constructor() {
    super('TapToStart');
  }

  create(): void {
    this.started = false;
    setupScene(this);

    // Bouncing rainbow title, one letter at a time.
    const letters = TITLE.split('').map((ch) => this.add.text(0, 0, ch, textStyle(fontSize.title + 30, colors.whiteCss, 12)).setOrigin(0.5));
    const total = letters.reduce((w, t) => w + t.width, 0);
    let x = CENTER_X - total / 2;
    letters.forEach((t, i) => {
      t.setColor(LETTER_COLORS[i % LETTER_COLORS.length]);
      t.setPosition(x + t.width / 2, 170);
      x += t.width;
      t.setScale(0);
      this.tweens.add({ targets: t, scale: 1, delay: 120 + i * 70, duration: 500, ease: 'Back.out' });
      this.tweens.add({ targets: t, y: 140, angle: { from: -6, to: 6 }, delay: i * 90, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });

    const chomp = new Chomp(this, 230, 560);
    const waddles = new Waddles(this, 930, 560);
    const hops = new Hops(this, CENTER_X, 640);
    [chomp, waddles, hops].forEach((c, i) => {
      c.enter(300 + i * 200).then(() => c.startIdle());
    });
    this.time.addEvent({ delay: 1800, loop: true, callback: () => void chomp.react('wave') });
    this.time.addEvent({ delay: 2500, startAt: 1200, loop: true, callback: () => void waddles.react('wave') });
    this.time.addEvent({ delay: 1500, loop: true, callback: () => void hops.react('happy') });

    const play = new Button(this, {
      x: CENTER_X,
      y: 400,
      width: 380,
      height: 120,
      label: 'Tap to Play!',
      fontPx: fontSize.heading,
      color: colors.pink,
      onTap: () => this.start(),
    });
    this.tweens.add({ targets: play, scale: { from: 1, to: 1.08 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    shine(this, play.bg, 800, 1400);

    // iOS only unlocks audio inside a real DOM gesture, so listen on the DOM directly.
    const unlock = () => {
      void music.unlock();
      speech.prime();
    };
    window.addEventListener('touchend', unlock, { once: true });
    window.addEventListener('pointerup', unlock, { once: true });
    this.input.once('pointerup', () => this.start());
  }

  private start(): void {
    if (this.started) return;
    this.started = true;
    void music.unlock().then(() => {
      sfx.sparkle();
      music.play('menu');
    });
    speech.prime();
    sparkleBurst(this, CENTER_X, 400, 40);
    this.time.delayedCall(250, () => goTo(this, 'Menu', undefined, { x: CENTER_X, y: 400 }));
  }
}
