import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { colors, stroke } from '../theme';
import { Character } from './Character';
import { voices } from './voices';

const BLACK = 0x2b2d42;
const BEAK = 0xff9f1c;

/** Professor Waddles: a fancy penguin with tiny glasses, a bow tie, and a mortarboard. */
export class Waddles extends Character {
  readonly voice = voices.waddles;
  readonly headY = -200;
  private flipperL: Phaser.GameObjects.Container;
  private flipperR: Phaser.GameObjects.Container;
  private lids: Phaser.GameObjects.Graphics;
  private lowerBeak: Phaser.GameObjects.Graphics;
  private tassel: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const lw = stroke.thin + 1;
    const line = colors.ink;

    const feet = scene.add.graphics();
    feet.fillStyle(BEAK, 1).fillEllipse(-26, -6, 44, 16).fillEllipse(26, -6, 44, 16).lineStyle(3, line, 1).strokeEllipse(-26, -6, 44, 16).strokeEllipse(26, -6, 44, 16);

    const makeFlipper = (side: -1 | 1) => {
      const c = scene.add.container(side * 56, -118);
      const g = scene.add.graphics();
      g.fillStyle(BLACK, 1).fillEllipse(side * 10, 36, 26, 82).lineStyle(lw, line, 1).strokeEllipse(side * 10, 36, 26, 82);
      c.add(g);
      c.angle = side * -12;
      return c;
    };
    this.flipperL = makeFlipper(-1);
    this.flipperR = makeFlipper(1);

    const body = scene.add.graphics();
    body.fillStyle(BLACK, 1).fillEllipse(0, -92, 128, 176).lineStyle(lw, line, 1).strokeEllipse(0, -92, 128, 176);
    body.fillStyle(0xffffff, 1).fillEllipse(0, -74, 92, 120);
    body.fillStyle(0xffffff, 1).fillEllipse(-18, -140, 34, 34).fillEllipse(18, -140, 34, 34);
    body.fillStyle(line, 1).fillCircle(-16, -139, 7).fillCircle(20, -139, 7);
    body.fillStyle(0xffffff, 1).fillCircle(-14, -142, 2.5).fillCircle(22, -142, 2.5);
    // Tiny glasses
    body.lineStyle(4, colors.yellow, 1).strokeCircle(-18, -140, 16).strokeCircle(18, -140, 16).lineBetween(-2, -141, 2, -141);
    // Blush
    body.fillStyle(colors.pink, 0.5).fillCircle(-36, -120, 7).fillCircle(36, -120, 7);
    // Bow tie
    body.fillStyle(colors.red, 1).fillTriangle(0, -98, -22, -110, -22, -86).fillTriangle(0, -98, 22, -110, 22, -86).fillCircle(0, -98, 6);
    body.lineStyle(3, line, 1).strokeTriangle(0, -98, -22, -110, -22, -86).strokeTriangle(0, -98, 22, -110, 22, -86);
    // Upper beak
    body.fillStyle(BEAK, 1).fillTriangle(-13, -124, 13, -124, 0, -110).lineStyle(3, line, 1).strokeTriangle(-13, -124, 13, -124, 0, -110);

    this.lowerBeak = scene.add.graphics();
    this.lowerBeak.fillStyle(0xe76f00, 1).fillTriangle(-9, -114, 9, -114, 0, -104).lineStyle(2, line, 1).strokeTriangle(-9, -114, 9, -114, 0, -104);

    this.lids = scene.add.graphics();
    this.lids.fillStyle(BLACK, 1).fillCircle(-18, -140, 15).fillCircle(18, -140, 15).setVisible(false);

    // Mortarboard
    const hat = scene.add.graphics();
    hat.fillStyle(line, 1).fillRect(-26, -184, 52, 16);
    const board = [[-48, -186], [0, -202], [48, -186], [0, -172]].map(([px, py]) => new Phaser.Math.Vector2(px, py));
    hat.fillPoints(board, true);
    this.tassel = scene.add.graphics({ x: 0, y: -187 });
    this.tassel.lineStyle(3, colors.yellow, 1).lineBetween(0, 0, 30, 4).lineBetween(30, 4, 32, 26);
    this.tassel.fillStyle(colors.yellow, 1).fillCircle(32, 28, 5);

    this.rig.add([this.flipperL, this.flipperR, feet, body, this.lowerBeak, this.lids, hat, this.tassel]);
  }

  protected setEyesClosed(closed: boolean): void {
    this.lids.setVisible(closed);
  }

  protected setMouthOpen(open: boolean): void {
    this.lowerBeak.y = open ? 7 : 0;
  }

  protected onIdleStart(): void {
    this.scene.tweens.add({ targets: this.tassel, angle: { from: -10, to: 12 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.scene.tweens.add({ targets: this.rig, angle: { from: -3, to: 3 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  private flap(times = 4): void {
    this.scene.tweens.add({ targets: this.flipperL, angle: 50, duration: 110, yoyo: true, repeat: times });
    this.scene.tweens.add({ targets: this.flipperR, angle: -50, duration: 110, yoyo: true, repeat: times });
  }

  protected onCheer(): void {
    this.flap(5);
  }

  protected onWave(): void {
    this.scene.tweens.add({ targets: this.flipperR, angle: -120, duration: 160, yoyo: true, repeat: 3 });
  }

  /** Trip over nothing, fall flat, pop back up. */
  trip(): Promise<void> {
    const scene = this.scene;
    this.busy = true;
    sfx.slideWhistle();
    return new Promise((resolve) => {
      scene.tweens.chain({
        targets: this,
        tweens: [
          { angle: 75, duration: 380, ease: 'Quad.in' },
          { angle: 70, duration: 80, yoyo: true, onStart: () => sfx.bonk() },
          { angle: 0, duration: 420, delay: 380, ease: 'Back.out', onStart: () => sfx.boing() },
        ],
        onComplete: () => {
          this.busy = false;
          resolve();
        },
      });
    });
  }
}
