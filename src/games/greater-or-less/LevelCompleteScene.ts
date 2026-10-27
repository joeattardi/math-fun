import Phaser from 'phaser';
import { music } from '../../shared/audio/music';
import { sfx } from '../../shared/audio/sfx';
import { speech } from '../../shared/audio/speech';
import type { Character } from '../../shared/characters/Character';
import { Chomp } from '../../shared/characters/Chomp';
import { Hops } from '../../shared/characters/Hops';
import { Waddles } from '../../shared/characters/Waddles';
import { exposeDebug } from '../../shared/debug';
import { LinePicker } from '../../shared/praise';
import { progress } from '../../shared/progress';
import { STICKERS } from '../../shared/stickers';
import { CENTER_X, colors, fontSize, textStyle } from '../../shared/theme';
import { Button } from '../../shared/ui/Button';
import { SpeechBubble } from '../../shared/ui/SpeechBubble';
import { drawSticker } from '../../shared/ui/StickerArt';
import { confetti, fireworks, flash, shake, shine, starBurst, wait } from '../../shared/ui/effects';
import { drawStar } from '../../shared/ui/textures';
import { addHomeButton, setupScene } from '../../shell/sceneKit';
import { goTo } from '../../shell/transitions';
import { GAME_ID, SCENES } from './constants';
import { chompLines } from './lines/chomp';
import { hopsLines } from './lines/hops';
import { bestScorePraise, recordPraise } from './lines/praise';
import { waddlesLines } from './lines/waddles';
import { LEVELS } from './questions';
import { uiText } from './ui-text';

export interface LevelCompleteData {
  levelIndex: number;
  stars: 1 | 2 | 3;
  newBestStars: boolean;
  newBestScore: boolean;
  unlockedNext: boolean;
  newRecordStreak: boolean;
  bestStreak: number;
  /** Sticker ids awarded this time. */
  stickers: string[];
  trophies: number;
}

const STAR_Y = 205;
const STAR_GAP = 130;
const STICKER_X = 900;
const STICKER_Y = 330;
const BUBBLE_X = 440;
const BUBBLE_WIDTH = 520;
const ABORT = Symbol('aborted');

/** The party: drumroll, stars, fanfare, a dance-off, and a sticker reveal. */
export class LevelCompleteScene extends Phaser.Scene {
  private info!: LevelCompleteData;
  private alive = false;
  private picker = new LinePicker();

  constructor() {
    super(SCENES.levelComplete);
  }

  init(data: LevelCompleteData): void {
    this.info = data;
  }

  create(): void {
    this.alive = true;
    const swamp = setupScene(this);
    swamp.setHype(2);
    music.play('menu');
    addHomeButton(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.alive = false;
      speech.cancel();
    });
    exposeDebug('levelComplete', () => ({ ...this.info, done: this.buttonsShown }));
    void this.party().catch((e) => {
      if (e !== ABORT) throw e;
    });
  }

  private buttonsShown = false;

  private async step<T>(p: Promise<T>): Promise<T> {
    const v = await p;
    if (!this.alive) throw ABORT;
    return v;
  }

  private async party(): Promise<void> {
    this.buttonsShown = false;
    const bubble = new SpeechBubble(this, BUBBLE_X, STICKER_Y, BUBBLE_WIDTH);
    const chomp = new Chomp(this, 140, 640);
    const waddles = new Waddles(this, 1010, 640);
    const hops = new Hops(this, CENTER_X, 560);
    const cast: [Character, readonly string[]][] = [
      [chomp, chompLines.levelComplete],
      [waddles, waddlesLines.levelComplete],
      [hops, hopsLines.levelComplete],
    ];
    cast.forEach(([c], i) => c.enter(200 + i * 150, c === hops ? 1.3 : 0.75).then(() => c.startIdle()));

    // Drumroll, then the banner crashes in.
    sfx.drumroll(1.3);
    await this.step(wait(this, 1300));
    const banner = this.add.text(CENTER_X, 90, uiText.levelDone, textStyle(fontSize.title, colors.yellowCss, 12)).setOrigin(0.5).setDepth(500);
    banner.setScale(0).setAngle(-30);
    this.tweens.add({ targets: banner, scale: 1, angle: 0, duration: 700, ease: 'Back.out' });
    this.tweens.add({ targets: banner, scale: { from: 1, to: 1.06 }, duration: 600, delay: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    music.fanfare();
    flash(this);
    shake(this, 0.006);
    confetti(this, 2.5, 1.5);

    // Stars, one at a time. Always at least one.
    await this.step(wait(this, 600));
    for (let i = 0; i < this.info.stars; i++) {
      const x = CENTER_X + (i - (this.info.stars - 1) / 2) * STAR_GAP;
      const g = this.add.graphics({ x, y: STAR_Y }).setDepth(500);
      drawStar(g, 0, 0, 54, colors.yellow, colors.ink, 6);
      g.setScale(0);
      this.tweens.add({ targets: g, scale: 1, angle: 360, duration: 600, ease: 'Back.out' });
      this.tweens.add({ targets: g, y: STAR_Y - 8, duration: 700, delay: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      sfx.chime(i * 3);
      starBurst(this, x, STAR_Y);
      shine(this, g, 700, 1600);
      await this.step(wait(this, 520));
    }

    // Dance-off: each character takes a turn in the spotlight, then everyone together.
    const spot = this.add.graphics().setDepth(-1);
    for (const [c, lines] of cast) {
      spot.clear().fillStyle(0xffffff, 0.25).fillEllipse(c.x, c.y - 4, 220, 50);
      sfx.boing();
      void c.react('dance');
      await this.step(c.say(bubble, this.picker.pick(`lc:${c.constructor.name}`, lines)));
    }
    spot.clear();
    fireworks(this, 6);
    sfx.sparkle();
    await this.step(Promise.all(cast.map(([c]) => c.react('cheer'))));

    // Personal bests.
    const callouts: string[] = [];
    if (this.info.newRecordStreak) callouts.push(this.picker.pick('rec', recordPraise, { n: this.info.bestStreak }));
    if (this.info.newBestScore) callouts.push(this.picker.pick('best', bestScorePraise));
    for (const line of callouts) await this.step(hops.say(bubble, line));

    // Sticker reveal.
    for (const id of this.info.stickers) await this.step(this.revealSticker(id, waddles, bubble));
    if (this.info.trophies > 0) {
      const t = this.add.text(STICKER_X, STICKER_Y, uiText.trophy, textStyle(fontSize.heading, colors.yellowCss)).setOrigin(0.5);
      t.setScale(0);
      this.tweens.add({ targets: t, scale: 1, duration: 500, ease: 'Back.out' });
      await this.step(chomp.say(bubble, 'Your sticker book is full, so here is a golden trophy!'));
      t.destroy();
    }
    if (this.info.unlockedNext) {
      await this.step(waddles.say(bubble, `You unlocked ${LEVELS[this.info.levelIndex + 1].label}! Splendid!`));
    }
    bubble.hide();
    this.showButtons();
  }

  private async revealSticker(id: string, presenter: Character, bubble: SpeechBubble): Promise<void> {
    const def = STICKERS.find((s) => s.id === id);
    if (!def) return;
    const c = this.add.container(STICKER_X, STICKER_Y).setDepth(600);
    const g = this.add.graphics();
    drawSticker(g, id);
    c.add(g);
    c.setScale(0);
    sfx.whoosh();
    this.tweens.add({ targets: c, scale: 1.2, angle: 720, duration: 900, ease: 'Back.out' });
    await this.step(wait(this, 900));
    starBurst(this, c.x, c.y, 20);
    sfx.sparkle();
    const label = this.add.text(STICKER_X, STICKER_Y + 105, `${uiText.newSticker} ${def.name}`, textStyle(fontSize.body + 6, colors.yellowCss)).setOrigin(0.5).setDepth(600);
    await this.step(presenter.say(bubble, `A new sticker! ${def.name}!`, { display: `${uiText.newSticker}` }));
    // Fly it to the corner, as if into the sticker book.
    this.tweens.add({ targets: c, x: 1060, y: 60, scale: 0.35, angle: 0, duration: 600, ease: 'Cubic.in' });
    this.tweens.add({ targets: label, alpha: 0, duration: 400, onComplete: () => label.destroy() });
    await this.step(wait(this, 650));
  }

  private showButtons(): void {
    const next = this.info.levelIndex + 1;
    const canNext = next < LEVELS.length && next <= progress.game(GAME_ID).unlockedLevel;
    const y = 668;
    const again = new Button(this, {
      x: canNext ? CENTER_X - 160 : CENTER_X, y, width: 280, height: 96, label: uiText.again, color: colors.blue,
      onTap: () => goTo(this, SCENES.game, { levelIndex: this.info.levelIndex }),
    });
    again.setDepth(700);
    again.setScale(0);
    this.tweens.add({ targets: again, scale: 1, duration: 500, ease: 'Back.out' });
    if (canNext) {
      const nextBtn = new Button(this, {
        x: CENTER_X + 160, y, width: 280, height: 96, label: uiText.next, color: colors.pink,
        onTap: () => goTo(this, SCENES.game, { levelIndex: next }),
      });
      nextBtn.setDepth(700);
      nextBtn.setScale(0);
      this.tweens.add({ targets: nextBtn, scale: 1, duration: 500, delay: 120, ease: 'Back.out' });
      shine(this, nextBtn.bg, 700, 1100);
    }
    this.buttonsShown = true;
  }
}
