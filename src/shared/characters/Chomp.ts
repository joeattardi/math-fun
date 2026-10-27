import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { colors, stroke } from '../theme';
import { Character } from './Character';
import { voices } from './voices';

const GREEN = 0x52b788;
const GREEN_DARK = 0x2d6a4f;
const BELLY = 0xd8f3dc;
const JAW = 0x95d5b2;
const OPEN_ANGLE = -24;

/** Chomp the Crocodile: always hungry, faces right, chomps toward the greater number. */
export class Chomp extends Character {
  readonly voice = voices.chomp;
  readonly headY = -170;
  private head: Phaser.GameObjects.Container;
  private upperJaw: Phaser.GameObjects.Container;
  private lids: Phaser.GameObjects.Graphics;
  private pupils: Phaser.GameObjects.Graphics;
  private tail: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const line = colors.ink;
    const lw = stroke.thin + 1;

    // Tail (behind everything)
    this.tail = scene.add.container(-55, -50);
    const tg = scene.add.graphics();
    const tailPts = [[0, -22], [-60, -8], [-104, 8], [-62, 12], [0, 24]].map(([px, py]) => new Phaser.Math.Vector2(px, py));
    tg.fillStyle(GREEN, 1).fillPoints(tailPts, true).lineStyle(lw, line, 1).strokePoints(tailPts, true, true);
    for (let i = 0; i < 3; i++) tg.fillStyle(GREEN_DARK, 1).fillTriangle(-18 - i * 26, -14 + i * 5, -6 - i * 26, -16 + i * 5, -12 - i * 26, -28 + i * 6);
    this.tail.add(tg);

    // Legs
    const legs = scene.add.graphics();
    for (const lx of [-42, 26]) {
      legs.fillStyle(GREEN, 1).fillRoundedRect(lx, -34, 34, 34, 10).lineStyle(lw, line, 1).strokeRoundedRect(lx, -34, 34, 34, 10);
      legs.fillStyle(0xffffff, 1).fillCircle(lx + 8, -2, 5).fillCircle(lx + 18, -2, 5).fillCircle(lx + 28, -2, 5);
    }

    // Body
    const body = scene.add.graphics();
    body.fillStyle(GREEN, 1).fillEllipse(0, -64, 150, 98).lineStyle(lw, line, 1).strokeEllipse(0, -64, 150, 98);
    body.fillStyle(BELLY, 1).fillEllipse(14, -52, 96, 56);
    for (let i = 0; i < 4; i++) body.fillStyle(GREEN_DARK, 1).fillTriangle(-50 + i * 26, -104 + Math.abs(i - 1.5) * 4, -36 + i * 26, -106 + Math.abs(i - 1.5) * 4, -43 + i * 26, -120 + Math.abs(i - 1.5) * 4);

    // Head: lower jaw static, upper jaw (with eyes) pivots to open
    this.head = scene.add.container(38, -100);
    const lower = scene.add.graphics();
    lower.fillStyle(JAW, 1).fillRoundedRect(-14, -2, 122, 30, 14).lineStyle(lw, line, 1).strokeRoundedRect(-14, -2, 122, 30, 14);
    lower.fillStyle(colors.pink, 1).fillEllipse(48, 4, 70, 12);
    for (let i = 0; i < 6; i++) lower.fillStyle(0xffffff, 1).fillTriangle(12 + i * 16, 0, 24 + i * 16, 0, 18 + i * 16, -10);

    this.upperJaw = scene.add.container(-14, 2);
    const up = scene.add.graphics();
    up.fillStyle(GREEN, 1).fillEllipse(24, -22, 76, 62).lineStyle(lw, line, 1).strokeEllipse(24, -22, 76, 62);
    up.fillStyle(GREEN, 1).fillRoundedRect(14, -32, 128, 34, 16).lineStyle(lw, line, 1).strokeRoundedRect(14, -32, 128, 34, 16);
    up.fillStyle(GREEN, 1).fillRect(20, -28, 30, 28);
    for (let i = 0; i < 7; i++) up.fillStyle(0xffffff, 1).fillTriangle(26 + i * 16, 1, 38 + i * 16, 1, 32 + i * 16, 14);
    up.fillStyle(GREEN_DARK, 1).fillCircle(128, -24, 4).fillCircle(118, -26, 4);
    // Eyes on top bumps
    up.fillStyle(GREEN, 1).fillCircle(18, -52, 20).fillCircle(48, -54, 20).lineStyle(lw, line, 1).strokeCircle(18, -52, 20).strokeCircle(48, -54, 20);
    up.fillStyle(0xffffff, 1).fillCircle(18, -54, 14).fillCircle(48, -56, 14);
    this.pupils = scene.add.graphics();
    this.drawPupils(4, 0);
    this.lids = scene.add.graphics();
    this.lids.fillStyle(GREEN, 1).fillCircle(18, -54, 15).fillCircle(48, -56, 15).lineStyle(3, line, 1).lineBetween(4, -54, 32, -54).lineBetween(34, -56, 62, -56);
    this.lids.setVisible(false);
    this.upperJaw.add([up, this.pupils, this.lids]);
    this.head.add([lower, this.upperJaw]);

    this.rig.add([this.tail, legs, body, this.head]);
  }

  private drawPupils(dx: number, dy: number, spin = false): void {
    const p = this.pupils;
    p.clear().fillStyle(colors.ink, 1);
    if (spin) {
      p.lineStyle(3, colors.ink, 1);
      p.beginPath().arc(18, -54, 8, 0, Math.PI * 1.6).strokePath();
      p.beginPath().arc(48, -56, 8, Math.PI, Math.PI * 2.6).strokePath();
      return;
    }
    p.fillCircle(18 + dx, -54 + dy, 7).fillCircle(48 + dx, -56 + dy, 7);
    p.fillStyle(0xffffff, 1).fillCircle(20 + dx, -57 + dy, 2.5).fillCircle(50 + dx, -59 + dy, 2.5);
  }

  protected setEyesClosed(closed: boolean): void {
    this.lids.setVisible(closed);
  }

  protected setMouthOpen(open: boolean): void {
    this.upperJaw.angle = open ? OPEN_ANGLE * 0.5 : 0;
  }

  protected onIdleStart(): void {
    this.scene.tweens.add({ targets: this.tail, angle: { from: -6, to: 8 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // Look around now and then.
    this.scene.time.addEvent({
      delay: 2600,
      loop: true,
      callback: () => {
        if (!this.busy) this.drawPupils(Phaser.Math.Between(-3, 5), Phaser.Math.Between(-3, 3));
      },
    });
  }

  /** Happy chomp-and-wiggle, lunging toward a target x if given. */
  chomp(towardX?: number): Promise<void> {
    const scene = this.scene;
    this.busy = true;
    const lunge = towardX !== undefined ? Phaser.Math.Clamp((towardX - this.x) * 0.12, -30, 40) : 0;
    this.drawPupils(5, 0);
    return new Promise((resolve) => {
      scene.tweens.add({ targets: this.rig, x: lunge, duration: 160, yoyo: true, hold: 520, ease: 'Quad.out' });
      scene.tweens.add({
        targets: this.upperJaw,
        angle: OPEN_ANGLE,
        duration: 90,
        yoyo: true,
        repeat: 2,
        onYoyo: () => sfx.bonk(),
        onComplete: () => {
          this.upperJaw.angle = 0;
          scene.tweens.add({
            targets: this.rig,
            angle: { from: -8, to: 8 },
            duration: 120,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
              this.rig.angle = 0;
              this.busy = false;
              resolve();
            },
          });
        },
      });
    });
  }

  /** Dramatic confusion: spinning eyes, mouth hanging open. */
  async confused(): Promise<void> {
    this.busy = true;
    this.drawPupils(0, 0, true);
    this.upperJaw.angle = OPEN_ANGLE * 0.6;
    await this.react('confused');
    this.upperJaw.angle = 0;
    this.drawPupils(4, 0);
    this.busy = false;
  }

  protected onWave(): void {
    this.scene.tweens.add({ targets: this.tail, angle: { from: -25, to: 25 }, duration: 150, yoyo: true, repeat: 4 });
    this.scene.tweens.add({ targets: this.upperJaw, angle: OPEN_ANGLE, duration: 200, yoyo: true, repeat: 1 });
  }

  protected onCheer(): void {
    this.scene.tweens.add({ targets: this.upperJaw, angle: OPEN_ANGLE, duration: 220, yoyo: true, repeat: 2 });
  }
}
