import Phaser from 'phaser';
import { sfx } from '../../shared/audio/sfx';
import { colors } from '../../shared/theme';
import { placeDigits } from './places';

/** Size of one ones cube. A ten rod is 1 x 10 cubes, a hundred flat is 10 x 10. */
export const UNIT = 9;
const TEN = UNIT * 10;
const GAP = 8;
const ONES_PER_COLUMN = 5;

function drawFlat(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(colors.places.hundreds, 1).fillRect(0, 0, TEN, TEN);
  g.lineStyle(1, colors.ink, 0.35);
  for (let i = 1; i < 10; i++) {
    g.lineBetween(i * UNIT, 0, i * UNIT, TEN);
    g.lineBetween(0, i * UNIT, TEN, i * UNIT);
  }
  g.lineStyle(3, colors.ink, 1).strokeRect(0, 0, TEN, TEN);
}

function drawRod(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(colors.places.tens, 1).fillRect(0, 0, UNIT, TEN);
  g.lineStyle(1, colors.ink, 0.35);
  for (let i = 1; i < 10; i++) g.lineBetween(0, i * UNIT, UNIT, i * UNIT);
  g.lineStyle(2, colors.ink, 1).strokeRect(0, 0, UNIT, TEN);
}

function drawCube(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(colors.places.ones, 1).fillRect(0, 0, UNIT, UNIT).lineStyle(2, colors.ink, 1).strokeRect(0, 0, UNIT, UNIT);
}

/**
 * Code-drawn base ten blocks for a number: hundred flats, then ten rods, then ones cubes,
 * left to right, bottoms lined up. The origin is the bottom-left corner.
 */
export class BaseTenBlocks extends Phaser.GameObjects.Container {
  readonly flats: Phaser.GameObjects.Graphics[] = [];
  readonly rods: Phaser.GameObjects.Graphics[] = [];
  readonly cubes: Phaser.GameObjects.Graphics[] = [];
  readonly blockWidth: number;

  constructor(scene: Phaser.Scene, x: number, y: number, value: number, scale = 1) {
    super(scene, x, y);
    const d = placeDigits(value);
    let px = 0;
    const piece = (draw: (g: Phaser.GameObjects.Graphics) => void, gx: number, gy: number) => {
      const g = scene.add.graphics({ x: gx, y: gy });
      draw(g);
      this.add(g);
      return g;
    };
    for (let i = 0; i < d.hundreds; i++, px += TEN + GAP) this.flats.push(piece(drawFlat, px, -TEN));
    for (let i = 0; i < d.tens; i++, px += UNIT + 5) this.rods.push(piece(drawRod, px, -TEN));
    if (d.tens > 0) px += GAP - 5;
    for (let i = 0; i < d.ones; i++) {
      const col = Math.floor(i / ONES_PER_COLUMN);
      const row = i % ONES_PER_COLUMN;
      this.cubes.push(piece(drawCube, px + col * (UNIT + 4), -UNIT - row * (UNIT + 4)));
    }
    const cubeCols = Math.ceil(d.ones / ONES_PER_COLUMN);
    this.blockWidth = (px + cubeCols * (UNIT + 4)) * scale;
    this.setScale(scale);
    this.list.forEach((g) => (g as Phaser.GameObjects.Graphics).setAlpha(0));
    scene.add.existing(this);
  }

  /** Pop the pieces in one by one: flats, rods, then cubes. */
  async build(perPiece = 110): Promise<void> {
    const pieces = [...this.flats, ...this.rods, ...this.cubes];
    for (let i = 0; i < pieces.length; i++) {
      const g = pieces[i];
      g.setAlpha(1).setScale(0);
      this.scene.tweens.add({ targets: g, scale: 1, duration: 220, ease: 'Back.out' });
      sfx.tick(i);
      await new Promise<void>((r) => this.scene.time.delayedCall(perPiece, r));
    }
  }

  /** Scene position of a flat's top-left corner, for laying rods on top of it. */
  flatOrigin(i = 0): { x: number; y: number } {
    const f = this.flats[i];
    return { x: this.x + f.x * this.scaleX, y: this.y + f.y * this.scaleY };
  }
}
