import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { GAME_HEIGHT, GAME_WIDTH, colors } from '../theme';
import { TEX } from './textures';

function autoDestroy(scene: Phaser.Scene, emitter: Phaser.GameObjects.Particles.ParticleEmitter, ms: number): void {
  scene.time.delayedCall(ms, () => emitter.destroy());
}

/** Little puff of dust on every tap. */
export function puff(scene: Phaser.Scene, x: number, y: number, tint = 0xffffff): void {
  const e = scene.add.particles(x, y, TEX.puff, {
    speed: { min: 60, max: 160 },
    scale: { start: 0.7, end: 0 },
    alpha: { start: 0.9, end: 0 },
    lifespan: 420,
    tint,
    emitting: false,
  });
  e.setDepth(1000);
  e.explode(9);
  autoDestroy(scene, e, 600);
}

export function sparkleBurst(scene: Phaser.Scene, x: number, y: number, count = 22): void {
  const e = scene.add.particles(x, y, TEX.spark, {
    speed: { min: 180, max: 420 },
    scale: { start: 0.9, end: 0 },
    rotate: { min: 0, max: 360 },
    lifespan: 700,
    tint: [colors.yellow, 0xffffff, colors.pink, colors.green],
    emitting: false,
  });
  e.setDepth(900);
  e.explode(count);
  autoDestroy(scene, e, 900);
}

export function starBurst(scene: Phaser.Scene, x: number, y: number, count = 14): void {
  const ring = scene.add.image(x, y, TEX.ring).setDepth(900).setScale(0.3).setTint(colors.yellow);
  scene.tweens.add({ targets: ring, scale: 4, alpha: 0, duration: 500, ease: 'Cubic.out', onComplete: () => ring.destroy() });
  const e = scene.add.particles(x, y, TEX.star, {
    speed: { min: 220, max: 480 },
    scale: { start: 0.8, end: 0.1 },
    rotate: { start: 0, end: 360 },
    lifespan: 800,
    gravityY: 400,
    tint: colors.confetti,
    emitting: false,
  });
  e.setDepth(900);
  e.explode(count);
  autoDestroy(scene, e, 1000);
}

/** Confetti raining from the top of the screen. */
export function confetti(scene: Phaser.Scene, seconds = 1.6, intensity = 1): void {
  const e = scene.add.particles(0, -20, TEX.confetti, {
    x: { min: 0, max: GAME_WIDTH },
    speedY: { min: 150, max: 330 },
    speedX: { min: -90, max: 90 },
    rotate: { start: 0, end: 720 },
    scaleX: { min: 0.6, max: 1.4 },
    lifespan: 3200,
    gravityY: 120,
    frequency: 14 / intensity,
    quantity: 2,
    tint: colors.confetti,
  });
  e.setDepth(950);
  scene.time.delayedCall(seconds * 1000, () => e.stop());
  autoDestroy(scene, e, seconds * 1000 + 3400);
}

/** Full-screen fireworks: `count` bursts at random spots in the upper screen. */
export function fireworks(scene: Phaser.Scene, count = 4): void {
  for (let i = 0; i < count; i++) {
    scene.time.delayedCall(i * 260, () => {
      const x = Phaser.Math.Between(140, GAME_WIDTH - 140);
      const y = Phaser.Math.Between(110, GAME_HEIGHT * 0.5);
      const color = Phaser.Utils.Array.GetRandom(colors.confetti);
      const e = scene.add.particles(x, y, TEX.dot, {
        speed: { min: 140, max: 360 },
        scale: { start: 0.45, end: 0 },
        lifespan: 1000,
        gravityY: 220,
        tint: [color, 0xffffff],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      });
      e.setDepth(960);
      e.explode(46);
      sfx.firework();
      autoDestroy(scene, e, 1200);
    });
  }
}

/** A quick white flash with a bloom pulse on the camera. */
export function flash(scene: Phaser.Scene, bloom = true): void {
  const cam = scene.cameras.main;
  cam.flash(220, 255, 255, 255);
  if (!bloom || !scene.game.renderer || scene.game.renderer.type !== Phaser.WEBGL) return;
  try {
    const [b] = Phaser.Actions.AddEffectBloom(cam, { threshold: 0.6, blurRadius: 3, blendAmount: 1.2 });
    const pf = b.parallelFilters;
    scene.tweens.add({ targets: pf.blend, amount: 0, duration: 900, ease: 'Sine.out', onComplete: () => pf.destroy() });
  } catch {
    // Bloom is a bonus; never let it break a celebration.
  }
}

export function shake(scene: Phaser.Scene, intensity = 0.008, ms = 320): void {
  scene.cameras.main.shake(ms, intensity);
}

/** Add a puff and a pop to any tap on the scene (even empty space). */
export function enableTapPuffs(scene: Phaser.Scene): void {
  scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
    puff(scene, p.x, p.y);
  });
}

/** Bouncy entrance from nothing. */
export function popIn(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject & { setScale(n: number): unknown }, delay = 0, to = 1): Phaser.Tweens.Tween {
  target.setScale(0);
  return scene.tweens.add({ targets: target, scale: to, duration: 520, delay, ease: 'Back.out' });
}

/** Squash and stretch on tap. */
export function squash(scene: Phaser.Scene, target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject, base = 1): void {
  scene.tweens.killTweensOf(target);
  target.setScale(base);
  scene.tweens.chain({
    targets: target,
    tweens: [
      { scaleX: base * 1.18, scaleY: base * 0.82, duration: 70, ease: 'Quad.out' },
      { scaleX: base * 0.9, scaleY: base * 1.12, duration: 90, ease: 'Quad.inOut' },
      { scaleX: base, scaleY: base, duration: 160, ease: 'Back.out' },
    ],
  });
}

export function wait(scene: Phaser.Scene, ms: number): Promise<void> {
  return new Promise((resolve) => scene.time.delayedCall(ms, resolve));
}

/**
 * Shine sweep (Phaser 4 effect). Add it once per object: it repeats every `repeatDelay` ms,
 * and Phaser cleans it up when the object is destroyed.
 */
export function shine(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject, duration = 700, repeatDelay = 2000): void {
  if (scene.game.renderer.type !== Phaser.WEBGL || target.getData?.('shine')) return;
  try {
    Phaser.Actions.AddEffectShine(target, { duration, repeatDelay, colorFactor: [1.6, 1.6, 1.4, 1] });
    target.setData('shine', true);
  } catch {
    // ignore: shine is decoration
  }
}

/** A single sweep (for objects that are about to go away anyway). */
export function shineOnce(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject, duration = 700): void {
  shine(scene, target, duration, 1e9);
}

/** Glow halo on an object for a while. */
export function glow(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject, color = colors.yellow, ms = 1200): void {
  if (scene.game.renderer.type !== Phaser.WEBGL) return;
  try {
    target.enableFilters();
    const g = target.filters!.external.addGlow(color, 8, 0, 1, false, 10, 18);
    scene.tweens.add({ targets: g, outerStrength: 14, duration: 300, yoyo: true, repeat: 1 });
    scene.time.delayedCall(ms, () => {
      if (target.filters) target.filters.external.remove(g);
    });
  } catch {
    // ignore
  }
}
