import { describe, expect, it } from 'vitest';
import { ProgressStore, STORAGE_KEY, migrate, type KeyValueStorage } from '../src/shared/progress';

function fakeStorage(initial?: string): KeyValueStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  if (initial !== undefined) map.set(STORAGE_KEY, initial);
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
}

describe('progress', () => {
  it('starts with defaults and survives corrupt data', () => {
    const store = new ProgressStore(fakeStorage('{not json'));
    expect(store.settings).toEqual({ music: true, sound: true });
    expect(store.game('g').unlockedLevel).toBe(0);
  });

  it('resets unknown future versions', () => {
    expect(migrate({ version: 99, stickers: ['x'] }).stickers).toEqual([]);
  });

  it('persists and reloads', () => {
    const storage = fakeStorage();
    const a = new ProgressStore(storage);
    a.setSetting('music', false);
    a.recordRound('g', 'trap', false);
    a.recordRound('g', 'trap', true);
    a.addSticker('rocket');
    const b = new ProgressStore(storage);
    expect(b.settings.music).toBe(false);
    expect(b.game('g').stats.trap).toEqual({ seen: 2, firstTry: 1 });
    expect(b.snapshot().stickers).toEqual(['rocket']);
  });

  it('stars and records only go up', () => {
    const store = new ProgressStore(fakeStorage());
    expect(store.completeLevel('g', 0, 3, 9, 4)).toEqual({ newBestStars: true, newBestScore: false, unlockedNext: true });
    expect(store.completeLevel('g', 0, 1, 4, 4)).toEqual({ newBestStars: false, newBestScore: false, unlockedNext: false });
    expect(store.game('g').bestStars[0]).toBe(3);
    expect(store.game('g').bestScore[0]).toBe(9);
    expect(store.completeLevel('g', 0, 3, 10, 4).newBestScore).toBe(true);
    expect(store.recordStreak('g', 4)).toBe(true);
    expect(store.recordStreak('g', 3)).toBe(false);
    expect(store.game('g').bestStreak).toBe(4);
  });

  it('unlocks levels in order and caps at the last one', () => {
    const store = new ProgressStore(fakeStorage());
    store.completeLevel('g', 3, 1, 1, 4);
    expect(store.game('g').unlockedLevel).toBe(3);
    expect(store.completeLevel('g', 3, 1, 1, 4).unlockedNext).toBe(false);
  });

  it('never adds a sticker twice', () => {
    const store = new ProgressStore(fakeStorage());
    expect(store.addSticker('a')).toBe(true);
    expect(store.addSticker('a')).toBe(false);
  });
});
