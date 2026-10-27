import Phaser from 'phaser';
import { sfx } from '../../shared/audio/sfx';
import { FONT_FAMILY, colors, fontSize, layout, stroke } from '../../shared/theme';
import { onesDigit, tensDigit } from './questions';

const { width: W, height: H } = layout.cards;
const RADIUS = 36;
const MAX_DIGITS_WIDTH = W - 34;

/**
 * A big number card. The tens part is drawn in yellow and slightly taller,
 * a quiet nudge to compare tens first.
 */
export class NumberCard extends Phaser.GameObjects.Container {
  readonly value: number;
  readonly color: number;
  private digits: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number, value: number, color: number) {
    super(scene, x, y);
    this.value = value;
    this.color = color;

    const bg = scene.add.graphics();
    bg.fillStyle(colors.ink, 0.35).fillRoundedRect(-W / 2 + 6, -H / 2 + 14, W, H, RADIUS);
    bg.fillStyle(colors.ink, 1).fillRoundedRect(-W / 2 - 5, -H / 2 - 5, W + 10, H + 10, RADIUS + 4);
    bg.fillStyle(color, 1).fillRoundedRect(-W / 2, -H / 2, W, H, RADIUS);
    bg.fillStyle(0xffffff, 0.22).fillRoundedRect(-W / 2 + 14, -H / 2 + 12, W - 28, H * 0.3, 22);

    this.digits = scene.add.container(0, 6);
    const style = (size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle => ({
      fontFamily: FONT_FAMILY,
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color,
      stroke: colors.inkCss,
      strokeThickness: stroke.thick + 4,
    });
    const tens = tensDigit(value);
    const ones = onesDigit(value);
    const parts: Phaser.GameObjects.Text[] = [];
    if (tens > 0) parts.push(scene.add.text(0, 0, String(tens), style(fontSize.cardTens, colors.tensCss)).setOrigin(0, 0.5));
    parts.push(scene.add.text(0, 0, String(ones), style(fontSize.cardOnes, colors.whiteCss)).setOrigin(0, 0.5));
    const total = parts.reduce((w, t) => w + t.width, 0) - (parts.length - 1) * 10;
    let px = -total / 2;
    for (const t of parts) {
      t.x = px;
      px += t.width - 10;
    }
    // Ones sit on the same baseline as the taller tens.
    if (parts.length === 2) parts[1].y = 8;
    this.digits.add(parts);
    if (total > MAX_DIGITS_WIDTH) this.digits.setScale(MAX_DIGITS_WIDTH / total);

    this.add([bg, this.digits]);
    this.setSize(W, H);
    this.setInteractive({ useHandCursor: true });
    scene.add.existing(this);
  }

  /** Whoosh in from off-screen with a spin and a bounce. */
  enter(fromLeft: boolean, delay = 0): Promise<void> {
    const targetX = this.x;
    this.x = fromLeft ? -W : this.scene.scale.width + W;
    this.angle = fromLeft ? -200 : 200;
    this.setScale(0.4);
    this.scene.time.delayedCall(delay, () => sfx.whoosh());
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        x: targetX,
        angle: 0,
        scale: 1,
        delay,
        duration: 560,
        ease: 'Back.out',
        onComplete: () => {
          this.idle();
          resolve();
        },
      });
    });
  }

  private idle(): void {
    this.scene.tweens.add({ targets: this.digits, y: 0, duration: 900 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.scene.tweens.add({ targets: this, angle: { from: -1.5, to: 1.5 }, duration: 1300 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  exit(toLeft: boolean): Promise<void> {
    this.disableInteractive();
    this.scene.tweens.killTweensOf(this);
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        x: toLeft ? -W : this.scene.scale.width + W,
        y: this.y - 80,
        angle: toLeft ? -300 : 300,
        scale: 0.5,
        duration: 420,
        ease: 'Back.in',
        onComplete: () => {
          this.destroy();
          resolve();
        },
      });
    });
  }

  /** Happy bounce for a correct pick. */
  celebrate(): void {
    this.scene.tweens.add({ targets: this, scale: { from: 1.18, to: 1 }, duration: 420, ease: 'Elastic.out' });
  }

  /** Gentle wobble (not a red X) for a wrong pick. */
  wobble(): void {
    const x = this.x;
    this.scene.tweens.add({ targets: this, x: x + 14, duration: 60, yoyo: true, repeat: 3, onComplete: () => (this.x = x) });
  }
}
