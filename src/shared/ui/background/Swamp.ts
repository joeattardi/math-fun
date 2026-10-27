import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, colors } from '../../theme';
import { TEX } from '../textures';

const WATER_Y = 548;
const WAVE_TEX = 'bg-wave';

interface Dragonfly {
  obj: Phaser.GameObjects.Container;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  speed: number;
  phase: number;
}

/**
 * A sunny swamp that never sits still: drifting clouds, bobbing lily pads,
 * swaying reeds, buzzing dragonflies, rolling water. Gets more colorful with hype.
 */
export class Swamp {
  private dragonflies: Dragonfly[] = [];
  private clouds: Phaser.GameObjects.Image[] = [];
  private rainbow: Phaser.GameObjects.Graphics;
  private sun: Phaser.GameObjects.Container;
  private waves: Phaser.GameObjects.TileSprite[] = [];
  private bubbles?: Phaser.GameObjects.Particles.ParticleEmitter;
  private hype = 0;

  constructor(private scene: Phaser.Scene, opts: { water?: boolean } = {}) {
    const depth = -100;
    const sky = scene.add.graphics().setDepth(depth);
    sky.fillGradientStyle(colors.skyTop, colors.skyTop, colors.skyBottom, colors.skyBottom, 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.rainbow = scene.add.graphics().setDepth(depth).setAlpha(0);
    const bands = [colors.red, colors.orange, colors.yellow, colors.green, colors.blue, colors.purple];
    bands.forEach((c, i) => {
      this.rainbow.lineStyle(16, c, 1).beginPath().arc(GAME_WIDTH / 2, WATER_Y + 40, 520 - i * 16, Math.PI, 0).strokePath();
    });

    this.sun = scene.add.container(150, 116).setDepth(depth);
    const rays = scene.add.graphics();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rays.fillStyle(colors.sun, 0.7).fillTriangle(Math.cos(a - 0.12) * 50, Math.sin(a - 0.12) * 50, Math.cos(a + 0.12) * 50, Math.sin(a + 0.12) * 50, Math.cos(a) * 82, Math.sin(a) * 82);
    }
    const disc = scene.add.graphics();
    disc.fillStyle(colors.sun, 1).fillCircle(0, 0, 46).lineStyle(5, 0xf4a261, 1).strokeCircle(0, 0, 46);
    disc.fillStyle(colors.ink, 1).fillCircle(-14, -6, 5).fillCircle(14, -6, 5);
    disc.lineStyle(4, colors.ink, 1).beginPath().arc(0, 4, 16, 0.15 * Math.PI, 0.85 * Math.PI).strokePath();
    disc.fillStyle(colors.pink, 0.5).fillCircle(-26, 8, 7).fillCircle(26, 8, 7);
    this.sun.add([rays, disc]);
    scene.tweens.add({ targets: rays, angle: 360, duration: 24000, repeat: -1 });
    scene.tweens.add({ targets: this.sun, scale: { from: 1, to: 1.06 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    for (let i = 0; i < 5; i++) {
      const c = scene.add.image(Phaser.Math.Between(0, GAME_WIDTH), 60 + i * 55 + Phaser.Math.Between(-10, 10), TEX.cloud).setDepth(depth).setAlpha(0.92);
      c.setScale(0.6 + Math.random() * 0.6);
      c.setData('speed', 8 + Math.random() * 14);
      this.clouds.push(c);
    }

    // Distant hills
    const hills = scene.add.graphics().setDepth(depth);
    hills.fillStyle(colors.grass, 1);
    for (let i = 0; i < 6; i++) hills.fillCircle(i * 230 + 40, WATER_Y + 60, 150 + (i % 2) * 40);
    hills.fillStyle(colors.grassDark, 1);
    for (let i = 0; i < 9; i++) hills.fillCircle(i * 150 - 20, WATER_Y + 40, 70 + (i % 3) * 14);

    if (opts.water !== false) this.buildWater(depth);
    this.buildReeds(depth);
    for (let i = 0; i < 3; i++) this.addDragonfly(depth + 2, i);

    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
  }

  private buildWater(depth: number): void {
    const scene = this.scene;
    const water = scene.add.graphics().setDepth(depth);
    water.fillGradientStyle(colors.water, colors.water, colors.waterDeep, colors.waterDeep, 1);
    water.fillRect(0, WATER_Y, GAME_WIDTH, GAME_HEIGHT - WATER_Y);
    water.fillStyle(0xffffff, 0.35).fillRect(0, WATER_Y, GAME_WIDTH, 5);

    if (!scene.textures.exists(WAVE_TEX)) {
      const g = scene.make.graphics({}, false);
      g.lineStyle(4, 0xffffff, 0.5);
      g.beginPath();
      for (let x = 0; x <= 128; x += 4) {
        const y = 10 + Math.sin((x / 128) * Math.PI * 2) * 5;
        if (x === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokePath();
      g.generateTexture(WAVE_TEX, 128, 20);
      g.destroy();
    }
    for (let i = 0; i < 3; i++) {
      const w = scene.add.tileSprite(GAME_WIDTH / 2, WATER_Y + 30 + i * 55, GAME_WIDTH, 20, WAVE_TEX).setDepth(depth).setAlpha(0.7 - i * 0.15);
      w.setData('speed', 18 + i * 10);
      this.waves.push(w);
    }

    const pads: [number, number, boolean][] = [[60, 600, true], [300, 712, false], [560, 700, true], [830, 716, false], [1090, 600, true], [200, 570, false], [960, 566, false]];
    for (const [x, y, flower] of pads) {
      const pad = scene.add.container(x, y).setDepth(depth + 1);
      const g = scene.add.graphics();
      g.fillStyle(colors.lilyPad, 1).slice(0, 0, 38, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(340), false).fillPath();
      g.lineStyle(3, 0x2d6a4f, 1).strokeEllipse(0, 0, 76, 76);
      pad.add(g);
      pad.setScale(1, 0.42);
      if (flower) {
        const f = scene.add.graphics();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          f.fillStyle(colors.pink, 1).fillEllipse(Math.cos(a) * 9, Math.sin(a) * 9 - 16, 14, 14);
        }
        f.fillStyle(colors.yellow, 1).fillCircle(0, -16, 6);
        const holder = scene.add.container(x, y).setDepth(depth + 1);
        holder.add(f);
        scene.tweens.add({ targets: holder, y: y - 4, duration: 1300 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      }
      scene.tweens.add({ targets: pad, y: y - 4, angle: { from: -4, to: 4 }, duration: 1300 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  }

  private buildReeds(depth: number): void {
    const scene = this.scene;
    const spots = [12, 34, 1100, 1122, 1078];
    spots.forEach((x, i) => {
      const reed = scene.add.container(x, WATER_Y + 26).setDepth(depth + 1);
      const g = scene.add.graphics();
      const h = 110 + (i % 3) * 30;
      g.lineStyle(6, colors.grassDark, 1).lineBetween(0, 0, 0, -h);
      g.fillStyle(0x7f5539, 1).fillRoundedRect(-7, -h - 34, 14, 40, 7);
      g.fillStyle(colors.grass, 1).fillTriangle(0, -10, 18, -70, 4, -20);
      reed.add(g);
      scene.tweens.add({ targets: reed, angle: { from: -5, to: 5 }, duration: 1600 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
  }

  private addDragonfly(depth: number, i: number): void {
    const scene = this.scene;
    const c = scene.add.container(0, 0).setDepth(depth);
    const wings = scene.add.graphics();
    wings.fillStyle(0xffffff, 0.75).fillEllipse(-8, -8, 18, 10).fillEllipse(8, -8, 18, 10).fillEllipse(-7, -2, 14, 8).fillEllipse(7, -2, 14, 8);
    const body = scene.add.graphics();
    const tint = [colors.blue, colors.pink, colors.purple][i % 3];
    body.fillStyle(tint, 1).fillRoundedRect(-3, -8, 6, 26, 3).fillCircle(0, -10, 5);
    c.add([wings, body]);
    scene.tweens.add({ targets: wings, scaleY: 0.3, duration: 40, yoyo: true, repeat: -1 });
    this.dragonflies.push({ obj: c, cx: 200 + i * 360, cy: 230 + (i % 2) * 120, rx: 140 + i * 30, ry: 60, speed: 0.6 + i * 0.25, phase: i * 2 });
  }

  /** 0 = normal, 1 = rainbow, 2 = rainbow + floating sparkles. Never covers the play area. */
  setHype(level: number): void {
    if (level === this.hype) return;
    this.hype = level;
    this.scene.tweens.add({ targets: this.rainbow, alpha: level >= 1 ? 0.55 : 0, duration: 800 });
    if (level >= 2 && !this.bubbles) {
      this.bubbles = this.scene.add.particles(0, GAME_HEIGHT + 20, TEX.ring, {
        x: { min: 0, max: GAME_WIDTH },
        speedY: { min: -60, max: -120 },
        scale: { min: 0.15, max: 0.4 },
        alpha: { start: 0.6, end: 0 },
        lifespan: 6000,
        frequency: 260,
        tint: colors.confetti,
      }).setDepth(-90);
    } else if (level < 2 && this.bubbles) {
      this.bubbles.stop();
      const b = this.bubbles;
      this.scene.time.delayedCall(6000, () => b.destroy());
      this.bubbles = undefined;
    }
  }

  private update(_time: number, delta: number): void {
    const dt = delta / 1000;
    for (const c of this.clouds) {
      c.x += c.getData('speed') * dt * (1 + this.hype * 0.5);
      if (c.x > GAME_WIDTH + 120) c.x = -120;
    }
    for (const w of this.waves) w.tilePositionX += w.getData('speed') * dt;
    const t = this.scene.time.now / 1000;
    for (const d of this.dragonflies) {
      const a = t * d.speed + d.phase;
      const nx = d.cx + Math.cos(a) * d.rx;
      const ny = d.cy + Math.sin(a * 2) * d.ry + Math.sin(t * 9 + d.phase) * 3;
      d.obj.angle = Phaser.Math.RadToDeg(Math.atan2(ny - d.obj.y, nx - d.obj.x)) + 90;
      d.obj.setPosition(nx, ny);
    }
  }
}
