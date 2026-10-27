import Phaser from 'phaser';
import { colors } from '../theme';

export const TEX = {
  dot: 'fx-dot',
  star: 'fx-star',
  puff: 'fx-puff',
  confetti: 'fx-confetti',
  spark: 'fx-spark',
  cloud: 'bg-cloud',
  ring: 'fx-ring',
} as const;

function starPoints(cx: number, cy: number, outer: number, inner: number, points = 5): Phaser.Math.Vector2[] {
  const out: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    out.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return out;
}

export function drawStar(g: Phaser.GameObjects.Graphics, cx: number, cy: number, outer: number, fill: number, line = colors.ink, lineWidth = 0): void {
  const pts = starPoints(cx, cy, outer, outer * 0.48);
  g.fillStyle(fill, 1);
  g.fillPoints(pts, true);
  if (lineWidth > 0) {
    g.lineStyle(lineWidth, line, 1);
    g.strokePoints(pts, true, true);
  }
}

/** Bake the small white textures used by particles. White so they can be tinted. */
export function generateSharedTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX.dot)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  g.fillStyle(0xffffff, 1).fillCircle(16, 16, 16);
  g.generateTexture(TEX.dot, 32, 32);
  g.clear();

  drawStar(g, 24, 24, 23, 0xffffff);
  g.generateTexture(TEX.star, 48, 48);
  g.clear();

  for (let r = 24; r > 0; r -= 3) g.fillStyle(0xffffff, 0.12).fillCircle(24, 24, r);
  g.generateTexture(TEX.puff, 48, 48);
  g.clear();

  g.fillStyle(0xffffff, 1).fillRect(0, 0, 14, 9);
  g.generateTexture(TEX.confetti, 14, 9);
  g.clear();

  g.fillStyle(0xffffff, 1);
  g.fillPoints([
    new Phaser.Math.Vector2(16, 0), new Phaser.Math.Vector2(19, 13), new Phaser.Math.Vector2(32, 16),
    new Phaser.Math.Vector2(19, 19), new Phaser.Math.Vector2(16, 32), new Phaser.Math.Vector2(13, 19),
    new Phaser.Math.Vector2(0, 16), new Phaser.Math.Vector2(13, 13),
  ], true);
  g.generateTexture(TEX.spark, 32, 32);
  g.clear();

  g.lineStyle(6, 0xffffff, 1).strokeCircle(32, 32, 28);
  g.generateTexture(TEX.ring, 64, 64);
  g.clear();

  g.fillStyle(0xffffff, 1);
  g.fillCircle(50, 60, 34).fillCircle(95, 45, 42).fillCircle(140, 62, 32).fillRoundedRect(30, 58, 135, 36, 18);
  g.generateTexture(TEX.cloud, 190, 100);
  g.destroy();
}
