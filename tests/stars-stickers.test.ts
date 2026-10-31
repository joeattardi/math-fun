import { describe, expect, it } from 'vitest';
import { starsFor } from '../src/shared/stars';
import { STICKERS, milestonesCrossed, nextSticker } from '../src/shared/stickers';

describe('stars', () => {
  it('always gives at least one star', () => {
    expect(starsFor(0, 10)).toBe(1);
    expect(starsFor(0, 0)).toBe(1);
  });
  it('gives 2 and 3 stars for good scores', () => {
    expect(starsFor(6, 10)).toBe(2);
    expect(starsFor(9, 10)).toBe(3);
    expect(starsFor(10, 10)).toBe(3);
  });
});

describe('stickers', () => {
  it('awards stickers in order and returns null when full', () => {
    expect(nextSticker([])?.id).toBe(STICKERS[0].id);
    expect(nextSticker(STICKERS.map((s) => s.id))).toBeNull();
  });
  it('counts milestones crossed', () => {
    expect(milestonesCrossed(24, 25)).toBe(1);
    expect(milestonesCrossed(25, 26)).toBe(0);
    expect(milestonesCrossed(0, 130)).toBe(3);
  });
});
