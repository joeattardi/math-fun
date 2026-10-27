import Phaser from 'phaser';
import { generateSharedTextures } from '../shared/ui/textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    generateSharedTextures(this);
    this.scene.start('TapToStart');
  }
}
