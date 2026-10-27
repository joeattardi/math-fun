import Phaser from 'phaser';
import { games } from './games/registry';
import { BootScene } from './shell/BootScene';
import { MenuScene } from './shell/MenuScene';
import { ParentStatsScene } from './shell/ParentStatsScene';
import { SettingsScene } from './shell/SettingsScene';
import { StickerBookScene } from './shell/StickerBookScene';
import { TapToStartScene } from './shell/TapToStartScene';
import { GAME_HEIGHT, GAME_WIDTH, colors } from './shared/theme';

const shellScenes = [BootScene, TapToStartScene, MenuScene, SettingsScene, StickerBookScene, ParentStatsScene];

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: colors.sky,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // All audio is Tone.js / Web Audio / speechSynthesis, so Phaser doesn't need its own.
  audio: { noAudio: true },
  input: { activePointers: 3 },
  render: { antialias: true },
  scene: [...shellScenes, ...games.flatMap((g) => g.scenes)],
});

// Stop iOS pinch / double-tap zoom gestures inside the game.
for (const type of ['gesturestart', 'gesturechange', 'dblclick']) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}
