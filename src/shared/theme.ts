/** Shared layout and look. Scenes use these instead of magic numbers. */

export const GAME_WIDTH = 1133;
export const GAME_HEIGHT = 744;
export const CENTER_X = GAME_WIDTH / 2;
export const CENTER_Y = GAME_HEIGHT / 2;

export const FONT_FAMILY = '"Arial Rounded MT Bold", "Nunito", "Trebuchet MS", "Helvetica Neue", Arial, sans-serif';

export const colors = {
  ink: 0x22223b,
  inkCss: '#22223b',
  white: 0xffffff,
  whiteCss: '#ffffff',
  sky: 0x2ec4f1,
  skyTop: 0x4cc9f0,
  skyBottom: 0xb8f2ff,
  sun: 0xffd60a,
  water: 0x2a9d8f,
  waterDeep: 0x1f7a70,
  grass: 0x80ed99,
  grassDark: 0x38b000,
  lilyPad: 0x57cc99,
  yellow: 0xffd60a,
  yellowCss: '#ffd60a',
  orange: 0xff9f1c,
  pink: 0xff5d8f,
  pinkCss: '#ff5d8f',
  purple: 0x9b5de5,
  blue: 0x3a86ff,
  green: 0x06d6a0,
  red: 0xef476f,
  greaterCss: '#ff5d8f',
  lessCss: '#3a86ff',
  tensCss: '#ffd60a',
  /** Card colors, left then right. */
  cards: [0xff9f1c, 0x9b5de5] as const,
  confetti: [0xff5d8f, 0xffd60a, 0x06d6a0, 0x3a86ff, 0x9b5de5, 0xff9f1c, 0xffffff],
};

export const fontSize = {
  cardTens: 168,
  cardOnes: 146,
  title: 84,
  heading: 56,
  prompt: 44,
  button: 36,
  body: 28,
  small: 22,
  numberLineLabel: 24,
  numberLineLabelMinor: 20,
};

export const stroke = {
  thick: 8,
  medium: 6,
  thin: 4,
};

export const touch = {
  /** Minimum gameplay tap target. */
  gameplay: 72,
  /** Minimum chrome tap target (back, settings). */
  chrome: 64,
};

export const layout = {
  topBarY: 40,
  backButton: { x: 52, y: 40, size: 68 },
  bubble: { x: CENTER_X, y: 126, maxWidth: 620, minHeight: 92 },
  cards: { y: 318, width: 250, height: 232, gap: 104 },
  /** Character positions are their feet. */
  chomp: { x: 120, y: 530 },
  waddles: { x: 1000, y: 430 },
  showMe: { x: 1000, y: 488, width: 200, height: 80 },
  numberLine: { x0: 92, x1: 1041, y: 648 },
  comboMeter: { x: 980, y: 40, width: 210, height: 40 },
  progressDots: { y: 40, spacing: 30, radius: 10 },
};

export const timing = {
  cardEntrance: 520,
  quickTween: 160,
  hop: 380,
  minBubble: 1400,
};

export function textStyle(size: number, color = colors.whiteCss, strokeWidth = stroke.medium): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_FAMILY,
    fontSize: `${size}px`,
    fontStyle: 'bold',
    color,
    stroke: colors.inkCss,
    strokeThickness: strokeWidth,
    align: 'center',
    // Room for thick strokes so glyph edges never get clipped.
    padding: { x: strokeWidth + 4, y: strokeWidth },
  };
}
