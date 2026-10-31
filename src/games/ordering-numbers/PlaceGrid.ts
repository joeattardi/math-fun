import Phaser from 'phaser';
import { sfx } from '../../shared/audio/sfx';
import { CENTER_X, FONT_FAMILY, colors, fontSize, layout, stroke } from '../../shared/theme';
import { digitStyle } from './PlaceValueCard';
import { type Place, PLACES, emptyPlaces, placeDigits } from './places';
import { uiText } from './ui-text';

const { rowHeight: ROW_H, colWidth: COL, headerHeight: HEADER } = layout.ordering.grid;
const CHIP_X = -COL * 1.5 - 34;
const PAD = 14;
const WIDTH = COL * 3 + 110;
const BOX_W = 58;
const BOX_H = 66;

interface Row {
  value: number;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  digits: { text: Phaser.GameObjects.Text; place: Place }[];
  boxes: Phaser.GameObjects.Graphics;
  ghosts: Phaser.GameObjects.Text[];
}

const colX = (place: Place): number => (PLACES.indexOf(place) - 1) * COL + 20;

/**
 * The "Line them up!" chart: numbers stacked in hundreds / tens / ones columns,
 * ones under ones. Empty places get dotted boxes that fill with ghost zeros,
 * and columns light up one at a time as we compare from the left.
 */
export class PlaceGrid extends Phaser.GameObjects.Container {
  private panel: Phaser.GameObjects.Graphics;
  private columnGlow: Phaser.GameObjects.Graphics;
  private header: Phaser.GameObjects.Text[] = [];
  private rows: Row[] = [];
  private rowLayer: Phaser.GameObjects.Container;
  private rowCount = 0;

  constructor(scene: Phaser.Scene, y = layout.ordering.grid.y) {
    super(scene, CENTER_X, y);
    this.panel = scene.add.graphics();
    this.columnGlow = scene.add.graphics();
    this.rowLayer = scene.add.container(0, 0);
    this.add([this.panel, this.columnGlow, this.rowLayer]);
    PLACES.forEach((place, i) => {
      const t = scene.add
        .text(colX(place), 0, uiText.placeLetters[i], {
          fontFamily: FONT_FAMILY, fontSize: `${fontSize.body + 6}px`, fontStyle: 'bold', color: colors.placesCss[place], stroke: colors.inkCss, strokeThickness: 6,
        })
        .setOrigin(0.5);
      this.header.push(t);
      this.add(t);
    });
    this.setDepth(860).setVisible(false);
    scene.add.existing(this);
  }

  private get panelHeight(): number {
    return HEADER + this.rowCount * ROW_H + PAD * 2;
  }

  private rowY(i: number): number {
    return -this.panelHeight / 2 + PAD + HEADER + ROW_H * (i + 0.5);
  }

  private drawPanel(): void {
    const h = this.panelHeight;
    const g = this.panel.clear();
    g.fillStyle(colors.ink, 1).fillRoundedRect(-WIDTH / 2 - 5, -h / 2 - 5, WIDTH + 10, h + 10, 34);
    g.fillStyle(0xffffff, 0.97).fillRoundedRect(-WIDTH / 2, -h / 2, WIDTH, h, 30);
    // Column lanes, tinted with their place colors.
    for (const place of PLACES) {
      g.fillStyle(colors.places[place], 0.12).fillRoundedRect(colX(place) - COL / 2 + 4, -h / 2 + PAD, COL - 8, h - PAD * 2, 18);
    }
    this.header.forEach((t) => (t.y = -h / 2 + PAD + HEADER / 2));
  }

  /** Show numbers, one per row, ones under ones. */
  show(rows: { value: number; rim: number }[]): Promise<void> {
    this.clearRows();
    this.highlight(null);
    this.rowCount = rows.length;
    this.drawPanel();
    this.rows = rows.map(({ value, rim }, i) => this.buildRow(value, rim, i));
    this.setVisible(true).setScale(0.3).setAlpha(1);
    sfx.whoosh();
    return new Promise((resolve) => {
      this.scene.tweens.add({ targets: this, scale: 1, duration: 360, ease: 'Back.out', onComplete: () => resolve() });
    });
  }

  private buildRow(value: number, rim: number, i: number): Row {
    const scene = this.scene;
    const container = scene.add.container(0, this.rowY(i));
    const bg = scene.add.graphics();
    const chip = scene.add.graphics();
    chip.fillStyle(colors.ink, 1).fillCircle(CHIP_X, 0, 17).fillStyle(rim, 1).fillCircle(CHIP_X, 0, 13);
    const boxes = scene.add.graphics();
    const d = placeDigits(value);
    const empty = emptyPlaces(value);
    const shown = PLACES.filter((p) => !empty.includes(p));
    const digits = shown.map((place) => {
      const text = scene.add.text(colX(place), 0, String(d[place]), digitStyle(fontSize.placeGridDigit, place)).setOrigin(0.5);
      return { text, place };
    });
    const ghosts = empty.map((place) => scene.add.text(colX(place), 0, '0', digitStyle(fontSize.placeGridDigit, place)).setOrigin(0.5).setAlpha(0));
    container.add([bg, chip, boxes, ...ghosts, ...digits.map((x) => x.text)]);
    this.rowLayer.add(container);
    const row: Row = { value, container, bg, digits, boxes, ghosts };
    this.drawBoxes(row);
    return row;
  }

  private drawBoxes(row: Row): void {
    const g = row.boxes.clear();
    for (const place of emptyPlaces(row.value)) {
      const x = colX(place);
      g.lineStyle(4, colors.places[place], 0.9).strokeRoundedRect(x - BOX_W / 2, -BOX_H / 2, BOX_W, BOX_H, 12);
    }
  }

  /** Ghost zeros pop into every empty place. */
  fillZeros(): Promise<void> {
    const ghosts = this.rows.flatMap((r) => r.ghosts);
    if (ghosts.length === 0) return Promise.resolve();
    return new Promise((resolve) => {
      ghosts.forEach((g, i) => {
        g.setAlpha(0.5).setScale(0);
        this.scene.time.delayedCall(i * 200, () => sfx.pop());
        this.scene.tweens.add({ targets: g, scale: 1, delay: i * 200, duration: 360, ease: 'Back.out', onComplete: i === ghosts.length - 1 ? () => resolve() : undefined });
      });
    });
  }

  /** Light up one column across every row (or none). */
  highlight(place: Place | null): void {
    const g = this.columnGlow.clear();
    if (!place || this.rows.length === 0) return;
    const h = this.panelHeight;
    const x = colX(place) - COL / 2 + 2;
    g.fillStyle(colors.places[place], 0.35).fillRoundedRect(x, -h / 2 + PAD - 4, COL - 4, h - PAD * 2 + 8, 20);
    g.lineStyle(stroke.thin + 1, colors.places[place], 1).strokeRoundedRect(x, -h / 2 + PAD - 4, COL - 4, h - PAD * 2 + 8, 20);
    sfx.tick(PLACES.indexOf(place) * 4);
    this.scene.tweens.add({ targets: this.columnGlow, alpha: { from: 0.4, to: 1 }, duration: 200 });
  }

  /** Celebrate the row with the greater number. */
  markGreater(value: number): void {
    const row = this.rows.find((r) => r.value === value);
    if (!row) return;
    const w = WIDTH - 24;
    row.bg.clear().fillStyle(colors.yellow, 0.55).fillRoundedRect(-w / 2, -ROW_H / 2 + 4, w, ROW_H - 8, 20);
    this.scene.tweens.add({ targets: row.container, scale: { from: 1.12, to: 1 }, duration: 420, ease: 'Elastic.out' });
    sfx.sparkle();
  }

  /** Row center in scene coordinates, for pointing effects. */
  rowPosition(value: number): { x: number; y: number } | null {
    const i = this.rows.findIndex((r) => r.value === value);
    return i < 0 ? null : { x: this.x, y: this.y + this.rowY(i) * this.scaleY };
  }

  hide(): Promise<void> {
    if (!this.visible) return Promise.resolve();
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this, scale: 0.3, alpha: 0, duration: 220, ease: 'Back.in',
        onComplete: () => {
          this.setVisible(false);
          this.clearRows();
          resolve();
        },
      });
    });
  }

  private clearRows(): void {
    this.rows.forEach((r) => r.container.destroy());
    this.rows = [];
    this.columnGlow.clear();
  }
}
