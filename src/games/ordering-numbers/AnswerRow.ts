import Phaser from 'phaser';
import { CENTER_X, colors, fontSize, layout, stroke, textStyle } from '../../shared/theme';
import { SET_SIZE } from './sets';
import { uiText } from './ui-text';

const { width: W, height: H, gap: GAP } = layout.ordering.card;
const ORDINALS = ['1st', '2nd', '3rd', '4th'];

/** x of each column, shared by the tray and the answer slots so cards drop straight down. */
export function columnXs(): number[] {
  const total = SET_SIZE * W + (SET_SIZE - 1) * GAP;
  return Array.from({ length: SET_SIZE }, (_, i) => CENTER_X - total / 2 + W / 2 + i * (W + GAP));
}

/**
 * Four empty slots in a flat row, greatest on the left, least on the right,
 * with a long arrow under them from GREATEST to LEAST.
 */
export class AnswerRow extends Phaser.GameObjects.Container {
  readonly xs = columnXs();
  readonly slotY = layout.ordering.slotsY;
  private frames: Phaser.GameObjects.Graphics[] = [];
  private arrow: Phaser.GameObjects.Container;
  private nextTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.xs.forEach((x, i) => {
      const g = scene.add.graphics({ x, y: this.slotY });
      g.fillStyle(colors.ink, 0.28).fillRoundedRect(-W / 2, -H / 2, W, H, 28);
      g.lineStyle(stroke.thin, colors.white, 0.85);
      // Dashed frame.
      const dash = 16;
      for (let dx = 0; dx < W - 40; dx += dash * 2) {
        g.lineBetween(-W / 2 + 20 + dx, -H / 2, -W / 2 + 20 + Math.min(dx + dash, W - 40), -H / 2);
        g.lineBetween(-W / 2 + 20 + dx, H / 2, -W / 2 + 20 + Math.min(dx + dash, W - 40), H / 2);
      }
      for (let dy = 0; dy < H - 40; dy += dash * 2) {
        g.lineBetween(-W / 2, -H / 2 + 20 + dy, -W / 2, -H / 2 + 20 + Math.min(dy + dash, H - 40));
        g.lineBetween(W / 2, -H / 2 + 20 + dy, W / 2, -H / 2 + 20 + Math.min(dy + dash, H - 40));
      }
      const label = scene.add.text(x, this.slotY, ORDINALS[i], textStyle(fontSize.body + 8, colors.whiteCss, stroke.thin)).setOrigin(0.5).setAlpha(0.6);
      this.frames.push(g);
      this.add([g, label]);
    });

    this.arrow = scene.add.container(0, layout.ordering.arrowY);
    const left = this.xs[0] - W / 2;
    const right = this.xs[SET_SIZE - 1] + W / 2;
    const ag = scene.add.graphics();
    const greatest = scene.add.text(left, 0, uiText.greatest, textStyle(fontSize.body, colors.greaterCss, stroke.medium)).setOrigin(0, 0.5);
    const least = scene.add.text(right, 0, uiText.least, textStyle(fontSize.body, colors.lessCss, stroke.medium)).setOrigin(1, 0.5);
    const a0 = left + greatest.width + 12;
    const a1 = right - least.width - 12;
    ag.lineStyle(14, colors.ink, 1).lineBetween(a0, 0, a1 - 18, 0);
    ag.fillStyle(colors.ink, 1).fillTriangle(a1 + 4, 0, a1 - 26, -20, a1 - 26, 20);
    ag.lineStyle(7, colors.white, 1).lineBetween(a0 + 3, 0, a1 - 20, 0);
    ag.fillStyle(colors.white, 1).fillTriangle(a1 - 4, 0, a1 - 22, -12, a1 - 22, 12);
    this.arrow.add([ag, greatest, least]);
    this.add(this.arrow);
    // Words wiggle so they read as alive.
    scene.tweens.add({ targets: greatest, angle: { from: -3, to: 3 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    scene.tweens.add({ targets: least, angle: { from: 3, to: -3 }, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    scene.add.existing(this);
  }

  /** Make the next empty slot breathe so he knows where the card goes. -1 for none. */
  pointAt(slot: number): void {
    this.nextTween?.remove();
    this.frames.forEach((f) => f.setScale(1).setAlpha(1));
    if (slot < 0) return;
    this.nextTween = this.scene.tweens.add({ targets: this.frames[slot], scale: { from: 1, to: 1.05 }, alpha: { from: 1, to: 0.6 }, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  setArrowVisible(on: boolean): void {
    this.scene.tweens.add({ targets: this.arrow, alpha: on ? 1 : 0, duration: 250 });
  }

  /** Slot index under a point, or -1. */
  slotAt(x: number, y: number): number {
    if (Math.abs(y - this.slotY) > H / 2) return -1;
    return this.xs.findIndex((sx) => Math.abs(x - sx) <= W / 2);
  }

  preDestroy(): void {
    this.nextTween?.remove();
  }
}
