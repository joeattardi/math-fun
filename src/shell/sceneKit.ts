import Phaser from 'phaser';
import { applyDebugSpeed, exposeDebug } from '../shared/debug';
import { colors, layout, touch } from '../shared/theme';
import { Button, drawHomeIcon } from '../shared/ui/Button';
import { enableTapPuffs } from '../shared/ui/effects';
import { Swamp } from '../shared/ui/background/Swamp';
import { goTo, revealIn } from './transitions';

/** Common scene setup: background, reveal transition, tap puffs, debug hooks. */
export function setupScene(scene: Phaser.Scene, opts: { water?: boolean } = {}): Swamp {
  applyDebugSpeed(scene);
  const swamp = new Swamp(scene, opts);
  enableTapPuffs(scene);
  revealIn(scene);
  exposeDebug('scene', scene.scene.key);
  return swamp;
}

export function addHomeButton(scene: Phaser.Scene, target = 'Menu', onLeave?: () => void): Button {
  const { x, y, size } = layout.backButton;
  return new Button(scene, {
    x,
    y,
    width: Math.max(size, touch.chrome),
    height: Math.max(size, touch.chrome),
    color: colors.blue,
    icon: drawHomeIcon,
    wobble: false,
    onTap: () => {
      onLeave?.();
      goTo(scene, target);
    },
  }).setDepth(1500);
}
