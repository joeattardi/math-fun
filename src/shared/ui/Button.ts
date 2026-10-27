import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { colors, fontSize, stroke, textStyle } from '../theme';
import { puff, squash } from './effects';

export interface ButtonOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  color?: number;
  fontPx?: number;
  /** Draw an icon centered at (0, 0) in local space. */
  icon?: (g: Phaser.GameObjects.Graphics) => void;
  iconOffsetX?: number;
  onTap: () => void;
  /** Idle wobble (on by default). */
  wobble?: boolean;
}

/** Big, chunky, wobbly touch button. Reacts to every tap. */
export class Button extends Phaser.GameObjects.Container {
  readonly bg: Phaser.GameObjects.Graphics;
  readonly text?: Phaser.GameObjects.Text;
  private enabled = true;
  private wobbleTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, private opts: ButtonOptions) {
    super(scene, opts.x, opts.y);
    const { width: w, height: h } = opts;
    const color = opts.color ?? colors.yellow;
    this.bg = scene.add.graphics();
    this.drawBg(color);
    this.add(this.bg);

    if (opts.icon) {
      const g = scene.add.graphics({ x: opts.label ? -w / 2 + h / 2 + (opts.iconOffsetX ?? 0) : 0, y: 0 });
      opts.icon(g);
      this.add(g);
    }
    if (opts.label) {
      const shift = opts.icon ? h / 4 : 0;
      this.text = scene.add.text(shift, -2, opts.label, textStyle(opts.fontPx ?? fontSize.button, colors.whiteCss, stroke.medium)).setOrigin(0.5);
      this.add(this.text);
    }

    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => {
      if (!this.enabled) return;
      squash(scene, this);
      sfx.pop();
      const p = scene.input.activePointer;
      puff(scene, p.x, p.y, color);
      scene.time.delayedCall(90, () => opts.onTap());
    });
    scene.add.existing(this);
    if (opts.wobble !== false) this.startWobble();
  }

  private drawBg(color: number): void {
    const { width: w, height: h } = this.opts;
    const r = Math.min(28, h / 2);
    this.bg.clear();
    this.bg.fillStyle(colors.ink, 1).fillRoundedRect(-w / 2, -h / 2 + 7, w, h, r);
    this.bg.fillStyle(color, 1).fillRoundedRect(-w / 2, -h / 2, w, h, r);
    this.bg.fillStyle(0xffffff, 0.28).fillRoundedRect(-w / 2 + 10, -h / 2 + 7, w - 20, h * 0.34, Math.min(16, r));
    this.bg.lineStyle(stroke.thin + 1, colors.ink, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, r);
  }

  private startWobble(): void {
    this.wobbleTween = this.scene.tweens.add({
      targets: this,
      angle: { from: -1.6, to: 1.6 },
      duration: 900 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  setEnabled(on: boolean): this {
    this.enabled = on;
    this.setAlpha(on ? 1 : 0.5);
    return this;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  preDestroy(): void {
    this.wobbleTween?.remove();
  }
}

/** Small home/back icon. */
export function drawHomeIcon(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(colors.white, 1);
  g.fillTriangle(-20, -2, 0, -20, 20, -2);
  g.fillRect(-14, -3, 28, 20);
  g.fillStyle(colors.ink, 1).fillRect(-5, 5, 10, 12);
  g.lineStyle(3, colors.ink, 1).strokeTriangle(-20, -2, 0, -20, 20, -2);
}
