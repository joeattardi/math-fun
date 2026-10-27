import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { type VoiceStyle, speech } from '../audio/speech';
import { colors, fontSize, textStyle, timing } from '../theme';
import type { SpeechBubble } from '../ui/SpeechBubble';

export type Reaction = 'happy' | 'confused' | 'dance' | 'cheer' | 'wave';

/**
 * Base for code-drawn characters. The origin is at the feet, so `y` is the ground.
 * Everything lives in `rig`, which gets the idle bob and squash; subclasses add parts to it.
 */
export abstract class Character extends Phaser.GameObjects.Container {
  abstract readonly voice: VoiceStyle;
  /** Height of the character, for placing "?" and bubbles above the head. */
  abstract readonly headY: number;
  readonly rig: Phaser.GameObjects.Container;
  private idleTween?: Phaser.Tweens.Tween;
  private blinkTimer?: Phaser.Time.TimerEvent;
  private talkTimer?: Phaser.Time.TimerEvent;
  protected busy = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.rig = scene.add.container(0, 0);
    this.add(this.rig);
    scene.add.existing(this);
  }

  /** Subclasses: close eyes (true) or open them. */
  protected abstract setEyesClosed(closed: boolean): void;
  /** Subclasses: open or close the mouth for talking. */
  protected abstract setMouthOpen(open: boolean): void;

  startIdle(): void {
    this.idleTween = this.scene.tweens.add({
      targets: this.rig,
      y: -6,
      scaleY: 1.03,
      scaleX: 0.985,
      duration: 700 + Math.random() * 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    const blink = () => {
      this.setEyesClosed(true);
      this.scene.time.delayedCall(130, () => this.setEyesClosed(false));
      this.blinkTimer = this.scene.time.delayedCall(1800 + Math.random() * 2600, blink);
    };
    this.blinkTimer = this.scene.time.delayedCall(800 + Math.random() * 1500, blink);
    this.onIdleStart();
  }

  /** Subclasses add their own fidgets here. */
  protected onIdleStart(): void {}

  /** Pop up from the ground with a boing. */
  enter(delay = 0, scale = 1): Promise<void> {
    return new Promise((resolve) => {
      this.setScale(0);
      this.scene.time.delayedCall(delay, () => sfx.boing());
      this.scene.tweens.add({ targets: this, scale, duration: 600, delay, ease: 'Back.out', onComplete: () => resolve() });
    });
  }

  /**
   * Speak a line with a bubble. `display` is shorter text for the bubble when it differs.
   * Resolves when speech ends (or its watchdog fires); speech failures never block.
   */
  async say(bubble: SpeechBubble, text: string, opts: { display?: string; interrupt?: boolean; prompt?: { text: string; color?: string }[] } = {}): Promise<void> {
    if (opts.prompt) bubble.showPrompt(opts.prompt, this.x, this.y + this.headY);
    else bubble.show(opts.display ?? text, this.x, this.y + this.headY);
    this.startTalking();
    const started = this.scene.time.now;
    await speech.say(text, this.voice, { interrupt: opts.interrupt ?? true });
    this.stopTalking();
    // Give early readers a moment with the bubble even if speech was fast or absent.
    const elapsed = this.scene.time.now - started;
    const minimum = Math.min(timing.minBubble, 400 + text.length * 25);
    if (elapsed < minimum && this.active) {
      await new Promise<void>((r) => this.scene.time.delayedCall(minimum - elapsed, r));
    }
  }

  private startTalking(): void {
    this.talkTimer?.remove();
    let open = false;
    this.talkTimer = this.scene.time.addEvent({
      delay: 120,
      loop: true,
      callback: () => {
        open = !open;
        this.setMouthOpen(open);
      },
    });
  }

  private stopTalking(): void {
    this.talkTimer?.remove();
    this.talkTimer = undefined;
    if (this.active) this.setMouthOpen(false);
  }

  react(kind: Reaction): Promise<void> {
    const scene = this.scene;
    const rig = this.rig;
    // Pause the idle bob so it doesn't fight the reaction.
    this.idleTween?.pause();
    rig.setPosition(0, 0).setScale(1);
    return new Promise<void>((done) => {
      const resolve = () => {
        if (this.active) this.idleTween?.resume();
        done();
      };
      switch (kind) {
        case 'happy':
          scene.tweens.chain({
            targets: rig,
            tweens: [
              { scaleX: 1.15, scaleY: 0.85, duration: 90 },
              { y: -40, scaleX: 0.92, scaleY: 1.1, duration: 200, ease: 'Quad.out' },
              { y: 0, scaleX: 1, scaleY: 1, duration: 240, ease: 'Bounce.out' },
            ],
            onComplete: () => resolve(),
          });
          break;
        case 'confused': {
          sfx.goof();
          const q = scene.add.text(this.x, this.y + this.headY - 20, '?', textStyle(fontSize.heading, colors.yellowCss)).setOrigin(0.5).setDepth(700);
          scene.tweens.add({ targets: q, y: q.y - 50, angle: { from: -20, to: 20 }, duration: 900, ease: 'Sine.out' });
          scene.tweens.add({ targets: q, alpha: 0, delay: 700, duration: 300, onComplete: () => q.destroy() });
          scene.tweens.add({ targets: rig, angle: { from: -10, to: 10 }, duration: 110, yoyo: true, repeat: 3, onComplete: () => { rig.angle = 0; resolve(); } });
          break;
        }
        case 'dance':
          scene.tweens.chain({
            targets: rig,
            tweens: [
              { angle: -16, y: -18, duration: 160 },
              { angle: 16, y: 0, duration: 160 },
              { angle: -16, y: -18, duration: 160 },
              { angle: 16, y: 0, duration: 160 },
              { angle: 0, scaleX: -1, duration: 200 },
              { scaleX: 1, duration: 200 },
            ],
            onComplete: () => { rig.angle = 0; resolve(); },
          });
          break;
        case 'cheer':
          scene.tweens.add({
            targets: rig,
            y: -50,
            duration: 220,
            yoyo: true,
            repeat: 2,
            ease: 'Quad.out',
            onComplete: () => { rig.y = 0; resolve(); },
          });
          this.onCheer();
          break;
        case 'wave':
          this.onWave();
          scene.time.delayedCall(1200, () => resolve());
          break;
      }
    });
  }

  protected onCheer(): void {}
  protected onWave(): void {}

  preDestroy(): void {
    this.idleTween?.remove();
    this.blinkTimer?.remove();
    this.talkTimer?.remove();
  }
}
