import { describe, expect, it } from 'vitest';
import { analyzeMelodicLine } from './melody';

describe('analyzeMelodicLine', () => {
  it('classifies steps, leaps, and common tones', () => {
    // C4 D4 D4 A4 -> step up, common tone, leap up
    const a = analyzeMelodicLine([60, 62, 62, 69]);
    expect(a.steps.map((s) => s.kind)).toEqual(['step', 'common-tone', 'leap']);
    expect(a.steps.map((s) => s.direction)).toEqual(['up', 'same', 'up']);
    expect(a.stepwise).toBe(1);
    expect(a.commonTones).toBe(1);
    expect(a.leaps).toBe(1);
  });

  it('reports smoothness as the share of steps + common tones', () => {
    const a = analyzeMelodicLine([60, 62, 64, 65]); // all steps
    expect(a.smoothnessPct).toBe(100);
    const b = analyzeMelodicLine([60, 67, 60]); // all leaps
    expect(b.smoothnessPct).toBe(0);
  });

  it('handles a single note (no motion)', () => {
    const a = analyzeMelodicLine([60]);
    expect(a.steps).toHaveLength(0);
    expect(a.smoothnessPct).toBe(0);
  });
});
