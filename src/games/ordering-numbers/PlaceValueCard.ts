import Phaser from 'phaser';
import { sfx } from '../../shared/audio/sfx';
import { FONT_FAMILY, colors, fontSize, layout, stroke } from '../../shared/theme';
import { type Place, PLACES, emptyPlaces, placeDigits } from './places';
import { uiText } from './ui-text';

const { width: W, height: H } = layout.ordering.card;
const RADIUS = 28;
const RIM = 9;
const COL = 64;
const DIGIT_Y = 12;
const LETTER_Y = -H / 2 + 22;
const BOX_W = 54;
const BOX_H = 82;

export const columnX = (place: Place): number => (PLACES.indexOf(place) - 1) * COL;

export function digitStyle(size: number, place: Place): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_FAMILY,
    fontSize: `${size}px`,
    fontStyle: 'bold',
    color: colors.placesCss[place],
    stroke: colors.inkCss,
    strokeThickness: stroke.thick,
    padding: { x: stroke.thick, y: stroke.thick },
  };
}

/**
 * A number card for ordering games. Digits sit in fixed hundreds / tens / ones columns,
 * right-aligned like a stacked sum, each in its place color. Empty places can show a dotted box,
 * which can fill with a ghost 0 ("76 has 0 hundreds").
 */
export class PlaceValueCard extends Phaser.GameObjects.Container {
  readonly value: number;
  readonly rim: number;
  private face: Phaser.GameObjects.Container;
  private columnGlow: Phaser.GameObjects.Graphics;
  private boxes: Phaser.GameObjects.Graphics;
  private ghosts: Phaser.GameObjects.Text[] = [];
  private letters: Phaser.GameObjects.Text[] = [];
  private idleTweens: Phaser.Tweens.Tween[] = [];
  private pulseTween?: Phaser.Tweens.Tween;
  private flight?: Phaser.Tweens.Tween;
  homeX = 0;
  homeY = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, value: number, rim: number, opts: { placeBoxes: boolean }) {
    super(scene, x, y);
    this.value = value;
    this.rim = rim;
    this.homeX = x;
    this.homeY = y;

    const bg = scene.add.graphics();
    bg.fillStyle(colors.ink, 0.3).fillRoundedRect(-W / 2 + 6, -H / 2 + 12, W, H, RADIUS);
    bg.fillStyle(colors.ink, 1).fillRoundedRect(-W / 2 - 4, -H / 2 - 4, W + 8, H + 8, RADIUS + 3);
    bg.fillStyle(rim, 1).fillRoundedRect(-W / 2, -H / 2, W, H, RADIUS);
    bg.fillStyle(colors.cardFace, 1).fillRoundedRect(-W / 2 + RIM, -H / 2 + RIM, W - RIM * 2, H - RIM * 2, RADIUS - 6);
    bg.fillStyle(0xffffff, 0.6).fillRoundedRect(-W / 2 + RIM + 10, -H / 2 + RIM + 4, W - RIM * 2 - 20, 16, 8);

    this.columnGlow = scene.add.graphics();
    this.boxes = scene.add.graphics();
    this.face = scene.add.container(0, 0);

    const digits = placeDigits(value);
    const empty = new Set(emptyPlaces(value));
    for (const place of PLACES) {
      const x = columnX(place);
      if (empty.has(place)) {
        const ghost = scene.add.text(x, DIGIT_Y, '0', digitStyle(fontSize.placeDigit, place)).setOrigin(0.5).setAlpha(0);
        this.ghosts.push(ghost);
        this.face.add(ghost);
        continue;
      }
      this.face.add(scene.add.text(x, DIGIT_Y, String(digits[place]), digitStyle(fontSize.placeDigit, place)).setOrigin(0.5));
    }
    PLACES.forEach((place, i) => {
      const letter = scene.add
        .text(columnX(place), LETTER_Y, uiText.placeLetters[i], {
          fontFamily: FONT_FAMILY, fontSize: `${fontSize.placeLetter}px`, fontStyle: 'bold', color: colors.placesCss[place], stroke: colors.inkCss, strokeThickness: 4,
        })
        .setOrigin(0.5);
      this.letters.push(letter);
    });
    this.setPlaceBoxes(opts.placeBoxes);

    this.add([bg, this.columnGlow, this.boxes, this.face, ...this.letters]);
    this.setSize(W, H);
    this.setInteractive({ useHandCursor: true });
    scene.add.existing(this);
  }

  /** Dotted boxes in empty places, plus little H T O letters. Hints always turn them on. */
  setPlaceBoxes(on: boolean): void {
    const g = this.boxes.clear();
    this.letters.forEach((l) => l.setVisible(on));
    if (!on) return;
    for (const place of emptyPlaces(this.value)) {
      const x = columnX(place);
      const left = x - BOX_W / 2;
      const top = DIGIT_Y - BOX_H / 2;
      g.fillStyle(colors.places[place], 0.12).fillRoundedRect(left, top, BOX_W, BOX_H, 12);
      // Dashed outline.
      g.lineStyle(4, colors.places[place], 0.9);
      const dash = 9;
      for (let dx = 0; dx < BOX_W; dx += dash * 2) {
        g.lineBetween(left + dx, top, left + Math.min(dx + dash, BOX_W), top);
        g.lineBetween(left + dx, top + BOX_H, left + Math.min(dx + dash, BOX_W), top + BOX_H);
      }
      for (let dy = 0; dy < BOX_H; dy += dash * 2) {
        g.lineBetween(left, top + dy, left, top + Math.min(dy + dash, BOX_H));
        g.lineBetween(left + BOX_W, top + dy, left + BOX_W, top + Math.min(dy + dash, BOX_H));
      }
    }
  }

  get hasEmptyPlaces(): boolean {
    return this.ghosts.length > 0;
  }

  /** Pop ghost zeros into the empty places. */
  showGhostZeros(): Promise<void> {
    this.setPlaceBoxes(true);
    if (this.ghosts.length === 0) return Promise.resolve();
    return new Promise((resolve) => {
      this.ghosts.forEach((g, i) => {
        g.setAlpha(0.55).setScale(0);
        this.scene.time.delayedCall(i * 220, () => sfx.pop());
        this.scene.tweens.add({ targets: g, scale: 1, delay: i * 220, duration: 380, ease: 'Back.out', onComplete: i === this.ghosts.length - 1 ? () => resolve() : undefined });
      });
    });
  }

  hideGhostZeros(): void {
    this.ghosts.forEach((g) => g.setAlpha(0));
  }

  /** Glow one column (or none). */
  highlightPlace(place: Place | null): void {
    const g = this.columnGlow.clear();
    if (!place) return;
    g.fillStyle(colors.places[place], 0.3).fillRoundedRect(columnX(place) - COL / 2 + 2, -H / 2 + RIM + 2, COL - 4, H - RIM * 2 - 4, 14);
    g.lineStyle(4, colors.places[place], 1).strokeRoundedRect(columnX(place) - COL / 2 + 2, -H / 2 + RIM + 2, COL - 4, H - RIM * 2 - 4, 14);
  }

  /** Zoom in from above the screen with a spin. */
  enter(delay = 0): Promise<void> {
    const ty = this.y;
    this.y = -H;
    this.angle = Phaser.Math.Between(-160, 160);
    this.setScale(0.4);
    this.scene.time.delayedCall(delay, () => sfx.whoosh());
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this, y: ty, angle: 0, scale: 1, delay, duration: 560, ease: 'Back.out',
        onComplete: () => {
          this.startIdle();
          resolve();
        },
      });
    });
  }

  startIdle(): void {
    this.stopIdle();
    this.idleTweens.push(
      this.scene.tweens.add({ targets: this.face, y: -4, duration: 900 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' }),
      this.scene.tweens.add({ targets: this, angle: { from: -1.5, to: 1.5 }, duration: 1300 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' }),
    );
  }

  stopIdle(): void {
    this.idleTweens.forEach((t) => t.remove());
    this.idleTweens = [];
    this.angle = 0;
    this.face.y = 0;
  }

  /** Fly to a spot with a little arc. */
  flyTo(x: number, y: number, duration = 420): Promise<void> {
    this.stopIdle();
    this.scene.tweens.killTweensOf(this);
    // A new flight replaces one in progress (e.g. he takes a card back mid-air).
    this.flight?.stop();
    this.setScale(1);
    const lift = Math.min(90, Math.abs(y - this.y) * 0.4 + 30);
    const from = { x: this.x, y: this.y };
    const state = { t: 0 };
    sfx.whoosh();
    return new Promise((resolve) => {
      this.flight = this.scene.tweens.add({
        targets: state, t: 1, duration, ease: 'Sine.inOut',
        onUpdate: () => {
          const t = state.t;
          this.x = from.x + (x - from.x) * t;
          this.y = from.y + (y - from.y) * t - Math.sin(Math.PI * t) * lift;
          this.angle = Math.sin(Math.PI * t) * 12;
          this.setScale(1 + Math.sin(Math.PI * t) * 0.12);
        },
        onComplete: () => {
          this.angle = 0;
          this.setScale(1);
          this.scene.tweens.add({ targets: this, scaleY: { from: 0.86, to: 1 }, scaleX: { from: 1.1, to: 1 }, duration: 220, ease: 'Back.out' });
          this.startIdle();
          resolve();
        },
      });
    });
  }

  /** Go back to its tray spot. */
  goHome(): Promise<void> {
    return this.flyTo(this.homeX, this.homeY, 380);
  }

  /** Full happy spin for a correct pick. */
  spin(): void {
    this.stopIdle();
    this.scene.tweens.add({
      targets: this, angle: 360, duration: 520, ease: 'Back.out',
      onComplete: () => {
        this.angle = 0;
        this.startIdle();
      },
    });
    this.scene.tweens.add({ targets: this, scale: { from: 1.25, to: 1 }, duration: 520, ease: 'Elastic.out' });
  }

  celebrate(): void {
    this.scene.tweens.add({ targets: this, scale: { from: 1.18, to: 1 }, duration: 420, ease: 'Elastic.out' });
  }

  /** Gentle wobble (not a red X) for a wrong pick. */
  wobble(): Promise<void> {
    const x = this.x;
    return new Promise((resolve) => {
      this.scene.tweens.add({ targets: this, x: x + 14, duration: 60, yoyo: true, repeat: 3, onComplete: () => { this.x = x; resolve(); } });
    });
  }

  /** Strong hint after a second miss: a gentle pulse that says "this one!". */
  setPulse(on: boolean): void {
    this.pulseTween?.remove();
    this.pulseTween = undefined;
    if (!on) return;
    this.pulseTween = this.scene.tweens.add({ targets: this.face, scale: { from: 1, to: 1.12 }, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  exit(delay = 0): Promise<void> {
    this.disableInteractive();
    this.stopIdle();
    this.setPulse(false);
    this.scene.tweens.killTweensOf(this);
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this, y: this.y + 520, angle: Phaser.Math.Between(-200, 200), scale: 0.5, delay, duration: 480, ease: 'Back.in',
        onComplete: () => {
          this.destroy();
          resolve();
        },
      });
    });
  }

  preDestroy(): void {
    this.stopIdle();
    this.pulseTween?.remove();
    this.flight?.remove();
  }
}
