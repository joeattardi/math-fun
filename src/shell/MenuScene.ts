import Phaser from 'phaser';
import { music } from '../shared/audio/music';
import { sfx } from '../shared/audio/sfx';
import { speech } from '../shared/audio/speech';
import { Chomp } from '../shared/characters/Chomp';
import { Hops } from '../shared/characters/Hops';
import { Waddles } from '../shared/characters/Waddles';
import { voices } from '../shared/characters/voices';
import { exposeDebug } from '../shared/debug';
import { LinePicker } from '../shared/praise';
import { CENTER_X, colors, fontSize, stroke, textStyle } from '../shared/theme';
import { Button } from '../shared/ui/Button';
import { puff, shine, squash } from '../shared/ui/effects';
import { games } from '../games/registry';
import type { GameDefinition } from '../games/types';
import { setupScene } from './sceneKit';
import { goTo } from './transitions';

const TILE = 290;
const TILE_GAP = 50;
const LONG_PRESS_MS = 3000;

const GREETINGS = [
  'Pick a game! I hope it has snacks!',
  'Welcome back, math genius!',
  'Ready for some number fun?',
  'Tap a game to start! Ribbit!',
  'Hello again! Let us play!',
  'The swamp missed you!',
  'Ooh, it is game time!',
];
const picker = new LinePicker();

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    setupScene(this);
    music.play('menu');

    this.buildTitle();
    this.buildTiles();

    new Button(this, {
      x: 250, y: 668, width: 330, height: 96, label: 'Sticker Book', color: colors.purple,
      icon: (g) => {
        g.fillStyle(colors.white, 1).fillCircle(0, 0, 22).lineStyle(4, colors.ink, 1).strokeCircle(0, 0, 22);
        g.fillStyle(colors.yellow, 1).fillCircle(0, 0, 12);
      },
      onTap: () => goTo(this, 'StickerBook'),
    });
    new Button(this, {
      x: 890, y: 668, width: 270, height: 96, label: 'Settings', color: colors.green,
      icon: (g) => {
        g.fillStyle(colors.white, 1);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.fillCircle(Math.cos(a) * 18, Math.sin(a) * 18, 7);
        }
        g.fillCircle(0, 0, 18).fillStyle(colors.green, 1).fillCircle(0, 0, 8);
      },
      onTap: () => goTo(this, 'Settings'),
    });

    const chomp = new Chomp(this, 120, 560);
    const waddles = new Waddles(this, 1040, 560);
    const hops = new Hops(this, CENTER_X, 690);
    chomp.enter(200, 0.8).then(() => chomp.startIdle());
    waddles.enter(350, 0.8).then(() => waddles.startIdle());
    hops.enter(500).then(() => hops.startIdle());
    this.time.addEvent({ delay: 1400, loop: true, callback: () => void hops.react('happy') });

    const greeter = Phaser.Utils.Array.GetRandom([chomp, waddles]);
    this.time.delayedCall(700, () => {
      void speech.say(picker.pick('greet', GREETINGS), greeter === chomp ? voices.chomp : voices.waddles, { interrupt: true });
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => speech.cancel());
  }

  private buildTitle(): void {
    const title = this.add.text(CENTER_X, 84, 'Math Fun!', textStyle(fontSize.title, colors.yellowCss, 12)).setOrigin(0.5);
    this.tweens.add({ targets: title, y: 74, angle: { from: -2, to: 2 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // Hidden parent door: hold the title for 3 seconds.
    title.setInteractive();
    const ring = this.add.graphics().setDepth(2000);
    let holdTimer: Phaser.Time.TimerEvent | null = null;
    let holdStart = 0;
    const cancel = () => {
      holdTimer?.remove();
      holdTimer = null;
      ring.clear();
    };
    title.on('pointerdown', () => {
      holdStart = this.time.now;
      holdTimer = this.time.addEvent({
        delay: 50,
        loop: true,
        callback: () => {
          const p = (this.time.now - holdStart) / LONG_PRESS_MS;
          ring.clear();
          // Only show progress after a second, so it stays secret from casual taps.
          if (p > 0.33) ring.lineStyle(6, colors.white, 0.8).beginPath().arc(title.x, title.y, 70, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p).strokePath();
          if (p >= 1) {
            cancel();
            goTo(this, 'ParentStats');
          }
        },
      });
    });
    title.on('pointerup', cancel);
    title.on('pointerout', cancel);
  }

  private buildTiles(): void {
    const totalW = games.length * TILE + (games.length - 1) * TILE_GAP;
    games.forEach((game, i) => {
      const x = CENTER_X - totalW / 2 + TILE / 2 + i * (TILE + TILE_GAP);
      this.buildTile(game, x, 350, i);
    });
    exposeDebug('menuGames', games.map((g) => g.id));
  }

  private buildTile(game: GameDefinition, x: number, y: number, index: number): void {
    const tile = this.add.container(x, y);
    const bg = this.add.graphics();
    const r = 40;
    bg.fillStyle(colors.ink, 1).fillRoundedRect(-TILE / 2, -TILE / 2 + 10, TILE, TILE, r);
    bg.fillStyle(game.color, 1).fillRoundedRect(-TILE / 2, -TILE / 2, TILE, TILE, r);
    bg.fillStyle(0xffffff, 0.25).fillRoundedRect(-TILE / 2 + 14, -TILE / 2 + 10, TILE - 28, TILE * 0.3, 24);
    bg.lineStyle(stroke.medium, colors.ink, 1).strokeRoundedRect(-TILE / 2, -TILE / 2, TILE, TILE, r);
    const icon = this.add.graphics({ x: 0, y: -24 });
    game.drawIcon(icon);
    const label = this.add.text(0, TILE / 2 - 48, game.title, textStyle(fontSize.body + 4)).setOrigin(0.5);
    tile.add([bg, icon, label]);
    tile.setSize(TILE, TILE).setInteractive({ useHandCursor: true });

    tile.setScale(0);
    this.tweens.add({ targets: tile, scale: 1, delay: 200 + index * 120, duration: 650, ease: 'Back.out', onStart: () => sfx.boing() });
    this.tweens.add({ targets: tile, angle: { from: -2.5, to: 2.5 }, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: icon, y: -34, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    shine(this, bg, 800, 1800);

    tile.on('pointerdown', (p: Phaser.Input.Pointer) => {
      squash(this, tile);
      sfx.pop();
      puff(this, p.x, p.y, game.color);
      this.time.delayedCall(150, () => goTo(this, game.entryScene, undefined, { x, y }));
    });
  }
}
