import Phaser from 'phaser';
import { FONT_FAMILY, colors, layout } from '../theme';
import { TEX } from './textures';

const SEGMENTS = 5;

/** Combo meter: fills as he chains correct rounds, flashes at each tier. Resetting is quiet, never sad. */
export class ComboMeter extends Phaser.GameObjects.Container {
  private fill: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private flame: Phaser.GameObjects.Image;
  private value = 0;

  constructor(scene: Phaser.Scene) {
    const { x, y, width, height } = layout.comboMeter;
    super(scene, x, y);
    const frame = scene.add.graphics();
    frame.fillStyle(colors.ink, 1).fillRoundedRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8, height / 2 + 4);
    frame.fillStyle(0xffffff, 0.25).fillRoundedRect(-width / 2, -height / 2, width, height, height / 2);
    this.fill = scene.add.graphics();
    this.flame = scene.add.image(-width / 2 - 8, 0, TEX.star).setTint(colors.yellow).setScale(1.1);
    this.label = scene.add
      .text(0, 0, '', { fontFamily: FONT_FAMILY, fontSize: '26px', fontStyle: 'bold', color: '#ffffff', stroke: colors.inkCss, strokeThickness: 5 })
      .setOrigin(0.5);
    this.add([frame, this.fill, this.flame, this.label]);
    this.setDepth(700);
    scene.add.existing(this);
    scene.tweens.add({ targets: this.flame, angle: 360, duration: 4000, repeat: -1 });
    this.redraw();
  }

  private redraw(): void {
    const { width, height } = layout.comboMeter;
    const g = this.fill.clear();
    const filled = Math.min(this.value, SEGMENTS);
    const segW = (width - 8) / SEGMENTS;
    const segColors = [colors.green, colors.yellow, colors.orange, colors.pink, colors.purple];
    for (let i = 0; i < filled; i++) {
      g.fillStyle(segColors[i], 1).fillRoundedRect(-width / 2 + 4 + i * segW, -height / 2 + 4, segW - 4, height - 8, 10);
    }
    this.label.setText(this.value >= 2 ? `x${this.value}` : '');
  }

  set(value: number): void {
    const grew = value > this.value;
    this.value = value;
    this.redraw();
    if (grew) {
      this.scene.tweens.add({ targets: this, scale: { from: 1.25, to: 1 }, duration: 300, ease: 'Back.out' });
      this.scene.tweens.add({ targets: this.flame, scale: { from: 1.8, to: 1.1 }, duration: 400, ease: 'Back.out' });
    }
  }

  flash(): void {
    this.scene.tweens.add({ targets: this.fill, alpha: { from: 0.2, to: 1 }, duration: 120, repeat: 4 });
  }
}
