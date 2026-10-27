import Phaser from 'phaser';
import { music } from '../shared/audio/music';
import { sfx } from '../shared/audio/sfx';
import { progress, type Settings } from '../shared/progress';
import { CENTER_X, colors, fontSize, textStyle } from '../shared/theme';
import { Button } from '../shared/ui/Button';
import { popIn } from '../shared/ui/effects';
import { addHomeButton, setupScene } from './sceneKit';

const ROWS: { key: keyof Settings; label: string; y: number; color: number }[] = [
  { key: 'music', label: 'Music', y: 300, color: colors.pink },
  { key: 'sound', label: 'Sounds', y: 460, color: colors.blue },
];

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create(): void {
    setupScene(this);
    addHomeButton(this);
    const title = this.add.text(CENTER_X, 120, 'Settings', textStyle(fontSize.heading + 10, colors.yellowCss, 10)).setOrigin(0.5);
    popIn(this, title);

    for (const row of ROWS) {
      const label = () => `${row.label}: ${progress.settings[row.key] ? 'ON' : 'OFF'}`;
      const btn: Button = new Button(this, {
        x: CENTER_X, y: row.y, width: 440, height: 110, label: label(), fontPx: fontSize.heading - 8, color: row.color,
        onTap: () => {
          progress.setSetting(row.key, !progress.settings[row.key]);
          btn.text?.setText(label());
          btn.setAlpha(progress.settings[row.key] ? 1 : 0.65);
          if (row.key === 'music') music.refresh();
          sfx.sparkle();
        },
      });
      btn.setAlpha(progress.settings[row.key] ? 1 : 0.65);
      popIn(this, btn, 150);
    }
    this.add.text(CENTER_X, 590, 'Voices always talk, even with music off.', textStyle(fontSize.small + 2)).setOrigin(0.5);
  }
}
