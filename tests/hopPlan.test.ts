import { describe, expect, it } from 'vitest';
import { hopPlan } from '../src/shared/hopPlan';

describe('hopPlan', () => {
  it('hops by tens then ones', () => {
    expect(hopPlan(51, 100).map((s) => s.value)).toEqual([10, 20, 30, 40, 50, 51]);
    expect(hopPlan(51, 100).map((s) => s.size)).toEqual(['ten', 'ten', 'ten', 'ten', 'ten', 'one']);
  });
  it('counts by ones in small ranges', () => {
    expect(hopPlan(7, 10).map((s) => s.value)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(hopPlan(10, 10).every((s) => s.size === 'one' && s.spoken)).toBe(true);
  });
  it('always speaks the final number', () => {
    const plan = hopPlan(39, 50);
    expect(plan[plan.length - 1]).toEqual({ value: 39, size: 'one', spoken: true });
    expect(plan.filter((s) => s.size === 'one' && !s.spoken)).toHaveLength(8);
  });
  it('zero has no hops', () => {
    expect(hopPlan(0, 20)).toEqual([]);
  });
});
