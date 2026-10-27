import Phaser from 'phaser';
import { sfx } from '../shared/audio/sfx';
import { GAME_HEIGHT, GAME_WIDTH, colors } from '../shared/theme';

const COVER_RADIUS = Math.hypot(GAME_WIDTH, GAME_HEIGHT);

/** Burst a colorful circle out from (x, y), then switch scenes. The next scene calls `revealIn`. */
export function goTo(scene: Phaser.Scene, key: string, data?: object, from?: { x: number; y: number }): void {
  if (scene.registry.get('transitioning')) return;
  scene.registry.set('transitioning', true);
  const x = from?.x ?? scene.input.activePointer?.x ?? GAME_WIDTH / 2;
  const y = from?.y ?? scene.input.activePointer?.y ?? GAME_HEIGHT / 2;
  const color = Phaser.Utils.Array.GetRandom([colors.pink, colors.purple, colors.blue, colors.orange, colors.green]);
  const g = scene.add.graphics().setDepth(5000);
  const state = { r: 0 };
  sfx.whoosh();
  scene.tweens.add({
    targets: state,
    r: COVER_RADIUS,
    duration: 380,
    ease: 'Cubic.in',
    onUpdate: () => {
      g.clear().fillStyle(color, 1).fillCircle(x, y, state.r);
      g.fillStyle(colors.yellow, 1).fillCircle(x, y, state.r * 0.55);
    },
    onComplete: () => {
      scene.registry.set('transitionColor', color);
      scene.registry.set('transitioning', false);
      scene.scene.start(key, data);
    },
  });
}

/** Open a growing hole in the covering color at the start of a scene. */
export function revealIn(scene: Phaser.Scene): void {
  const color = (scene.registry.get('transitionColor') as number | undefined) ?? colors.blue;
  const g = scene.add.graphics().setDepth(5000);
  const state = { hole: 0 };
  const thick = COVER_RADIUS * 2;
  const draw = () => g.clear().lineStyle(thick, color, 1).strokeCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2, state.hole + thick / 2);
  draw();
  scene.tweens.add({
    targets: state,
    hole: COVER_RADIUS,
    duration: 460,
    ease: 'Cubic.out',
    onUpdate: draw,
    onComplete: () => g.destroy(),
  });
}
