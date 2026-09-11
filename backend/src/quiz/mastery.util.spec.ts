import { computeCorrectness, nextMastery } from './mastery.util';

describe('computeCorrectness', () => {
  it('returns the fraction of points earned', () => {
    expect(computeCorrectness(1, 2)).toBe(0.5);
    expect(computeCorrectness(2, 2)).toBe(1);
    expect(computeCorrectness(0, 2)).toBe(0);
  });

  it('never divides by zero for a zero-point question', () => {
    expect(computeCorrectness(0, 0)).toBe(0);
  });

  it('clamps a score that somehow exceeds max points, rather than reporting >100% correctness', () => {
    expect(computeCorrectness(5, 2)).toBe(1);
  });

  it('clamps a negative score to zero', () => {
    expect(computeCorrectness(-1, 2)).toBe(0);
  });
});

describe('nextMastery', () => {
  it("on a first attempt (no existing mastery), the attempt's correctness IS the mastery — nothing to average against yet", () => {
    expect(nextMastery(0.8, undefined)).toBe(0.8);
    expect(nextMastery(0, undefined)).toBe(0);
  });

  it('applies the EWMA weighting on a second attempt: alpha to the new attempt, (1-alpha) to the old mastery', () => {
    // alpha = 0.3: 0.3*1.0 + 0.7*0.5 = 0.65
    expect(nextMastery(1.0, 0.5, 0.3)).toBeCloseTo(0.65);
  });

  it('a string of perfect attempts converges toward 1, but a single alpha=0.3 step never jumps straight there', () => {
    const afterOnePerfect = nextMastery(1.0, 0.4, 0.3);
    expect(afterOnePerfect).toBeLessThan(1);
    expect(afterOnePerfect).toBeGreaterThan(0.4);
  });

  it('a single bad attempt pulls mastery down, but not to zero, when alpha is the default 0.3', () => {
    const afterOneBad = nextMastery(0, 0.9, 0.3);
    expect(afterOneBad).toBeCloseTo(0.63); // 0.3*0 + 0.7*0.9
    expect(afterOneBad).toBeGreaterThan(0);
  });

  it('stays within [0, 1] even with an out-of-range existing value', () => {
    expect(nextMastery(1, 1.5, 0.3)).toBeLessThanOrEqual(1);
  });
});
