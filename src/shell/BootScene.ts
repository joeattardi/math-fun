import Phaser from 'phaser';
import { generateSharedTextures } from '../shared/ui/textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    generateSharedTextures(this);
    // Tell the boot guard in index.html the game is up; later errors only get recorded.
    const w = window as unknown as { __mathFunBooted?: boolean; __mathFunBootDone?: () => void };
    if (w.__mathFunBootDone) w.__mathFunBootDone();
    else w.__mathFunBooted = true;
    this.scene.start('TapToStart');
  }
}
