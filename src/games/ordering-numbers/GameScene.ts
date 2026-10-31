import Phaser from 'phaser';
import { music } from '../../shared/audio/music';
import { funnySound, sfx } from '../../shared/audio/sfx';
import { setSpeechSpeed, speech } from '../../shared/audio/speech';
import type { Character } from '../../shared/characters/Character';
import { Chomp } from '../../shared/characters/Chomp';
import { Hops } from '../../shared/characters/Hops';
import type { CharacterLines } from '../../shared/characters/lines';
import { Waddles } from '../../shared/characters/Waddles';
import { FAST_FACTOR, debug, exposeDebug } from '../../shared/debug';
import { completeLevel } from '../../shared/levels/rewards';
import { LinePicker } from '../../shared/praise';
import { progress } from '../../shared/progress';
import { type Rng, seededRng } from '../../shared/random';
import { starsFor } from '../../shared/stars';
import { CENTER_X, colors, fontSize, layout, textStyle } from '../../shared/theme';
import { Button } from '../../shared/ui/Button';
import { ComboMeter } from '../../shared/ui/ComboMeter';
import { NumberLine } from '../../shared/ui/NumberLine';
import { SpeechBubble } from '../../shared/ui/SpeechBubble';
import type { Swamp } from '../../shared/ui/background/Swamp';
import {
  confetti, fireworks, flash, glow, puff, shake, shine, shineOnce, sparkleBurst, squash, starBurst, wait,
} from '../../shared/ui/effects';
import { addHomeButton, setupScene } from '../../shell/sceneKit';
import { goTo } from '../../shell/transitions';
import { pickPitfall } from './adaptivity';
import { AnswerRow, columnXs } from './AnswerRow';
import { GAME_ID, SCENES } from './constants';
import { explainPair } from './explain';
import { chompLines } from './lines/chomp';
import { hopsLines } from './lines/hops';
import {
  effortPraise, goofyPraise, keptPraise, lastCardLines, leastPraise, partyShouts, pitfallPraise, recordPraise, recoveryPraise,
  strategyPraise,
} from './lines/praise';
import { waddlesLines } from './lines/waddles';
import { markerRows } from './markers';
import { PlaceGrid } from './PlaceGrid';
import { PlaceValueCard } from './PlaceValueCard';
import { emptyPlaces, setPitfalls } from './places';
import {
  type RoundState, check, createRound, filledCount, firstEmptySlot, markHint, pickNumber, placeNumber, remaining,
  stepPitfalls, summaryLine, takeBack, target, trickiestPair, wasFirstTry,
} from './round';
import { LEVELS, type LevelDef, ROUNDS_PER_LEVEL, SET_SIZE, generateSet } from './sets';
import { uiText } from './ui-text';

export interface GameSceneData {
  levelIndex: number;
}

/** Thrown to unwind async flows when the scene shuts down mid-await. */
const ABORT = Symbol('scene-aborted');

const PRAISE_ROTATION = [strategyPraise, goofyPraise, effortPraise] as const;
const STREAK_CONFETTI = 3;
const STREAK_FIREWORKS = 5;
/** On a second miss in the same spot, the right card starts to pulse: never a dead end. */
const PULSE_AFTER_MISSES = 2;
const TRIP_CHANCE = 0.3;
const MARKER_GAP = 78;
/** Review: silence after each spoken number, and the most we wait for one number to be said. */
const REVIEW_PAUSE = 250;
const REVIEW_SPEECH_CAP = 3000;
const ORD = layout.ordering;

type Cast = 'chomp' | 'waddles' | 'hops';

export class GameScene extends Phaser.Scene {
  private level!: LevelDef;
  private rng!: Rng;
  private picker!: LinePicker;
  private alive = false;

  private roundIndex = 0;
  private round: RoundState | null = null;
  private lastSet?: readonly number[];
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
  private cards: PlaceValueCard[] = [];

  private swamp!: Swamp;
  private bubble!: SpeechBubble;
  private chomp!: Chomp;
  private waddles!: Waddles;
  private hops!: Hops;
  private line!: NumberLine;
  private row!: AnswerRow;
  private grid!: PlaceGrid;
  private combo!: ComboMeter;
  private lineUp!: Button;
  private checkBtn?: Button;
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
    this.lastSet = undefined;
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
    this.checkBtn = undefined;
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

    this.line = this.buildNumberLine();
    this.row = new AnswerRow(this);
    this.chomp = new Chomp(this, ORD.chomp.x, ORD.chomp.y);
    this.waddles = new Waddles(this, ORD.waddles.x, ORD.waddles.y);
    this.hops = new Hops(this, this.line.xFor(0), this.line.groundY);
    this.bubble = new SpeechBubble(this);
    this.grid = new PlaceGrid(this);
    this.combo = new ComboMeter(this);
    this.dots = this.add.graphics().setDepth(700);
    this.drawDots();

    const arrange = this.level.mode === 'arrange';
    const helper = arrange ? ORD.helperHigh : ORD.helper;
    this.lineUp = new Button(this, {
      ...helper,
      label: uiText.lineUp,
      color: colors.orange,
      fontPx: fontSize.button - 4,
      onTap: () => void this.flow(() => this.onLineUp()),
    });
    this.lineUp.setDepth(600).setEnabled(false);
    if (arrange) {
      this.checkBtn = new Button(this, {
        ...ORD.helper,
        label: uiText.check,
        color: colors.green,
        onTap: () => void this.flow(() => this.onCheck()),
      });
      this.checkBtn.setDepth(600).setEnabled(false);
    }

    exposeDebug('on', () => this.debugState());
    void this.flow(() => this.intro());
  }

  /** 0 to 100 when every number has two digits, otherwise 0 to 1000 with the two-digit zone shaded. */
  private buildNumberLine(): NumberLine {
    const small = Math.max(...this.level.digits) <= 2;
    const line = new NumberLine(this, {
      ...ORD.numberLine,
      max: small ? 100 : 1000,
      tickEvery: small ? 1 : 50,
      majorEvery: small ? 10 : 100,
      endLabels: [uiText.lineLeft, uiText.lineRight],
    });
    if (!small) {
      const zone = this.add.graphics().setDepth(-1);
      const x0 = line.xFor(0);
      const x1 = line.xFor(100);
      zone.fillStyle(colors.places.tens, 0.45).fillRoundedRect(x0 - 6, line.groundY - 34, x1 - x0 + 12, 30, 10);
    }
    return line;
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

  private nameOf(c: Character): Cast {
    return c === this.chomp ? 'chomp' : c === this.waddles ? 'waddles' : 'hops';
  }

  private pickLine(c: Character, situation: keyof CharacterLines, vars: Record<string, string | number> = {}): string {
    const name = this.nameOf(c);
    const bank = name === 'chomp' ? chompLines : name === 'waddles' ? waddlesLines : hopsLines;
    return this.picker.pick(`${name}:${situation}`, bank[situation], vars);
  }

  private randomCast(): Character {
    return this.character((['chomp', 'waddles', 'hops'] as const)[Math.floor(this.rng() * 3)]);
  }

  private async intro(): Promise<void> {
    await this.live(Promise.all([
      this.chomp.enter(100, ORD.chomp.scale),
      this.waddles.enter(250, ORD.waddles.scale),
      this.hops.enter(400),
    ]));
    [this.chomp, this.waddles, this.hops].forEach((c) => c.startIdle());
    await this.nextRound();
  }

  // ---------------------------------------------------------------- rounds

  private async nextRound(): Promise<void> {
    if (this.roundIndex >= ROUNDS_PER_LEVEL) return this.endLevel();
    const focus = pickPitfall(
      { level: this.level, stats: progress.game(GAME_ID).stats, roundIndex: this.roundIndex, lastWasMiss: this.lastWasMiss },
      this.rng,
    );
    const set = generateSet(focus, this.level, this.rng, this.lastSet);
    this.round = createRound(set.numbers, this.level.mode);
    this.drawDots();
    await this.live(this.cardsIn(set.numbers));
    this.ask(true);
  }

  private cardsIn(numbers: readonly number[]): Promise<void> {
    const xs = columnXs();
    this.cards = numbers.map((n, i) => {
      const card = new PlaceValueCard(this, xs[i], ORD.trayY, n, colors.cardRims[i], { placeBoxes: this.level.placeBoxes });
      card.setDepth(500);
      card.on('pointerdown', (p: Phaser.Input.Pointer) => this.onCardTap(card, p));
      return card;
    });
    return Promise.all(this.cards.map((c, i) => c.enter(i * 120))).then(() => undefined);
  }

  private cardFor(n: number): PlaceValueCard {
    return this.cards.find((c) => c.value === n)!;
  }

  /** Ask for the next card. Waddles always asks, so the prompt sounds the same every time. */
  private ask(first = false): void {
    const round = this.round;
    if (!round) return;
    this.accepting = true;
    this.lineUp.setEnabled(remaining(round).length > 1);

    if (round.mode === 'arrange') {
      const full = filledCount(round) === SET_SIZE;
      this.row.pointAt(firstEmptySlot(round));
      this.checkBtn?.setEnabled(full);
      if (full) {
        shineOnce(this, this.checkBtn!.bg);
        void this.waddles.say(this.bubble, uiText.sayCheck, { display: uiText.askCheck });
        return;
      }
      if (first) {
        const p = uiText.askArrange;
        void this.waddles.say(this.bubble, uiText.sayArrange, {
          prompt: [{ text: p.before }, { text: p.word, color: colors.greaterCss }, { text: p.after }],
        });
      }
      if (round.misses >= PULSE_AFTER_MISSES) this.cardFor(round.sorted[firstEmptySlot(round)]).setPulse(true);
      return;
    }

    const slot = firstEmptySlot(round);
    this.row.pointAt(slot);
    const left = remaining(round).length;
    const t = target(round)!;
    if (round.stepMisses >= PULSE_AFTER_MISSES) this.cardFor(t).setPulse(true);

    if (left === 1) {
      const p = uiText.askLast;
      void this.waddles.say(this.bubble, this.picker.pick('last', lastCardLines), {
        prompt: [{ text: p.before }, { text: p.word, color: colors.lessCss }, { text: p.after }],
      });
      return;
    }
    const p = slot === 0 ? uiText.askFirst : uiText.askNext;
    const spoken = slot === 0 ? (first ? uiText.sayFirst : uiText.sayFirst[1]) : uiText.sayNext;
    void this.waddles.say(this.bubble, spoken, {
      prompt: [{ text: p.before }, { text: p.word, color: colors.greaterCss }, { text: p.after }],
    });
  }

  private onCardTap(card: PlaceValueCard, p: Phaser.Input.Pointer): void {
    // Every tap reacts, even when it's not time to answer.
    squash(this, card);
    puff(this, p.x, p.y, card.rim);
    sfx.pop();
    const round = this.round;
    if (!this.accepting || !round || this.hintPlaying) return;

    if (round.mode === 'arrange') {
      void this.flow(() => this.onArrangeTap(card));
      return;
    }
    if (!remaining(round).includes(card.value)) return;
    this.accepting = false;
    this.lineUp.setEnabled(false);
    const tested = stepPitfalls(round);
    const tricky = trickiestPair(round);
    const result = pickNumber(round, card.value);
    if (result.kind === 'correct') {
      if (!result.recovered) for (const pitfall of tested) progress.recordSkill(GAME_ID, pitfall, true);
      void this.flow(() => this.onCorrectPick(card, result.slot, result.recovered, result.roundDone, tricky));
    } else {
      progress.recordSkill(GAME_ID, result.pitfall, false);
      void this.flow(() => this.onWrongPick(card, result.target));
    }
  }

  /** Every correct pick is a little party: a funny noise, a dance, a cheer word, and specific praise. */
  private async onCorrectPick(
    card: PlaceValueCard, slot: number, recovered: boolean, roundDone: boolean,
    tricky: ReturnType<typeof trickiestPair>,
  ): Promise<void> {
    speech.cancel();
    this.bubble.hide();
    this.row.pointAt(-1);
    card.setPulse(false);
    await this.live(card.flyTo(this.row.xs[slot], this.row.slotY));
    sfx.chime(slot * 2 + Math.min(this.streak, 3));
    sfx.sparkle();
    this.time.delayedCall(180, () => funnySound(this.rng));
    sparkleBurst(this, card.x, card.y, 18);
    starBurst(this, card.x, card.y, 8);
    glow(this, card);
    shineOnce(this, card);
    card.spin();
    this.cheerWord(card.x, card.y - ORD.card.height / 2);
    void this.chomp.chomp(card.x);
    const dancer = this.character((['waddles', 'hops', 'chomp'] as const)[this.praiseTurn % 3]);
    if (dancer !== this.chomp) void dancer.react(this.rng() < 0.5 ? 'dance' : 'cheer');

    if (roundDone) {
      await this.live(this.hops.say(this.bubble, this.picker.pick('least', leastPraise)));
      await this.finishRound();
      return;
    }
    const by = this.randomCast();
    await this.live(by.say(this.bubble, this.pickPraise(by, recovered, tricky)));
    this.ask();
  }

  /** Name the trick he beat when there was one; otherwise rotate character lines and strategy praise. */
  private pickPraise(by: Character, recovered: boolean, tricky: ReturnType<typeof trickiestPair>): string {
    this.praiseTurn++;
    if (recovered) return this.picker.pick('recovery', recoveryPraise);
    if (tricky) {
      const key = tricky.pitfall === 'second' && tricky.greater < 100 ? 'second2' : tricky.pitfall;
      const bank = pitfallPraise[key];
      if (bank) return this.picker.pick(`pitfall:${key}`, bank, { greater: tricky.greater, less: tricky.less });
    }
    if (this.praiseTurn % 2 === 0) return this.picker.pick('strategy', strategyPraise);
    return this.pickLine(by, 'correct');
  }

  /** A big silly word bursts out of the card: "WOW!", "BOOM!". After the answer, so it never hides a number he's choosing. */
  private cheerWord(x: number, y: number): void {
    const word = this.picker.pick('cheer', uiText.cheerWords);
    const color = Phaser.Utils.Array.GetRandom([colors.yellowCss, colors.pinkCss, colors.whiteCss]);
    const t = this.add.text(x, y, word, textStyle(fontSize.heading, color, 10)).setOrigin(0.5).setDepth(1100);
    t.setScale(0).setAngle(Phaser.Math.Between(-15, 15));
    this.tweens.add({ targets: t, scale: 1, y: y - 40, duration: 360, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, y: y - 90, delay: 700, duration: 360, onComplete: () => t.destroy() });
  }

  private async onWrongPick(card: PlaceValueCard, targetValue: number): Promise<void> {
    speech.cancel();
    await this.live(card.wobble());
    if (this.rng() < 0.5) sfx.bonk();
    else sfx.slideWhistle();
    this.resetStreakQuietly();
    await this.live(this.goofReaction(card.value));
    await this.playHint(targetValue, card.value);
    this.ask();
  }

  /** The joke is always on a character, never on him. */
  private async goofReaction(n: number): Promise<void> {
    const reactor = this.rng() < 0.5 ? this.chomp : this.randomCast();
    if (reactor === this.chomp) void this.chomp.confused();
    else void reactor.react('confused');
    await this.live(reactor.say(this.bubble, this.pickLine(reactor, 'wrong', { n })));
  }

  // ---------------------------------------------------------------- arrange mode

  /** Placing and taking back are instant, so quick taps never get lost while a card is still flying. */
  private async onArrangeTap(card: PlaceValueCard): Promise<void> {
    const round = this.round!;
    const inSlot = round.slots.indexOf(card.value);
    if (inSlot >= 0) {
      if (takeBack(round, inSlot) === null) {
        // Locked: it was confirmed right. Happy little bounce.
        card.celebrate();
        return;
      }
      void card.goHome();
    } else {
      const slot = placeNumber(round, card.value);
      if (slot < 0) return;
      card.setPulse(false);
      void card.flyTo(this.row.xs[slot], this.row.slotY).then(() => sfx.tick(slot * 3));
    }
    this.ask();
  }

  private async onCheck(): Promise<void> {
    const round = this.round;
    if (!round || !this.accepting || filledCount(round) < SET_SIZE) return;
    this.accepting = false;
    this.checkBtn?.setEnabled(false);
    this.lineUp.setEnabled(false);
    this.row.pointAt(-1);
    speech.cancel();
    const result = check(round);
    if (result.kind === 'correct') {
      if (!result.recovered) for (const pitfall of setPitfalls(round.numbers)) progress.recordSkill(GAME_ID, pitfall, true);
      this.cards.forEach((c, i) => this.time.delayedCall(i * 120, () => {
        sparkleBurst(this, c.x, c.y, 12);
        sfx.chime(i * 2);
        c.spin();
      }));
      this.time.delayedCall(500, () => funnySound(this.rng));
      this.cheerWord(CENTER_X, ORD.slotsY - ORD.card.height / 2);
      await this.live(wait(this, 600));
      await this.finishRound();
      return;
    }

    progress.recordSkill(GAME_ID, result.pitfall, false);
    this.resetStreakQuietly();
    const keptCards = result.kept.map((i) => this.cardFor(round.sorted[i]));
    keptCards.forEach((c) => {
      glow(this, c, colors.green);
      c.celebrate();
    });
    const back = this.cards.filter((c) => !round.slots.includes(c.value));
    await this.live(Promise.all(back.map((c) => c.wobble())));
    sfx.slideWhistle();
    await this.live(Promise.all(back.map((c) => c.goHome())));
    if (keptCards.length > 0) {
      sfx.sparkle();
      await this.live(this.waddles.say(this.bubble, this.picker.pick('kept', keptPraise)));
    } else {
      await this.live(this.goofReaction(result.placed));
    }
    await this.playHint(result.target, result.placed);
    this.ask(true);
  }

  // ---------------------------------------------------------------- hints

  /**
   * The place value hint: stack the two numbers, ones under ones, fill empty places with
   * ghost zeros, then compare place by place from the left.
   */
  private async playHint(greater: number, less: number): Promise<void> {
    const round = this.round!;
    this.hintPlaying = true;
    this.accepting = false;
    this.lineUp.setEnabled(false);
    this.checkBtn?.setEnabled(false);
    markHint(round);

    const introBy = this.rng() < 0.5 ? this.hops : this.waddles;
    await this.live(introBy.say(this.bubble, this.pickLine(introBy, 'hint')));
    await this.live(this.grid.show([less, greater].map((n) => ({ value: n, rim: this.cardFor(n).rim }))));
    if (emptyPlaces(less).length > 0) {
      await this.live(this.grid.fillZeros());
    }
    const { steps, sentences } = explainPair(greater, less);
    for (let i = 0; i < steps.length; i++) {
      this.grid.highlight(steps[i].place);
      await this.live(this.waddles.say(this.bubble, sentences[i]));
    }
    this.grid.markGreater(greater);
    void this.hops.react('happy');
    await this.live(this.waddles.say(this.bubble, sentences[sentences.length - 1]));
    if (this.rng() < TRIP_CHANCE) await this.live(this.waddles.trip());
    await this.live(this.grid.hide());
    this.hintPlaying = false;
  }

  /** "Line up!" helper: stack every tray number in the place chart. Free to use, never counts against him. */
  private async onLineUp(): Promise<void> {
    const round = this.round;
    if (!round || !this.accepting || this.hintPlaying) return;
    const left = remaining(round);
    if (left.length < 2) return;
    this.accepting = false;
    this.hintPlaying = true;
    this.lineUp.setEnabled(false);
    this.checkBtn?.setEnabled(false);
    speech.cancel();
    markHint(round);

    await this.live(this.grid.show(left.map((n) => ({ value: n, rim: this.cardFor(n).rim }))));
    if (left.some((n) => emptyPlaces(n).length > 0)) {
      await this.live(this.grid.fillZeros());
      await this.live(this.hops.say(this.bubble, uiText.lineUpZeros));
    }
    this.grid.highlight('hundreds');
    await this.live(this.waddles.say(this.bubble, uiText.lineUpHundreds, { display: uiText.lineUpHundredsShort }));
    await this.live(wait(this, 900));
    await this.live(this.grid.hide());
    this.hintPlaying = false;
    this.ask();
  }

  private resetStreakQuietly(): void {
    if (this.streak === 0) return;
    this.streak = 0;
    this.combo.set(0);
    music.setHype(0);
    this.swamp.setHype(0);
  }

  // ---------------------------------------------------------------- round end

  private async finishRound(): Promise<void> {
    const round = this.round!;
    const firstTry = wasFirstTry(round);
    progress.countRound(GAME_ID);
    this.roundResults.push(firstTry ? 'first' : 'recovered');
    this.drawDots();
    this.lineUp.setEnabled(false);
    this.checkBtn?.setEnabled(false);
    this.row.pointAt(-1);

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

    // The review: Hops hops down the row, one card at a time, and each number drops on the line.
    await this.live(this.reviewHops(round));
    const celebrations = this.celebrate(firstTry);
    await this.live(speech.say(this.picker.pick('shout', partyShouts), this.chomp.voice, { interrupt: true }));
    const praise = firstTry
      ? this.picker.pick(`praise${this.praiseTurn % 3}`, PRAISE_ROTATION[this.praiseTurn++ % PRAISE_ROTATION.length])
      : this.picker.pick('recovery', recoveryPraise);
    await this.live(this.randomCast().say(this.bubble, praise));
    await this.live(this.waddles.say(this.bubble, summaryLine(round)));

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

    this.lastWasMiss = !firstTry;
    this.lastSet = round.numbers;
    this.roundIndex++;
    this.bubble.hide();
    this.line.clearMarkers();
    this.row.setArrowVisible(true);
    void this.hops.hopTo(this.line.xFor(0), this.line.groundY, 120, 520);
    await this.live(Promise.all(this.cards.map((c, i) => c.exit(i * 70))));
    this.cards = [];
    await this.nextRound();
  }

  /** Hops lands on each card, left to right, with a note that steps down: greatest to least. */
  private async reviewHops(round: RoundState): Promise<void> {
    this.row.setArrowVisible(false);
    const rows = markerRows(round.sorted.map((n) => this.line.xFor(n)), MARKER_GAP);
    const top = this.row.slotY - ORD.card.height / 2;
    for (let i = 0; i < SET_SIZE; i++) {
      const n = round.sorted[i];
      const card = this.cardFor(n);
      await this.live(this.hops.hopTo(card.x, top, 90, 360));
      sfx.tick(12 - i * 4);
      squash(this, card);
      this.line.placeMarker(n, card.rim, rows[i], false, { bar: false });
      starBurst(this, card.x, card.y, 6);
      // Wait for Waddles to finish saying the number ("five hundred sixty-nine" takes a while),
      // capped so a stuck speech engine never stalls the round.
      await this.live(Promise.race([
        speech.say(String(n), this.waddles.voice, { interrupt: i === 0 }),
        wait(this, REVIEW_SPEECH_CAP),
      ]));
      await this.live(wait(this, REVIEW_PAUSE));
    }
    await this.live(this.hops.hopTo(this.row.xs[SET_SIZE - 1] + ORD.card.width / 2 + 40, this.line.groundY, 100, 420));
  }

  /** Celebration tiers. Everything here happens after the answer, never while he's choosing. */
  private celebrate(firstTry: boolean): Promise<unknown> {
    const s = this.streak;
    if (!firstTry) {
      // Recovery gets the full party too.
      confetti(this, 1.4);
      starBurst(this, CENTER_X, ORD.slotsY);
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
    // Every finished round is a dance party, even without a streak.
    confetti(this, 0.9, 0.7);
    sfx.partyHorn();
    sparkleBurst(this, CENTER_X, ORD.slotsY, 18);
    starBurst(this, CENTER_X, ORD.slotsY, 8);
    return Promise.all([this.chomp.react('dance'), this.waddles.react('dance'), this.hops.react('cheer')]);
  }

  private banner(text: string): void {
    const t = this.add.text(CENTER_X, ORD.trayY, text, textStyle(fontSize.heading, colors.yellowCss, 10)).setOrigin(0.5).setDepth(1200);
    t.setScale(0);
    sfx.slideWhistle(true);
    this.tweens.add({ targets: t, scale: 1, angle: { from: -20, to: -4 }, duration: 500, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, y: ORD.trayY - 30, delay: 1800, duration: 400, onComplete: () => t.destroy() });
    shine(this, t, 600, 1e9);
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
    this.lineUp.setEnabled(false);
    music.setHype(0);
    const data = completeLevel({
      gameId: GAME_ID,
      levelIndex: this.level.index,
      levelCount: LEVELS.length,
      stars: starsFor(this.firstTryCount, ROUNDS_PER_LEVEL),
      score: this.firstTryCount,
      roundsPlayedAtStart: this.roundsPlayedAtStart,
      newRecordStreak: this.newRecordStreak,
      bestStreak: this.levelBestStreak,
    });
    await this.live(wait(this, 400));
    goTo(this, SCENES.levelComplete, data, { x: CENTER_X, y: ORD.slotsY });
  }

  private debugState() {
    const round = this.round;
    return {
      level: this.level?.index,
      mode: this.level?.mode,
      roundIndex: this.roundIndex,
      numbers: round?.numbers,
      sorted: round?.sorted,
      slots: round?.slots,
      target: round && round.mode === 'pick' ? target(round) : null,
      accepting: this.accepting,
      hintPlaying: this.hintPlaying,
      streak: this.streak,
      firstTryCount: this.firstTryCount,
      misses: round?.misses ?? 0,
      cards: this.cards.map((c) => ({ value: c.value, x: c.x, y: c.y })),
      lineUp: { x: this.lineUp.x, y: this.lineUp.y, enabled: this.lineUp.isEnabled },
      check: this.checkBtn ? { x: this.checkBtn.x, y: this.checkBtn.y, enabled: this.checkBtn.isEnabled } : null,
    };
  }
}
