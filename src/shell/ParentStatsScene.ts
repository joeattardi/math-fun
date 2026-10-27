import Phaser from 'phaser';
import { games } from '../games/registry';
import { FONT_FAMILY, colors, fontSize, textStyle } from '../shared/theme';
import { Button } from '../shared/ui/Button';
import { addHomeButton, setupScene } from './sceneKit';

/** Hidden screen for grown-ups (hold the menu title for 3 seconds). Plain and readable. */
export class ParentStatsScene extends Phaser.Scene {
  constructor() {
    super('ParentStats');
  }

  create(): void {
    setupScene(this, { water: false });
    addHomeButton(this);
    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 0.92).fillRoundedRect(90, 90, 953, 560, 24);
    this.add.text(566, 50, 'Grown-up Stats', textStyle(fontSize.heading - 8)).setOrigin(0.5);

    const lines = games.flatMap((g) => [`${g.title}`, ...(g.parentStats?.() ?? ['(no stats yet)']), '']);
    this.add.text(130, 120, lines.join('\n'), {
      fontFamily: FONT_FAMILY,
      fontSize: `${fontSize.small}px`,
      color: colors.inkCss,
      lineSpacing: 6,
    });

    let y = 330;
    for (const g of games) {
      if (!g.unlockAll) continue;
      const btn: Button = new Button(this, {
        x: 880, y, width: 280, height: 72, label: 'Unlock all levels', fontPx: fontSize.small + 2, color: colors.blue, wobble: false,
        onTap: () => {
          g.unlockAll?.();
          btn.text?.setText('Unlocked!');
        },
      });
      y += 100;
    }
  }
}
