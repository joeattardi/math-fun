import Phaser from 'phaser';
import { music } from '../../shared/audio/music';
import { funnySound, sfx } from '../../shared/audio/sfx';
import { setSpeechSpeed, speech } from '../../shared/audio/speech';
import type { Character } from '../../shared/characters/Character';
import { Chomp } from '../../shared/characters/Chomp';
import { Hops } from '../../shared/characters/Hops';
import { Waddles } from '../../shared/characters/Waddles';
import { FAST_FACTOR, debug, exposeDebug } from '../../shared/debug';
import { progress } from '../../shared/progress';
import { CENTER_X, CENTER_Y, colors, fontSize, layout, stroke, textStyle } from '../../shared/theme';
import { Button } from '../../shared/ui/Button';
import { SpeechBubble } from '../../shared/ui/SpeechBubble';
import { confetti, glow, popIn, puff, shine, sparkleBurst, squash, starBurst } from '../../shared/ui/effects';
import { addHomeButton, setupScene } from '../../shell/sceneKit';
import { goTo } from '../../shell/transitions';
import { AnswerRow, columnXs } from './AnswerRow';
import { BaseTenBlocks, UNIT } from './BaseTenBlocks';
import { GAME_ID, SCENES } from './constants';
import { explainPair } from './explain';
import { PlaceGrid } from './PlaceGrid';
import { PlaceValueCard } from './PlaceValueCard';
import { type RoundState, createRound, firstEmptySlot, pickNumber, remaining } from './round';
import { STRATEGY_NARRATION, type Speaker, TEACH_STEPS, type TeachCheck, type TeachCue, type TeachLine, type TeachStep } from './teach/script';
import { uiText } from './ui-text';

const ABORT = Symbol('teach-aborted');
const ORD = layout.ordering;
/** Grid sits higher in the teach flow so blocks fit under it. */
const GRID_Y_HIGH = 296;
const BLOCKS_Y = 556;
const BLOCK_SCALE = 1.6;
const NAV_Y = 678;
const NAV = { width: 220, height: 84 };
const OPTION_Y = 640;
const OPTION = { width: 220, height: 120, gap: 300 };
const SKIP = { x: 1062, y: 40, width: 120, height: 64 };

/**
 * Step-by-step lesson before the game: places, empty places as zeros, the "fewer digits" trap,
 * lining up ones, comparing from the left, then a worked example and a guided turn.
 */
export class TeachScene extends Phaser.Scene {
  private alive = false;
  private stepIndex = 0;
  private bubble!: SpeechBubble;
  private chomp!: Chomp;
  private waddles!: Waddles;
  private hops!: Hops;
  private grid!: PlaceGrid;
  private nextBtn!: Button;
  private againBtn!: Button;
  private dots!: Phaser.GameObjects.Graphics;
  private stageObjects: Phaser.GameObjects.GameObject[] = [];
  private blocks: BaseTenBlocks[] = [];
  private optionButtons: Button[] = [];
  /** Bumped on every step start, so a replayed step cancels the old one. */
  private runId = 0;
  private waitingForNext = false;
  private your: { round: RoundState; cards: PlaceValueCard[]; row: AnswerRow; busy: boolean; done: () => void } | null = null;

  constructor() {
    super(SCENES.teach);
  }

  init(): void {
    this.stepIndex = 0;
    this.stageObjects = [];
    this.blocks = [];
    this.optionButtons = [];
    this.your = null;
    this.waitingForNext = false;
  }

  create(): void {
    this.alive = true;
    setupScene(this);
    if (debug.fast) setSpeechSpeed(FAST_FACTOR);
    music.play('menu');
    addHomeButton(this, SCENES.levelSelect, () => speech.cancel());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.alive = false;
      speech.cancel();
    });

    this.chomp = new Chomp(this, 110, 722);
    this.waddles = new Waddles(this, 1030, 722);
    this.hops = new Hops(this, 290, 716);
    this.bubble = new SpeechBubble(this);
    this.grid = new PlaceGrid(this);
    this.dots = this.add.graphics().setDepth(700);

    this.againBtn = new Button(this, {
      x: CENTER_X - 130, y: NAV_Y, ...NAV, label: uiText.again, color: colors.blue,
      onTap: () => this.startStep(this.stepIndex),
    });
    this.nextBtn = new Button(this, {
      x: CENTER_X + 130, y: NAV_Y, ...NAV, label: uiText.nextStep, color: colors.green,
      onTap: () => this.onNext(),
    });
    shine(this, this.nextBtn.bg, 700, 1400);
    this.showNav(false);

    if (progress.game(GAME_ID).teachSeen) {
      new Button(this, { ...SKIP, label: uiText.skip, color: colors.purple, fontPx: fontSize.body, wobble: false, onTap: () => this.finish() }).setDepth(1500);
    }

    exposeDebug('teach', () => ({
      step: this.stepIndex,
      id: TEACH_STEPS[this.stepIndex]?.id,
      waitingForNext: this.waitingForNext,
      next: { x: this.nextBtn.x, y: this.nextBtn.y },
      options: this.optionButtons.map((b) => ({ x: b.x, y: b.y, label: b.text?.text })),
      your: this.your ? { cards: this.your.cards.map((c) => ({ value: c.value, x: c.x, y: c.y })), slots: this.your.round.slots } : null,
    }));

    void this.guard(async () => {
      await this.step(Promise.all([this.chomp.enter(100, 0.62), this.waddles.enter(250, 0.66), this.hops.enter(400)]));
      [this.chomp, this.waddles, this.hops].forEach((c) => c.startIdle());
      this.startStep(0);
    });
  }

  /** Run an async flow; swallow the abort from a closed scene or a restarted step. */
  private async guard(fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (e) {
      if (e !== ABORT) throw e;
    }
  }

  /** Await, then stop if the scene closed or a newer step started. */
  private async step<T>(p: Promise<T>, run = this.runId): Promise<T> {
    const v = await p;
    if (!this.alive || run !== this.runId) throw ABORT;
    return v;
  }

  private who(s: Speaker): Character {
    return s === 'chomp' ? this.chomp : s === 'waddles' ? this.waddles : this.hops;
  }

  private showNav(on: boolean): void {
    this.waitingForNext = on;
    for (const b of [this.nextBtn, this.againBtn]) {
      b.setVisible(on).setEnabled(on);
      if (on) popIn(this, b);
    }
  }

  private drawDots(): void {
    const { y, spacing, radius } = layout.progressDots;
    const g = this.dots.clear();
    const n = TEACH_STEPS.length;
    const x0 = CENTER_X - ((n - 1) * spacing) / 2;
    for (let i = 0; i < n; i++) {
      g.fillStyle(colors.ink, 1).fillCircle(x0 + i * spacing, y, radius + 3);
      g.fillStyle(i < this.stepIndex ? colors.yellow : 0xffffff, i === this.stepIndex ? 1 : i < this.stepIndex ? 1 : 0.4).fillCircle(x0 + i * spacing, y, radius);
    }
  }

  private onNext(): void {
    if (!this.waitingForNext) return;
    if (this.stepIndex >= TEACH_STEPS.length - 1) {
      this.finish();
      return;
    }
    this.startStep(this.stepIndex + 1);
  }

  private finish(): void {
    progress.markTeachSeen(GAME_ID);
    speech.cancel();
    goTo(this, SCENES.levelSelect);
  }

  private clearStage(): void {
    this.tweens.killTweensOf(this.stageObjects);
    this.stageObjects.forEach((o) => o.destroy());
    this.stageObjects = [];
    this.blocks = [];
    this.optionButtons.forEach((b) => b.destroy());
    this.optionButtons = [];
    this.your?.cards.forEach((c) => c.destroy());
    this.your?.row.destroy();
    this.your = null;
    this.grid.setVisible(false);
    this.grid.setY(ORD.grid.y);
  }

  private keep<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.stageObjects.push(o);
    return o;
  }

  private startStep(index: number): void {
    speech.cancel();
    this.runId++;
    const run = this.runId;
    this.stepIndex = index;
    this.showNav(false);
    this.clearStage();
    this.drawDots();
    void this.guard(() => this.runStep(TEACH_STEPS[index], run));
  }

  private async runStep(s: TeachStep, run: number): Promise<void> {
    await this.step(this.titleBanner(s.title), run);
    const visual = s.visual;
    await this.step(this.setUp(visual), run);
    for (const line of s.intro) await this.say(line, run);
    await this.step(this.animate(visual, run), run);
    for (const line of s.outro ?? []) await this.say(line, run);
    if (s.check) await this.step(this.runCheck(s.check, run), run);
    this.bubble.hide();
    this.showNav(true);
  }

  private async say(line: TeachLine, run: number): Promise<void> {
    if (line.cue) await this.step(this.runCue(line.cue), run);
    await this.step(this.who(line.who).say(this.bubble, line.say, { display: line.show }), run);
  }

  /** Big entrance for each step's name, then it gets out of the way. */
  private titleBanner(title: string): Promise<void> {
    const t = this.add.text(CENTER_X, CENTER_Y - 20, title, textStyle(fontSize.heading, colors.yellowCss, 10)).setOrigin(0.5).setDepth(1200);
    if (t.width > 1000) t.setScale(1000 / t.width);
    const to = t.scale;
    t.setScale(0).setAngle(-12);
    sfx.slideWhistle(true);
    return new Promise((resolve) => {
      this.tweens.add({ targets: t, scale: to, angle: 0, duration: 450, ease: 'Back.out' });
      this.tweens.add({
        targets: t, alpha: 0, y: t.y - 60, delay: 1300, duration: 350,
        onComplete: () => {
          t.destroy();
          resolve();
        },
      });
    });
  }

  // ---------------------------------------------------------------- visuals

  private trayCards(numbers: readonly number[], placeBoxes = true): PlaceValueCard[] {
    const xs = columnXs();
    return numbers.map((n, i) => {
      const c = this.keep(new PlaceValueCard(this, xs[i], ORD.trayY, n, colors.cardRims[i], { placeBoxes }));
      c.setDepth(500);
      c.on('pointerdown', (p: Phaser.Input.Pointer) => {
        squash(this, c);
        puff(this, p.x, p.y, c.rim);
        sfx.pop();
        this.onYourTurnTap(c);
      });
      return c;
    });
  }

  /** Put the step's pieces on stage (before the intro lines). */
  private async setUp(v: TeachStep['visual']): Promise<void> {
    switch (v.kind) {
      case 'hello':
        this.keep(new AnswerRow(this));
        return;
      case 'places':
      case 'empty-place': {
        this.grid.setY(GRID_Y_HIGH);
        await this.grid.show([{ value: v.n, rim: colors.cardRims[0] }]);
        const b = new BaseTenBlocks(this, 0, BLOCKS_Y, v.n, BLOCK_SCALE);
        b.x = CENTER_X - b.blockWidth / 2;
        this.blocks.push(this.keep(b));
        return;
      }
      case 'blocks': {
        const [a, b] = [v.a, v.b];
        const left = new BaseTenBlocks(this, 0, BLOCKS_Y - 40, a, BLOCK_SCALE);
        const right = new BaseTenBlocks(this, 0, BLOCKS_Y - 40, b, BLOCK_SCALE);
        left.x = CENTER_X - 260 - left.blockWidth / 2;
        right.x = CENTER_X + 200 - right.blockWidth / 2;
        this.blocks.push(this.keep(left), this.keep(right));
        [[left, a], [right, b]].forEach(([blk, n]) => {
          const bb = blk as BaseTenBlocks;
          const label = this.keep(this.add.text(bb.x + bb.blockWidth / 2, BLOCKS_Y - 40 - 10 * UNIT * BLOCK_SCALE - 50, String(n), textStyle(fontSize.title, colors.whiteCss, 10)).setOrigin(0.5));
          popIn(this, label);
        });
        return;
      }
      case 'line-up':
        await this.grid.show(v.numbers.map((n, i) => ({ value: n, rim: colors.cardRims[i] })));
        return;
      case 'compare':
        await this.grid.show([v.a, v.b].map((n, i) => ({ value: n, rim: colors.cardRims[i] })));
        return;
      case 'strategy':
      case 'your-turn': {
        const row = this.keep(new AnswerRow(this));
        const cards = this.trayCards(v.numbers);
        await Promise.all(cards.map((c, i) => c.enter(i * 120)));
        if (v.kind === 'your-turn') {
          await Promise.all(cards.map((c) => c.showGhostZeros()));
          this.your = { round: createRound(v.numbers, 'pick'), cards, row, busy: true, done: () => {} };
        }
        return;
      }
    }
  }

  /** The step's own animation, between the intro and outro lines. */
  private async animate(v: TeachStep['visual'], run: number): Promise<void> {
    switch (v.kind) {
      case 'hello': {
        // Each card drops straight into its spot, greatest first: never shown out of order.
        const row = this.stageObjects.find((o) => o instanceof AnswerRow) as AnswerRow;
        for (let i = 0; i < v.numbers.length; i++) {
          const c = this.keep(new PlaceValueCard(this, row.xs[i], row.slotY, v.numbers[i], colors.cardRims[i], { placeBoxes: true }));
          c.setDepth(500);
          await this.step(c.enter(), run);
          sfx.chime(8 - i * 2);
          sparkleBurst(this, c.x, c.y, 10);
        }
        confetti(this, 1);
        return;
      }
      case 'places':
      case 'empty-place':
        await this.step(this.blocks[0].build(), run);
        return;
      case 'blocks':
        for (const b of this.blocks) await this.step(b.build(70), run);
        return;
      case 'line-up':
        return;
      case 'compare':
        await this.step(this.walkComparison(v.a, v.b, run), run);
        return;
      case 'strategy':
        await this.step(this.workedExample(run), run);
        return;
      case 'your-turn':
        await this.step(this.yourTurn(), run);
        return;
    }
  }

  private async runCue(cue: TeachCue): Promise<void> {
    if ('highlight' in cue) {
      this.grid.highlight(cue.highlight);
      return;
    }
    if ('zeros' in cue) {
      await this.grid.fillZeros();
      return;
    }
    const [less, greater] = this.blocks;
    if (cue.blocks === 'hundreds') {
      greater.flats.forEach((f) => this.tweens.add({ targets: f, scale: { from: 1.15, to: 1 }, duration: 300, yoyo: true, repeat: 1 }));
      glow(this, greater, colors.places.hundreds);
      sfx.sparkle();
    } else if (cue.blocks === 'tens') {
      less.rods.forEach((r, i) => this.tweens.add({ targets: r, y: r.y - 10, duration: 160, delay: i * 60, yoyo: true }));
      glow(this, less, colors.places.tens);
      sfx.boing();
    } else {
      // Lay the 7 rods and 6 cubes right on top of the hundred flat: they don't cover it.
      const origin = greater.flatOrigin(0);
      const s = BLOCK_SCALE;
      const moves: Promise<void>[] = [];
      less.rods.forEach((rod, i) => {
        moves.push(this.moveBlock(less, rod, origin.x + i * UNIT * s, origin.y, i * 90));
      });
      less.cubes.forEach((cube, i) => {
        moves.push(this.moveBlock(less, cube, origin.x + less.rods.length * UNIT * s, origin.y + (9 - i) * UNIT * s, 700 + i * 90));
      });
      await Promise.all(moves);
      sfx.slideWhistle();
      starBurst(this, origin.x + 5 * UNIT * s, origin.y + 5 * UNIT * s, 10);
    }
  }

  /** Slide one block piece to a scene position. */
  private moveBlock(parent: BaseTenBlocks, piece: Phaser.GameObjects.Graphics, x: number, y: number, delay: number): Promise<void> {
    const lx = (x - parent.x) / parent.scaleX;
    const ly = (y - parent.y) / parent.scaleY;
    parent.setDepth(10);
    return new Promise((resolve) => {
      this.tweens.add({ targets: piece, x: lx, y: ly, delay, duration: 420, ease: 'Back.out', onStart: () => sfx.tick(3), onComplete: () => resolve() });
    });
  }

  /** Line up two numbers, then compare place by place from the left, out loud. */
  private async walkComparison(a: number, b: number, run: number): Promise<void> {
    await this.step(this.grid.fillZeros(), run);
    const { steps, sentences } = explainPair(a, b);
    for (let i = 0; i < steps.length; i++) {
      this.grid.highlight(steps[i].place);
      await this.step(this.waddles.say(this.bubble, sentences[i]), run);
    }
    this.grid.markGreater(Math.max(a, b));
    await this.step(this.waddles.say(this.bubble, sentences[sentences.length - 1]), run);
  }

  /** The master plan, acted out: find the greatest, put it first, repeat. */
  private async workedExample(run: number): Promise<void> {
    const row = this.stageObjects.find((o) => o instanceof AnswerRow) as AnswerRow;
    const cards = this.stageObjects.filter((o) => o instanceof PlaceValueCard) as PlaceValueCard[];
    await Promise.all(cards.map((c) => c.showGhostZeros()));
    const sorted = [...cards].sort((x, y) => y.value - x.value);
    for (let i = 0; i < sorted.length; i++) {
      const c = sorted[i];
      row.pointAt(i);
      c.highlightPlace(c.value >= 100 || i < 2 ? 'hundreds' : 'tens');
      glow(this, c);
      await this.step(this.waddles.say(this.bubble, STRATEGY_NARRATION[i]), run);
      c.highlightPlace(null);
      await this.step(c.flyTo(row.xs[i], row.slotY), run);
      sparkleBurst(this, c.x, c.y, 12);
      sfx.chime(i * 2);
    }
    row.pointAt(-1);
  }

  // ---------------------------------------------------------------- your turn

  private yourTurn(): Promise<void> {
    const y = this.your!;
    return new Promise((resolve) => {
      y.done = resolve;
      y.busy = false;
      this.promptYourTurn();
    });
  }

  private promptYourTurn(): void {
    const y = this.your;
    if (!y) return;
    const slot = firstEmptySlot(y.round);
    y.row.pointAt(slot);
    const p = remaining(y.round).length === 1 ? uiText.askLast : slot === 0 ? uiText.askFirst : uiText.askNext;
    const spoken = remaining(y.round).length === 1 ? uiText.sayLast : slot === 0 ? uiText.sayFirst[1] : uiText.sayNext;
    void this.waddles.say(this.bubble, spoken, {
      prompt: [{ text: p.before }, { text: p.word, color: p === uiText.askLast ? colors.lessCss : colors.greaterCss }, { text: p.after }],
    });
  }

  private onYourTurnTap(card: PlaceValueCard): void {
    const y = this.your;
    if (!y || y.busy || !remaining(y.round).includes(card.value)) return;
    y.busy = true;
    const run = this.runId;
    const result = pickNumber(y.round, card.value);
    void this.guard(async () => {
      speech.cancel();
      if (result.kind === 'correct') {
        await this.step(card.flyTo(y.row.xs[result.slot], y.row.slotY), run);
        sparkleBurst(this, card.x, card.y, 14);
        sfx.chime(result.slot * 2);
        funnySound();
        card.spin();
        if (result.roundDone) {
          confetti(this, 2);
          await this.step(Promise.all([this.chomp.react('dance'), this.waddles.react('dance'), this.hops.react('cheer')]), run);
          y.row.pointAt(-1);
          y.done();
          return;
        }
        void this.hops.react('cheer');
        void this.chomp.react('dance');
        y.busy = false;
        this.promptYourTurn();
        return;
      }
      await this.step(card.wobble(), run);
      sfx.bonk();
      void this.chomp.confused();
      const { sentences } = explainPair(result.target, result.picked);
      for (const s of sentences) await this.step(this.waddles.say(this.bubble, s), run);
      if (result.stepMisses >= 2) y.cards.find((c) => c.value === result.target)?.setPulse(true);
      y.busy = false;
      this.promptYourTurn();
    });
  }

  // ---------------------------------------------------------------- checks

  private runCheck(c: TeachCheck, run: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const ask = () => void this.waddles.say(this.bubble, c.ask).catch(() => {});
      let busy = false;
      c.options.forEach((value, i) => {
        const btn = new Button(this, {
          x: CENTER_X + (i - 0.5) * OPTION.gap, y: OPTION_Y, width: OPTION.width, height: OPTION.height,
          label: String(value), color: colors.cardRims[i], fontPx: fontSize.title - 4,
          onTap: () => {
            if (busy) return;
            busy = true;
            void this.guard(async () => {
              speech.cancel();
              if (value === c.answer) {
                sparkleBurst(this, btn.x, btn.y);
                starBurst(this, btn.x, btn.y);
                sfx.chime(6);
                this.time.delayedCall(200, () => funnySound());
                glow(this, btn);
                confetti(this, 1.2);
                void this.chomp.react('dance');
                void this.hops.react('cheer');
                void this.waddles.react('dance');
                await this.step(this.waddles.say(this.bubble, c.right), run);
                this.optionButtons.forEach((b) => b.destroy());
                this.optionButtons = [];
                resolve();
              } else {
                sfx.goof();
                void this.hops.react('confused');
                await this.step(this.hops.say(this.bubble, c.retry), run);
                busy = false;
                ask();
              }
            }).catch(reject);
          },
        });
        btn.text?.setStroke(colors.inkCss, stroke.thick);
        btn.setDepth(700);
        popIn(this, btn, i * 120);
        this.optionButtons.push(btn);
      });
      ask();
    });
  }
}
