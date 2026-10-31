/**
 * All persisted state, stored in localStorage under one versioned key.
 * Nothing here ever goes down: stars, stickers and records only improve.
 */

export const STORAGE_KEY = 'math-fun:progress';
export const SCHEMA_VERSION = 1;

export interface SkillStats {
  seen: number;
  firstTry: number;
}

export interface GameProgress {
  /** Highest level index he can pick (levels unlock in order). */
  unlockedLevel: number;
  /** Best star rating per level index (0 = never completed). */
  bestStars: number[];
  /** Best first-try score per level index. */
  bestScore: number[];
  /** Per-skill (question type) accuracy across all play. */
  stats: Record<string, SkillStats>;
  bestStreak: number;
  roundsPlayed: number;
  levelsCompleted: number;
  /** The game's teach flow has played through once. */
  teachSeen: boolean;
}

export interface Settings {
  music: boolean;
  sound: boolean;
}

export interface ProgressData {
  version: number;
  settings: Settings;
  stickers: string[];
  /** Trophies awarded once the sticker book is full. */
  trophies: number;
  games: Record<string, GameProgress>;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function defaultProgress(): ProgressData {
  return {
    version: SCHEMA_VERSION,
    settings: { music: true, sound: true },
    stickers: [],
    trophies: 0,
    games: {},
  };
}

function defaultGame(): GameProgress {
  return { unlockedLevel: 0, bestStars: [], bestScore: [], stats: {}, bestStreak: 0, roundsPlayed: 0, levelsCompleted: 0, teachSeen: false };
}

/** Bring any stored shape up to the current schema. Unknown or broken data resets to defaults. */
export function migrate(raw: unknown): ProgressData {
  if (!raw || typeof raw !== 'object') return defaultProgress();
  const data = raw as Partial<ProgressData>;
  if (typeof data.version !== 'number' || data.version > SCHEMA_VERSION) return defaultProgress();
  // Version 1 is the first schema; future versions add steps here (if (data.version < 2) {...}).
  const base = defaultProgress();
  const games: Record<string, GameProgress> = {};
  for (const [id, g] of Object.entries(data.games ?? {})) games[id] = { ...defaultGame(), ...g };
  return {
    version: SCHEMA_VERSION,
    settings: { ...base.settings, ...data.settings },
    stickers: Array.isArray(data.stickers) ? data.stickers.filter((s) => typeof s === 'string') : [],
    trophies: typeof data.trophies === 'number' ? data.trophies : 0,
    games,
  };
}

function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function browserStorage(): KeyValueStorage {
  try {
    const s = globalThis.localStorage;
    const probe = '__math-fun-probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return memoryStorage();
  }
}

export class ProgressStore {
  private data: ProgressData;

  constructor(private storage: KeyValueStorage = browserStorage()) {
    this.data = this.load();
  }

  private load(): ProgressData {
    try {
      const text = this.storage.getItem(STORAGE_KEY);
      return text ? migrate(JSON.parse(text)) : defaultProgress();
    } catch {
      return defaultProgress();
    }
  }

  private save(): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Private mode or full storage: keep playing from memory.
    }
  }

  snapshot(): Readonly<ProgressData> {
    return this.data;
  }

  get settings(): Readonly<Settings> {
    return this.data.settings;
  }

  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.data.settings[key] = value;
    this.save();
  }

  game(id: string): Readonly<GameProgress> {
    return this.data.games[id] ?? defaultGame();
  }

  private mutableGame(id: string): GameProgress {
    return (this.data.games[id] ??= defaultGame());
  }

  /** Record one round. Returns the new rounds-played total. */
  recordRound(gameId: string, skill: string, firstTry: boolean): number {
    this.recordSkill(gameId, skill, firstTry);
    return this.countRound(gameId);
  }

  /** Accuracy for one skill, without counting a round (games that check several skills per round). */
  recordSkill(gameId: string, skill: string, firstTry: boolean): void {
    const s = (this.mutableGame(gameId).stats[skill] ??= { seen: 0, firstTry: 0 });
    s.seen++;
    if (firstTry) s.firstTry++;
    this.save();
  }

  /** Count a finished round. Returns the new rounds-played total. */
  countRound(gameId: string): number {
    const g = this.mutableGame(gameId);
    g.roundsPlayed++;
    this.save();
    return g.roundsPlayed;
  }

  markTeachSeen(gameId: string): void {
    this.mutableGame(gameId).teachSeen = true;
    this.save();
  }

  /** Returns true when this streak is a new personal best. */
  recordStreak(gameId: string, streak: number): boolean {
    const g = this.mutableGame(gameId);
    if (streak <= g.bestStreak) return false;
    g.bestStreak = streak;
    this.save();
    return true;
  }

  completeLevel(
    gameId: string,
    levelIndex: number,
    stars: number,
    score: number,
    levelCount: number,
  ): { newBestStars: boolean; newBestScore: boolean; unlockedNext: boolean } {
    const g = this.mutableGame(gameId);
    const prevStars = g.bestStars[levelIndex] ?? 0;
    const prevScore = g.bestScore[levelIndex] ?? 0;
    const hadScore = g.bestScore[levelIndex] !== undefined;
    g.bestStars[levelIndex] = Math.max(prevStars, stars);
    g.bestScore[levelIndex] = Math.max(prevScore, score);
    g.levelsCompleted++;
    const next = Math.min(levelIndex + 1, levelCount - 1);
    const unlockedNext = next > g.unlockedLevel;
    if (unlockedNext) g.unlockedLevel = next;
    this.save();
    return { newBestStars: stars > prevStars, newBestScore: hadScore && score > prevScore, unlockedNext };
  }

  unlockAll(gameId: string, levelCount: number): void {
    this.mutableGame(gameId).unlockedLevel = levelCount - 1;
    this.save();
  }

  addSticker(id: string): boolean {
    if (this.data.stickers.includes(id)) return false;
    this.data.stickers.push(id);
    this.save();
    return true;
  }

  addTrophy(): void {
    this.data.trophies++;
    this.save();
  }

  /** Parent-only: clears accuracy stats for one game. Stickers and stars stay. */
  resetStats(gameId: string): void {
    this.mutableGame(gameId).stats = {};
    this.save();
  }
}

export const progress = new ProgressStore();
