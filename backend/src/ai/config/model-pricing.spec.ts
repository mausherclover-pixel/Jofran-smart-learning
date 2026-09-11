import { estimateCostUsd, MODEL_PRICING } from './model-pricing';

describe('estimateCostUsd', () => {
  it('computes input+output cost from the per-1M-token rate table', () => {
    const rate = MODEL_PRICING['gpt-5-mini'];
    const cost = estimateCostUsd('gpt-5-mini', 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(rate.inputPer1M + rate.outputPer1M);
  });

  it('scales linearly below 1M tokens', () => {
    const costFull = estimateCostUsd('gpt-5', 1_000_000, 0);
    const costHalf = estimateCostUsd('gpt-5', 500_000, 0);
    expect(costHalf).toBeCloseTo(costFull / 2);
  });

  it('returns 0 for an unknown model rather than throwing — a pricing-table gap should never break a request', () => {
    expect(estimateCostUsd('some-future-model-not-in-the-table', 1000, 1000)).toBe(0);
  });

  it('returns 0 for zero usage', () => {
    expect(estimateCostUsd('gpt-5-mini', 0, 0)).toBe(0);
  });

  it('moderation is priced at zero, matching its free-at-time-of-writing status', () => {
    expect(estimateCostUsd('omni-moderation-latest', 100_000, 0)).toBe(0);
  });
});
