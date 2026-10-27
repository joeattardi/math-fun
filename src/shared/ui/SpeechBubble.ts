import Phaser from 'phaser';
import { FONT_FAMILY, colors, fontSize, layout } from '../theme';

const PAD_X = 30;
const PAD_Y = 18;
const TAIL = 30;

/**
 * One speech bubble at the top of the screen, with a tail pointing at whoever is talking.
 * It never sits over the cards or the number line.
 */
export class SpeechBubble extends Phaser.GameObjects.Container {
  private g: Phaser.GameObjects.Graphics;
  private textBody: Phaser.GameObjects.Text;
  private segments: Phaser.GameObjects.Text[] = [];

  private maxWidth: number;

  constructor(scene: Phaser.Scene, x = layout.bubble.x, y = layout.bubble.y, maxWidth = layout.bubble.maxWidth) {
    super(scene, x, y);
    this.maxWidth = maxWidth;
    this.g = scene.add.graphics();
    this.textBody = scene.add
      .text(0, 0, '', {
        fontFamily: FONT_FAMILY,
        fontSize: `${fontSize.body}px`,
        fontStyle: 'bold',
        color: colors.inkCss,
        align: 'center',
        wordWrap: { width: maxWidth - PAD_X * 2, useAdvancedWrap: true },
      })
      .setOrigin(0.5);
    this.add([this.g, this.textBody]);
    this.setDepth(800).setVisible(false);
    scene.add.existing(this);
  }

  /** Show a sentence. `speakerX` points the tail at the speaker. */
  show(text: string, speakerX: number, speakerY = this.y + 200): void {
    this.clearSegments();
    this.textBody.setVisible(true).setText(text);
    this.layoutBubble(this.textBody.width, this.textBody.height, speakerX, speakerY);
  }

  /** Show a short prompt with one highlighted word, e.g. "Which is GREATER?". */
  showPrompt(parts: { text: string; color?: string }[], speakerX: number, speakerY = this.y + 200): void {
    this.clearSegments();
    this.textBody.setVisible(false);
    const style = { fontFamily: FONT_FAMILY, fontSize: `${fontSize.prompt}px`, fontStyle: 'bold', color: colors.inkCss };
    let total = 0;
    for (const part of parts) {
      const t = this.scene.add.text(0, 0, part.text, { ...style, color: part.color ?? colors.inkCss }).setOrigin(0, 0.5);
      if (part.color) t.setStroke(colors.inkCss, 5);
      this.segments.push(t);
      total += t.width;
    }
    let x = -total / 2;
    for (const t of this.segments) {
      t.x = x;
      x += t.width;
    }
    this.add(this.segments);
    const h = Math.max(...this.segments.map((t) => t.height));
    this.layoutBubble(total, h, speakerX, speakerY);
    // Make the highlighted word pulse.
    this.segments.filter((_, i) => parts[i].color).forEach((t) => {
      this.scene.tweens.add({ targets: t, scale: { from: 1, to: 1.1 }, duration: 420, yoyo: true, repeat: 2, ease: 'Sine.inOut' });
    });
  }

  hide(): void {
    if (!this.visible) return;
    this.scene.tweens.add({ targets: this, scale: 0, duration: 140, ease: 'Back.in', onComplete: () => this.setVisible(false) });
  }

  private clearSegments(): void {
    this.segments.forEach((s) => s.destroy());
    this.segments = [];
  }

  private layoutBubble(contentW: number, contentH: number, speakerX: number, speakerY: number): void {
    const w = Math.min(this.maxWidth, Math.max(220, contentW + PAD_X * 2));
    const h = Math.max(layout.bubble.minHeight, contentH + PAD_Y * 2);
    const g = this.g;
    g.clear();
    // Tail toward the speaker, starting under the bubble, clamped to its edge.
    const localSpeakerX = speakerX - this.x;
    const below = speakerY > this.y;
    const baseX = Phaser.Math.Clamp(localSpeakerX * 0.6, -w / 2 + 40, w / 2 - 40);
    const edgeY = below ? h / 2 - 4 : -h / 2 + 4;
    const tipX = Phaser.Math.Clamp(localSpeakerX, -w / 2 - 60, w / 2 + 60);
    const tipY = edgeY + (below ? TAIL : -TAIL);
    g.fillStyle(colors.ink, 1).fillTriangle(baseX - 22, edgeY, baseX + 22, edgeY, tipX, tipY + (below ? 5 : -5));
    g.fillStyle(colors.ink, 1).fillRoundedRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10, 32);
    g.fillStyle(0xffffff, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 28);
    g.fillTriangle(baseX - 15, edgeY - (below ? 2 : -2), baseX + 15, edgeY - (below ? 2 : -2), tipX, tipY);

    this.setVisible(true);
    this.scene.tweens.killTweensOf(this);
    this.setScale(0.6);
    this.scene.tweens.add({ targets: this, scale: 1, duration: 260, ease: 'Back.out' });
  }
}
