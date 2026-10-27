/**
 * Shape of a character's line bank. Lines can use placeholders filled by the game:
 * {term} the asked term in caps (GREATER / LESS), {other} the opposite term,
 * {n} a number, {greater} and {less} the pair, {streak} the streak count.
 */
export interface CharacterLines {
  /** First question of a round. Must contain {term}. */
  ask: readonly string[];
  /** Second question, after the first was answered. Must contain {term}. */
  askSecond: readonly string[];
  correct: readonly string[];
  /** Silly reaction to a wrong tap. The joke is always on the character. */
  wrong: readonly string[];
  /** Introduces the number line hint. */
  hint: readonly string[];
  streak: readonly string[];
  levelComplete: readonly string[];
}
