import { type Rng, shuffle } from './random';

/**
 * Picks lines from banks using a shuffle bag per bank, so every line is used
 * before any repeats, and the same line never plays twice in a row.
 */
export class LinePicker {
  private bags = new Map<string, string[]>();
  private last = new Map<string, string>();
  private lastOverall: string | null = null;

  constructor(private rng: Rng = Math.random) {}

  pick(bankKey: string, lines: readonly string[], vars?: Record<string, string | number>): string {
    if (lines.length === 0) throw new Error(`LinePicker: empty bank "${bankKey}"`);
    let bag = this.bags.get(bankKey);
    if (!bag || bag.length === 0) {
      bag = shuffle(this.rng, lines);
      const prev = this.last.get(bankKey);
      // Never start a new bag with the line that ended the previous one.
      if (bag.length > 1 && bag[bag.length - 1] === prev) {
        [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      }
      this.bags.set(bankKey, bag);
    }
    let line = bag.pop()!;
    // Also avoid repeating across banks that share lines.
    if (line === this.lastOverall && bag.length > 0) {
      const swap = bag.pop()!;
      bag.unshift(line);
      line = swap;
    }
    this.last.set(bankKey, line);
    this.lastOverall = line;
    return vars ? fillTemplate(line, vars) : line;
  }
}

/** Replace {name} placeholders. Unknown placeholders are left as-is so tests catch them. */
export function fillTemplate(line: string, vars: Record<string, string | number>): string {
  return line.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

export const praise = new LinePicker();
