import Phaser from 'phaser';
import { music } from '../../shared/audio/music';
import { sfx } from '../../shared/audio/sfx';
import { setSpeechSpeed, speech } from '../../shared/audio/speech';
import type { Character } from '../../shared/characters/Character';
import { Chomp } from '../../shared/characters/Chomp';
import { Hops } from '../../shared/characters/Hops';
import type { CharacterLines } from '../../shared/characters/lines';
import { Waddles } from '../../shared/characters/Waddles';
import { FAST_FACTOR, debug, exposeDebug } from '../../shared/debug';
import { LinePicker } from '../../shared/praise';
import { progress } from '../../shared/progress';
import { type Rng, seededRng } from '../../shared/random';
import { STICKERS, milestonesCrossed, nextSticker } from '../../shared/stickers';
import { CENTER_X, colors, fontSize, layout, textStyle } from '../../shared/theme';
import { Button } from '../../shared/ui/Button';
import { ComboMeter } from '../../shared/ui/ComboMeter';
import { NumberLine } from '../../shared/ui/NumberLine';
import { SpeechBubble } from '../../shared/ui/SpeechBubble';
import type { Swamp } from '../../shared/ui/background/Swamp';
import {
  confetti, fireworks, flash, glow, puff, shake, shineOnce, sparkleBurst, squash, starBurst, wait,
} from '../../shared/ui/effects';
import { addHomeButton, setupScene } from '../../shell/sceneKit';
import { goTo } from '../../shell/transitions';
import { pickType } from './adaptivity';
import { GAME_ID, SCENES } from './constants';
import type { LevelCompleteData } from './LevelCompleteScene';
import { chompLines } from './lines/chomp';
import { hopsLines } from './lines/hops';
import {
  effortPraise, goofyPraise, hintConclusion, recordPraise, recoveryPraise, strategyPraise,
} from './lines/praise';
import { waddlesLines } from './lines/waddles';
import { NumberCard } from './NumberCard';
import {
  LEVELS, type LevelDef, type Pair, ROUNDS_PER_LEVEL, generatePair, greaterOf, lessOf,
} from './questions';
import {
  type Ask, type RoundState, answer, createRound, currentAsk, markHint, questionText, summarySentences, targetFor, wasFirstTry,
} from './round';
import { starsFor } from './stars';
import { uiText } from './ui-text';

export interface GameSceneData {
  levelIndex: number;
}

/** Thrown to unwind async flows when the scene shuts down mid-await. */
const ABORT = Symbol('scene-aborted');

const PRAISE_ROTATION = [strategyPraise, goofyPraise, effortPraise] as const;
const STREAK_CONFETTI = 3;
const STREAK_FIREWORKS = 5;
const OVERSHOOT_CHANCE = 0.25;
const TRIP_CHANCE = 0.35;

type Cast = 'chomp' | 'waddles' | 'hops';

export class GameScene extends Phaser.Scene {
  private level!: LevelDef;
  private rng!: Rng;
  private picker!: LinePicker;
  private alive = false;

  private roundIndex = 0;
  private round: RoundState | null = null;
  private lastPair?: Pair;
  private lastWasMiss = false;
  private streak = 0;
  private levelBestStreak = 0;
  private firstTryCount = 0;
  private recordAnnounced = false;
  private newRecordStreak = false;
  private roundsPlayedAtStart = 0;
  private praiseTurn = 0;

  private accepting = false;
  private hintPlaying = false;
  private cards: NumberCard[] = [];
  private asker!: Character;

  private swamp!: Swamp;
  private bubble!: SpeechBubble;
  private chomp!: Chomp;
  private waddles!: Waddles;
  private hops!: Hops;
  private line!: NumberLine;
  private combo!: ComboMeter;
  private showMe!: Button;
  private dots!: Phaser.GameObjects.Graphics;
  private roundResults: ('first' | 'recovered')[] = [];

  constructor() {
    super(SCENES.game);
  }

  init(data: GameSceneData): void {
    this.level = LEVELS[Phaser.Math.Clamp(data?.levelIndex ?? 0, 0, LEVELS.length - 1)];
    this.rng = debug.seed !== null ? seededRng(debug.seed) : Math.random;
    this.picker = new LinePicker(this.rng);
    this.roundIndex = 0;
    this.round = null;
    this.lastPair = undefined;
    this.lastWasMiss = false;
    this.streak = 0;
    this.levelBestStreak = 0;
    this.firstTryCount = 0;
    this.recordAnnounced = false;
    this.newRecordStreak = false;
    this.praiseTurn = 0;
    this.accepting = false;
    this.hintPlaying = false;
    this.cards = [];
    this.roundResults = [];
    this.roundsPlayedAtStart = progress.game(GAME_ID).roundsPlayed;
  }

  create(): void {
    this.alive = true;
    this.swamp = setupScene(this);
    if (debug.fast) setSpeechSpeed(FAST_FACTOR);
    music.play('game');
    music.setHype(0);

    addHomeButton(this, SCENES.levelSelect, () => speech.cancel());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.alive = false;
      speech.cancel();
      music.setHype(0);
    });

    this.line = new NumberLine(this, { max: this.level.max, ...layout.numberLine, endLabels: [uiText.lineLeft, uiText.lineRight] });
    this.chomp = new Chomp(this, layout.chomp.x, layout.chomp.y);
    this.waddles = new Waddles(this, layout.waddles.x, layout.waddles.y);
    this.hops = new Hops(this, this.line.xFor(0), this.line.groundY);
    this.bubble = new SpeechBubble(this);
    this.combo = new ComboMeter(this);
    this.dots = this.add.graphics().setDepth(700);
    this.drawDots();

    this.showMe = new Button(this, {
      x: layout.showMe.x,
      y: layout.showMe.y,
      width: layout.showMe.width,
      height: layout.showMe.height,
      label: uiText.showMe,
      color: colors.orange,
      onTap: () => void this.flow(() => this.onShowMe()),
    });
    this.showMe.setDepth(600).setEnabled(false);

    exposeDebug('gol', () => this.debugState());
    void this.flow(() => this.intro());
  }

  /** Run an async flow; swallow the abort that happens when the scene shuts down. */
  private async flow(fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (e) {
      if (e !== ABORT) throw e;
    }
  }

  /** Await something, then bail out if the scene is gone. */
  private async live<T>(p: Promise<T>): Promise<T> {
    const v = await p;
    if (!this.alive) throw ABORT;
    return v;
  }

  private character(name: Cast): Character {
    return name === 'chomp' ? this.chomp : name === 'waddles' ? this.waddles : this.hops;
  }

  private linesFor(c: Character): CharacterLines {
    return c === this.chomp ? chompLines : c === this.waddles ? waddlesLines : hopsLines;
  }

  private pickLine(c: Character, situation: keyof CharacterLines, vars: Record<string, string | number> = {}): string {
    const name = c === this.chomp ? 'chomp' : c === this.waddles ? 'waddles' : 'hops';
    return this.picker.pick(`${name}:${situation}`, this.linesFor(c)[situation], vars);
  }

  private async intro(): Promise<void> {
    await this.live(Promise.all([this.chomp.enter(100, 0.85), this.waddles.enter(250, 0.9), this.hops.enter(400)]));
    [this.chomp, this.waddles, this.hops].forEach((c) => c.startIdle());
    await this.nextRound();
  }

  // ---------------------------------------------------------------- rounds

  private async nextRound(): Promise<void> {
    if (this.roundIndex >= ROUNDS_PER_LEVEL) return this.endLevel();
    const type = pickType(
      { level: this.level, stats: progress.game(GAME_ID).stats, roundIndex: this.roundIndex, lastWasMiss: this.lastWasMiss },
      this.rng,
    );
    const pair = generatePair(type, this.level, this.rng, this.lastPair);
    this.round = createRound(pair, this.rng);
    this.line.clearMarkers();
    if (this.hops.x !== this.line.xFor(0)) void this.hops.hopTo(this.line.xFor(0), this.line.groundY, 110, 500);
    this.drawDots();

    await this.live(this.cardsIn(pair));
    const roll = this.rng();
    this.asker = roll < 0.45 ? this.chomp : roll < 0.9 ? this.waddles : this.hops;
    this.ask();
  }

  private cardsIn(pair: Pair): Promise<void> {
    const { y, width, gap } = layout.cards;
    const dx = (width + gap) / 2;
    const left = new NumberCard(this, CENTER_X - dx, y, pair.a, colors.cards[0]);
    const right = new NumberCard(this, CENTER_X + dx, y, pair.b, colors.cards[1]);
    this.cards = [left, right];
    for (const card of this.cards) card.on('pointerdown', (p: Phaser.Input.Pointer) => this.onCardTap(card, p));
    return Promise.all([left.enter(true), right.enter(false, 140)]).then(() => undefined);
  }

  private async cardsOut(): Promise<void> {
    const [left, right] = this.cards;
    this.cards = [];
    await Promise.all([left?.exit(true), right?.exit(false)]);
  }

  private termOf(ask: Ask): 'GREATER' | 'LESS' {
    return ask === 'greater' ? 'GREATER' : 'LESS';
  }

  /** Ask the current question: always exactly "Which number is greater? 28 or 51?", no extra chatter. */
  private ask(): void {
    const ask = currentAsk(this.round!);
    if (!ask) return;
    const { a, b } = this.round!.pair;
    const color = ask === 'greater' ? colors.greaterCss : colors.lessCss;
    this.accepting = true;
    this.showMe.setEnabled(true);
    void this.asker.say(this.bubble, questionText(ask, a, b), {
      prompt: [{ text: uiText.askPrefix }, { text: this.termOf(ask), color }, { text: '?' }],
    });
  }

  private onCardTap(card: NumberCard, p: Phaser.Input.Pointer): void {
    // Every tap reacts, even when it's not time to answer.
    squash(this, card);
    puff(this, p.x, p.y, card.color);
    sfx.pop();
    if (!this.accepting || !this.round) return;
    this.accepting = false;
    this.showMe.setEnabled(false);
    const result = answer(this.round, card.value);
    if (result.kind === 'correct') void this.flow(() => this.onCorrect(card, result.recovered, result.roundDone));
    else void this.flow(() => this.onWrong(card, result.ask));
  }

  private async onCorrect(card: NumberCard, recovered: boolean, roundDone: boolean): Promise<void> {
    speech.cancel();
    sfx.chime(this.streak + (roundDone ? 1 : 0));
    sfx.sparkle();
    sparkleBurst(this, card.x, card.y);
    glow(this, card);
    shineOnce(this, card);
    card.celebrate();
    void this.chomp.chomp(card.x);
    if (this.asker !== this.chomp) void this.asker.react('happy');

    if (!roundDone) {
      const bank = recovered ? recoveryPraise : PRAISE_ROTATION[this.praiseTurn++ % PRAISE_ROTATION.length];
      await this.live(this.asker.say(this.bubble, this.picker.pick(recovered ? 'recovery' : `praise${this.praiseTurn % 3}`, bank)));
      this.ask();
      return;
    }
    await this.finishRound();
  }

  private async onWrong(card: NumberCard, ask: Ask): Promise<void> {
    speech.cancel();
    card.wobble();
    if (this.rng() < 0.5) sfx.bonk();
    else sfx.slideWhistle();
    this.resetStreakQuietly();

    const term = this.termOf(ask);
    const other = this.termOf(ask === 'greater' ? 'less' : 'greater');
    const reactor = this.rng() < 0.6 ? this.chomp : this.asker;
    if (reactor === this.chomp) void this.chomp.confused();
    else void reactor.react('confused');
    await this.live(reactor.say(this.bubble, this.pickLine(reactor, 'wrong', { term, other, n: card.value })));
    await this.playHint();
    this.ask();
  }

  private async onShowMe(): Promise<void> {
    if (!this.accepting || this.hintPlaying || !this.round) return;
    this.accepting = false;
    speech.cancel();
    await this.playHint();
    this.ask();
  }

  /** The number line hint: Hops hops from 0 to each number, then explain with left and right: the number on the right is greater. */
  private async playHint(): Promise<void> {
    const round = this.round!;
    this.hintPlaying = true;
    this.accepting = false;
    this.showMe.setEnabled(false);
    markHint(round);
    this.line.setDimmed(false);
    this.line.clearMarkers();

    const pair = round.pair;
    const less = lessOf(pair);
    const greater = greaterOf(pair);
    const colorOf = (n: number) => (n === pair.a ? colors.cards[0] : colors.cards[1]);

    const introBy = this.rng() < 0.5 ? this.hops : this.asker;
    await this.live(introBy.say(this.bubble, this.pickLine(introBy, 'hint')));

    const count = (n: number) => speech.say(String(n), this.hops.voice);
    const rows: [number, 0 | 1][] = [[less, 0], [greater, 1]];
    for (const [value, row] of rows) {
      this.bubble.show(`Hop to ${value}!`, this.hops.x, this.hops.y);
      await this.live(this.line.hopFrom0(this.hops, value, count, { overshoot: this.rng() < OVERSHOOT_CHANCE, speed: debug.fast ? FAST_FACTOR : 1 }));
      this.line.placeMarker(value, colorOf(value), row);
      sfx.sparkle();
      await this.live(wait(this, 250));
    }
    void this.hops.react('happy');
    this.line.wiggleMarker(greater);
    await this.live(this.waddles.say(this.bubble, this.picker.pick('conclusion', hintConclusion, { greater, less })));
    if (this.rng() < TRIP_CHANCE) await this.live(this.waddles.trip());
    this.hintPlaying = false;
  }

  private resetStreakQuietly(): void {
    if (this.streak === 0) return;
    this.streak = 0;
    this.combo.set(0);
    music.setHype(0);
    this.swamp.setHype(0);
    this.line.setDimmed(false);
  }

  private async finishRound(): Promise<void> {
    const round = this.round!;
    const pair = round.pair;
    const firstTry = wasFirstTry(round);
    progress.recordRound(GAME_ID, pair.type, firstTry);
    this.roundResults.push(firstTry ? 'first' : 'recovered');
    this.drawDots();

    if (firstTry) {
      this.streak++;
      this.firstTryCount++;
    } else {
      this.streak = 0;
    }
    this.levelBestStreak = Math.max(this.levelBestStreak, this.streak);
    this.combo.set(this.streak);
    const isRecord = this.streak >= STREAK_CONFETTI && progress.recordStreak(GAME_ID, this.streak);
    if (isRecord) this.newRecordStreak = true;

    // Keep the visual: both numbers pop onto the number line.
    const colorOf = (n: number) => (n === pair.a ? colors.cards[0] : colors.cards[1]);
    this.line.flashPair(lessOf(pair), greaterOf(pair), colorOf(lessOf(pair)), colorOf(greaterOf(pair)));

    const celebrations = this.celebrate(firstTry);

    if (!firstTry) {
      await this.live(this.asker.say(this.bubble, this.picker.pick('recovery', recoveryPraise)));
    }
    const [s1, s2] = summarySentences(pair);
    await this.live(this.waddles.say(this.bubble, `${s1} ${s2}`, { display: `${s1}\n${s2}` }));

    if (isRecord && !this.recordAnnounced) {
      this.recordAnnounced = true;
      this.banner('New record!');
      await this.live(this.hops.say(this.bubble, this.picker.pick('record', recordPraise, { n: this.streak })));
    } else if (isRecord) {
      this.banner(`Record: ${this.streak}!`);
    } else if (firstTry && this.streak >= STREAK_CONFETTI) {
      const who = this.character((['chomp', 'waddles', 'hops'] as const)[this.streak % 3]);
      await this.live(who.say(this.bubble, this.pickLine(who, 'streak', { streak: this.streak })));
    }
    await this.live(celebrations);

    this.line.setDimmed(this.streak >= STREAK_CONFETTI);
    this.lastWasMiss = !firstTry;
    this.lastPair = pair;
    this.roundIndex++;
    this.bubble.hide();
    await this.live(this.cardsOut());
    await this.nextRound();
  }

  /** Celebration tiers. Everything here happens after the answer, never while he's choosing. */
  private celebrate(firstTry: boolean): Promise<unknown> {
    const s = this.streak;
    if (!firstTry) {
      // Recovery gets the full party too.
      confetti(this, 1.4);
      starBurst(this, CENTER_X, layout.cards.y);
      return Promise.all([this.chomp.react('dance'), this.waddles.react('dance'), this.hops.react('cheer')]);
    }
    if (s >= STREAK_FIREWORKS) {
      const extra = s - STREAK_FIREWORKS;
      fireworks(this, Math.min(4 + extra, 10));
      shake(this, Math.min(0.006 + extra * 0.0015, 0.016));
      flash(this);
      confetti(this, 1.6 + extra * 0.2, 1 + extra * 0.25);
      music.sting();
      music.setHype(2);
      this.swamp.setHype(2);
      this.combo.flash();
      return Promise.all([this.chomp.react('cheer'), this.waddles.react('cheer'), this.hops.react('cheer')]);
    }
    if (s >= STREAK_CONFETTI) {
      confetti(this, 1.4);
      this.combo.flash();
      music.setHype(1);
      this.swamp.setHype(1);
      return Promise.all([this.chomp.react('dance'), this.waddles.react('dance')]);
    }
    starBurst(this, CENTER_X, layout.cards.y, 8);
    return this.hops.react('happy');
  }

  private banner(text: string): void {
    const t = this.add.text(CENTER_X, 230, text, textStyle(fontSize.heading, colors.yellowCss, 10)).setOrigin(0.5).setDepth(1200);
    t.setScale(0);
    sfx.slideWhistle(true);
    this.tweens.add({ targets: t, scale: 1, angle: { from: -20, to: -4 }, duration: 500, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, y: 200, delay: 1800, duration: 400, onComplete: () => t.destroy() });
  }

  private drawDots(): void {
    const { y, spacing, radius } = layout.progressDots;
    const g = this.dots.clear();
    const x0 = CENTER_X - ((ROUNDS_PER_LEVEL - 1) * spacing) / 2;
    for (let i = 0; i < ROUNDS_PER_LEVEL; i++) {
      const x = x0 + i * spacing;
      const r = this.roundResults[i];
      g.fillStyle(colors.ink, 1).fillCircle(x, y, radius + 3);
      if (r === 'first') g.fillStyle(colors.yellow, 1).fillCircle(x, y, radius);
      else if (r === 'recovered') g.fillStyle(colors.green, 1).fillCircle(x, y, radius);
      else g.fillStyle(0xffffff, i === this.roundIndex ? 0.9 : 0.4).fillCircle(x, y, radius);
    }
  }

  private async endLevel(): Promise<void> {
    this.accepting = false;
    this.showMe.setEnabled(false);
    music.setHype(0);
    const stars = starsFor(this.firstTryCount, ROUNDS_PER_LEVEL);
    const result = progress.completeLevel(GAME_ID, this.level.index, stars, this.firstTryCount, LEVELS.length);

    // One sticker per level, plus bonus stickers for rounds-played milestones. Full book means trophies.
    const roundsNow = progress.game(GAME_ID).roundsPlayed;
    const awards = 1 + milestonesCrossed(this.roundsPlayedAtStart, roundsNow);
    const stickers: string[] = [];
    let trophies = 0;
    for (let i = 0; i < awards; i++) {
      const s = nextSticker(progress.snapshot().stickers);
      if (s) {
        progress.addSticker(s.id);
        stickers.push(s.id);
      } else {
        progress.addTrophy();
        trophies++;
      }
    }

    const data: LevelCompleteData = {
      levelIndex: this.level.index,
      stars,
      newBestStars: result.newBestStars,
      newBestScore: result.newBestScore,
      unlockedNext: result.unlockedNext,
      newRecordStreak: this.newRecordStreak,
      bestStreak: this.levelBestStreak,
      stickers,
      trophies,
    };
    await this.live(wait(this, 400));
    goTo(this, SCENES.levelComplete, data, { x: CENTER_X, y: layout.cards.y });
  }

  private debugState() {
    const round = this.round;
    return {
      level: this.level?.index,
      roundIndex: this.roundIndex,
      pair: round?.pair,
      ask: round ? currentAsk(round) : null,
      target: round ? targetFor(round) : null,
      accepting: this.accepting,
      hintPlaying: this.hintPlaying,
      streak: this.streak,
      firstTryCount: this.firstTryCount,
      hintUsed: round?.hintUsed ?? false,
      markers: this.line?.hasMarkers() ?? false,
      cards: this.cards.map((c) => ({ value: c.value, x: c.x, y: c.y })),
      showMe: { x: layout.showMe.x, y: layout.showMe.y, enabled: this.showMe?.isEnabled },
      stickersOwned: progress.snapshot().stickers.length,
      totalStickers: STICKERS.length,
    };
  }
}
