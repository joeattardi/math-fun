/**
 * Test hooks, only active with ?debug=1 in the URL:
 *   ?debug=1        expose window.__mathFun with game state for automated playtests
 *   &fast=1         speed up tweens, timers and speech watchdogs
 *   &seed=123       seed the question generator
 */
const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

export const debug = {
  enabled: params.get('debug') === '1',
  fast: params.get('debug') === '1' && params.get('fast') === '1',
  seed: params.has('seed') ? Number(params.get('seed')) : null,
};

type Hooks = Record<string, unknown>;

export function exposeDebug(key: string, value: unknown): void {
  if (!debug.enabled) return;
  const w = window as unknown as { __mathFun?: Hooks };
  w.__mathFun ??= {};
  w.__mathFun[key] = value;
}

export const FAST_FACTOR = 4;

/** Apply fast mode to a scene's clocks. */
export function applyDebugSpeed(scene: Phaser.Scene): void {
  if (!debug.fast) return;
  scene.tweens.timeScale = FAST_FACTOR;
  scene.time.timeScale = FAST_FACTOR;
}
