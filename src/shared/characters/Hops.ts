import Phaser from 'phaser';
import { colors, stroke } from '../theme';
import { Character } from './Character';
import { voices } from './voices';

const GREEN = 0x70e000;
const GREEN_DARK = 0x38b000;

/** Hops the Frog: the number line hopper. Small, springy, faces right. */
export class Hops extends Character {
  readonly voice = voices.hops;
  readonly headY = -90;
  private lids: Phaser.GameObjects.Graphics;
  private mouth: Phaser.GameObjects.Graphics;
  private legs: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const lw = stroke.thin;
    const line = colors.ink;

    this.legs = scene.add.graphics();
    this.drawLegs(false);

    const body = scene.add.graphics();
    body.fillStyle(GREEN, 1).fillEllipse(0, -26, 72, 48).lineStyle(lw, line, 1).strokeEllipse(0, -26, 72, 48);
    body.fillStyle(0xd9ed92, 1).fillEllipse(4, -18, 46, 24);
    // Eye bumps
    body.fillStyle(GREEN, 1).fillCircle(-14, -50, 14).fillCircle(16, -50, 14).lineStyle(lw, line, 1).strokeCircle(-14, -50, 14).strokeCircle(16, -50, 14);
    body.fillStyle(0xffffff, 1).fillCircle(-14, -51, 10).fillCircle(16, -51, 10);
    body.fillStyle(line, 1).fillCircle(-11, -51, 5).fillCircle(19, -51, 5);
    body.fillStyle(0xffffff, 1).fillCircle(-10, -53, 2).fillCircle(20, -53, 2);
    body.fillStyle(colors.pink, 0.6).fillCircle(-24, -26, 6).fillCircle(26, -26, 6);

    this.mouth = scene.add.graphics();
    this.setMouthOpen(false);

    this.lids = scene.add.graphics();
    this.lids.fillStyle(GREEN, 1).fillCircle(-14, -51, 11).fillCircle(16, -51, 11).setVisible(false);

    this.rig.add([this.legs, body, this.mouth, this.lids]);
  }

  private drawLegs(stretched: boolean): void {
    const g = this.legs;
    g.clear().fillStyle(GREEN_DARK, 1).lineStyle(stroke.thin, colors.ink, 1);
    if (stretched) {
      g.fillEllipse(-26, -2, 34, 12).strokeEllipse(-26, -2, 34, 12).fillEllipse(26, -2, 34, 12).strokeEllipse(26, -2, 34, 12);
    } else {
      g.fillEllipse(-24, -10, 30, 22).strokeEllipse(-24, -10, 30, 22).fillEllipse(24, -10, 30, 22).strokeEllipse(24, -10, 30, 22);
    }
  }

  protected setEyesClosed(closed: boolean): void {
    this.lids.setVisible(closed);
  }

  protected setMouthOpen(open: boolean): void {
    const g = this.mouth.clear();
    if (open) {
      g.fillStyle(colors.ink, 1).fillEllipse(2, -30, 22, 12);
      g.fillStyle(colors.pink, 1).fillEllipse(2, -27, 12, 5);
    } else {
      g.lineStyle(3, colors.ink, 1).beginPath().arc(2, -36, 14, 0.25 * Math.PI, 0.75 * Math.PI).strokePath();
    }
  }

  protected onIdleStart(): void {
    // Random little fly-catching tongue flick.
    this.scene.time.addEvent({
      delay: 3400,
      loop: true,
      callback: () => {
        if (this.busy) return;
        const tongue = this.scene.add.graphics();
        tongue.lineStyle(4, colors.pink, 1).lineBetween(10, -30, 44, -48);
        this.rig.add(tongue);
        this.scene.time.delayedCall(140, () => tongue.destroy());
      },
    });
  }

  /** One arcing hop from the current x to `toX`, ending on the ground at `groundY`. */
  hopTo(toX: number, groundY: number, height = 70, duration = 380): Promise<void> {
    const scene = this.scene;
    this.busy = true;
    const fromX = this.x;
    const fromY = this.y;
    this.drawLegs(true);
    this.setScale(toX < fromX ? -1 : 1, 1);
    return new Promise((resolve) => {
      const state = { t: 0 };
      scene.tweens.add({
        targets: state,
        t: 1,
        duration,
        ease: 'Linear',
        onUpdate: () => {
          const t = state.t;
          this.x = fromX + (toX - fromX) * t;
          this.y = fromY + (groundY - fromY) * t - Math.sin(Math.PI * t) * height;
          this.angle = (toX >= fromX ? 1 : -1) * (t - 0.5) * 30;
        },
        onComplete: () => {
          this.angle = 0;
          this.drawLegs(false);
          scene.tweens.add({ targets: this.rig, scaleY: { from: 0.75, to: 1 }, scaleX: { from: 1.2, to: 1 }, duration: 160, ease: 'Back.out' });
          this.busy = false;
          resolve();
        },
      });
    });
  }

  protected onCheer(): void {
    this.drawLegs(true);
    this.scene.time.delayedCall(700, () => this.drawLegs(false));
  }
}
