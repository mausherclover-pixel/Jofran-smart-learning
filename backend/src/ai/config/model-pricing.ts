// USD per 1M tokens (text models) or per-minute/per-1M-char (audio models).
// These are illustrative placeholder rates — wire them to OpenAI's actual
// published pricing before trusting AiUsageLog.estimatedCostUsd for a real
// budget decision; the point of this table is that cost has ONE place to
// update, not that these exact numbers are current.
export interface ModelRate {
  inputPer1M: number;
  outputPer1M: number;
}

export const MODEL_PRICING: Record<string, ModelRate> = {
  'gpt-5': { inputPer1M: 5.0, outputPer1M: 15.0 },
  'gpt-5-mini': { inputPer1M: 0.25, outputPer1M: 1.0 },
  'gpt-4o-mini-tts': { inputPer1M: 0.6, outputPer1M: 12.0 }, // output priced as synthesized audio tokens
  'gpt-4o-transcribe': { inputPer1M: 2.5, outputPer1M: 10.0 },
  'omni-moderation-latest': { inputPer1M: 0, outputPer1M: 0 }, // free at time of writing
};

export function estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const rate = MODEL_PRICING[model];
  if (!rate) return 0;
  return (promptTokens / 1_000_000) * rate.inputPer1M + (completionTokens / 1_000_000) * rate.outputPer1M;
}
