import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import type { Hops } from '../characters/Hops';
import { hopPlan } from '../hopPlan';
import { FONT_FAMILY, colors, fontSize, stroke, textStyle, timing } from '../theme';

export interface NumberLineOptions {
  max: number;
  x0: number;
  x1: number;
  y: number;
  /** Minor tick spacing. Defaults to 1. */
  tickEvery?: number;
  /** Label every number up to this range; above it, only tens get labels. */
  labelAllUpTo?: number;
  /** Words under the two ends of the line, e.g. ['LEFT', 'RIGHT']. */
  endLabels?: [string, string];
}

interface Marker {
  value: number;
  container: Phaser.GameObjects.Container;
  bar: Phaser.GameObjects.Graphics;
}

const MARKER_HEIGHTS = [38, 70];
const BAR_OFFSETS = [-10, -22];
const DIM_ALPHA = 0.55;
const END_LABEL_OFFSET = 64;

/** Number line along the bottom of the screen: labeled tens, animated markers, and a hopping frog. */
export class NumberLine extends Phaser.GameObjects.Container {
  readonly max: number;
  private opts: Required<NumberLineOptions>;
  private markers: Marker[] = [];
  private floaters: Phaser.GameObjects.Text[] = [];
  private markerLayer: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, options: NumberLineOptions) {
    super(scene, 0, 0);
    this.opts = { tickEvery: 1, labelAllUpTo: 20, endLabels: ['', ''], ...options };
    this.max = options.max;
    this.markerLayer = scene.add.container(0, 0);
    this.drawLine();
    this.add(this.markerLayer);
    scene.add.existing(this);
  }

  xFor(n: number): number {
    const { x0, x1, max } = this.opts;
    return x0 + ((x1 - x0) * n) / max;
  }

  get groundY(): number {
    return this.opts.y;
  }

  private drawLine(): void {
    const { x0, x1, y, max, tickEvery, labelAllUpTo, endLabels } = this.opts;
    const g = this.scene.add.graphics();
    // A chunky log the line sits on.
    g.fillStyle(0x8d5524, 1).fillRoundedRect(x0 - 34, y - 6, x1 - x0 + 68, 22, 11);
    g.fillStyle(0xb5763a, 1).fillRoundedRect(x0 - 30, y - 6, x1 - x0 + 60, 9, 5);
    g.lineStyle(stroke.thin, colors.ink, 1).strokeRoundedRect(x0 - 34, y - 6, x1 - x0 + 68, 22, 11);
    g.lineStyle(6, colors.white, 1).lineBetween(x0 - 6, y, x1 + 6, y);
    // Arrow tip
    g.fillStyle(colors.white, 1).fillTriangle(x1 + 22, y, x1 + 4, y - 11, x1 + 4, y + 11);
    this.add(g);

    const labelAll = max <= labelAllUpTo;
    for (let n = 0; n <= max; n += tickEvery) {
      const x = this.xFor(n);
      const isTen = n % 10 === 0;
      const h = isTen ? 22 : max > 50 ? 8 : 12;
      g.lineStyle(isTen ? 5 : 3, colors.ink, 1).lineBetween(x, y - h, x, y + h * 0.5);
      if (isTen || labelAll) {
        const size = isTen ? fontSize.numberLineLabel + 4 : fontSize.numberLineLabelMinor + 2;
        const t = this.scene.add
          .text(x, y + 30, String(n), {
            fontFamily: FONT_FAMILY,
            fontSize: `${size}px`,
            fontStyle: 'bold',
            color: isTen ? colors.yellowCss : colors.whiteCss,
            stroke: colors.inkCss,
            strokeThickness: isTen ? 6 : 5,
          })
          .setOrigin(0.5, 0.5);
        this.add(t);
      }
    }

    // End words under 0 and the last number, colored like the LESS / GREATER prompts.
    const endColors = [colors.lessCss, colors.greaterCss];
    [x0, x1].forEach((x, i) => {
      if (!endLabels[i]) return;
      this.add(this.scene.add.text(x, y + END_LABEL_OFFSET, endLabels[i], textStyle(fontSize.body - 2, endColors[i], stroke.medium)).setOrigin(0.5));
    });
  }

  /** Put a marker (pin + colored bar from 0) on `value`. Row 0 sits low, row 1 high, so close numbers never overlap. */
  placeMarker(value: number, color: number, row: 0 | 1, instant = false): Phaser.GameObjects.Container {
    const x = this.xFor(value);
    const y = this.opts.y;
    const height = MARKER_HEIGHTS[row];

    const bar = this.scene.add.graphics();
    bar.fillStyle(color, 0.95).fillRoundedRect(0, -6, Math.max(12, x - this.xFor(0)), 12, 6);
    bar.lineStyle(3, colors.ink, 1).strokeRoundedRect(0, -6, Math.max(12, x - this.xFor(0)), 12, 6);
    bar.setPosition(this.xFor(0), y + BAR_OFFSETS[row]);

    const c = this.scene.add.container(x, y);
    const stick = this.scene.add.graphics();
    stick.lineStyle(5, colors.ink, 1).lineBetween(0, 0, 0, -height);
    const label = this.scene.add.text(0, -height - 20, String(value), textStyle(fontSize.body + 4, colors.whiteCss, 0)).setOrigin(0.5);
    const box = this.scene.add.graphics();
    const w = Math.max(54, label.width + 22);
    box.fillStyle(colors.ink, 1).fillRoundedRect(-w / 2 - 3, -height - 42, w + 6, 46, 14);
    box.fillStyle(color, 1).fillRoundedRect(-w / 2, -height - 39, w, 40, 12);
    c.add([stick, box, label]);
    this.markerLayer.add([bar, c]);
    this.markers.push({ value, container: c, bar });

    if (!instant) {
      bar.scaleX = 0;
      this.scene.tweens.add({ targets: bar, scaleX: 1, duration: 420, ease: 'Cubic.out' });
      c.setScale(0);
      this.scene.tweens.add({ targets: c, scale: 1, duration: 380, ease: 'Back.out' });
      sfx.pop();
    }
    return c;
  }

  clearMarkers(): void {
    for (const m of this.markers) {
      const { container, bar } = m;
      this.scene.tweens.add({ targets: [container, bar], alpha: 0, duration: 200, onComplete: () => { container.destroy(); bar.destroy(); } });
    }
    this.markers = [];
    this.floaters.forEach((f) => f.destroy());
    this.floaters = [];
  }

  hasMarkers(): boolean {
    return this.markers.length > 0;
  }

  /** Quick reinforcement after a correct answer: both markers pop in and blink. */
  flashPair(less: number, greater: number, lessColor: number, greaterColor: number): void {
    this.clearMarkers();
    this.placeMarker(less, lessColor, 0);
    this.placeMarker(greater, greaterColor, 1);
    for (const m of this.markers) {
      this.scene.tweens.add({ targets: m.container, alpha: { from: 1, to: 0.35 }, duration: 160, yoyo: true, repeat: 2, delay: 400 });
    }
  }

  /** Bounce the marker for `value` (used to point at the greater one). */
  wiggleMarker(value: number): void {
    const m = this.markers.find((mk) => mk.value === value);
    if (!m) return;
    this.scene.tweens.add({ targets: m.container, scale: 1.3, duration: 180, yoyo: true, repeat: 2, ease: 'Sine.inOut' });
  }

  setDimmed(dim: boolean): void {
    this.scene.tweens.add({ targets: this, alpha: dim ? DIM_ALPHA : 1, duration: 400 });
  }

  private floatCount(x: number, value: number, big: boolean): void {
    // One count on screen at a time, so quick hops never pile numbers on top of each other.
    this.floaters.forEach((f) => f.destroy());
    this.floaters = [];
    const t = this.scene.add
      .text(x, this.opts.y - 100, String(value), textStyle(big ? fontSize.heading : fontSize.body + 6, big ? colors.yellowCss : colors.whiteCss))
      .setOrigin(0.5)
      .setDepth(850);
    this.floaters.push(t);
    t.setScale(0.3);
    this.scene.tweens.add({ targets: t, scale: 1, y: t.y - 36, duration: 260, ease: 'Back.out' });
    this.scene.tweens.add({ targets: t, alpha: 0, delay: 650, duration: 300, onComplete: () => t.destroy() });
  }

  /**
   * Hop the frog from 0 to `target`, by tens then ones, counting along.
   * `count` speaks a number; hops wait for it (up to a cap) so voice and jumps stay in sync.
   */
  async hopFrom0(hops: Hops, target: number, count: (n: number) => Promise<void>, opts: { overshoot?: boolean; speed?: number } = {}): Promise<void> {
    const speed = opts.speed ?? 1;
    const ground = this.opts.y;
    if (hops.x !== this.xFor(0)) await hops.hopTo(this.xFor(0), ground, 110, 420 / speed);
    let k = 0;
    for (const stop of hopPlan(target, this.max)) {
      const big = stop.size === 'ten';
      await hops.hopTo(this.xFor(stop.value), ground, big ? 80 : 36, (big ? timing.hop : timing.hop * 0.6) / speed);
      sfx.tick(k++);
      this.floatCount(this.xFor(stop.value), stop.value, stop.value === target);
      if (stop.spoken) {
        await Promise.race([count(stop.value), new Promise<void>((r) => this.scene.time.delayedCall(950 / speed, r))]);
      }
    }
    if (opts.overshoot && target < this.max) {
      // The gag: he jumps one too far and scoots back.
      await hops.hopTo(this.xFor(target + 1), ground, 36, 260 / speed);
      sfx.slideWhistle();
      await hops.hopTo(this.xFor(target), ground, 8, 420 / speed);
    }
  }
}
