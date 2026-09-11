// The adaptive-difficulty half of architecture §11, in its own pure module so
// the math is unit-testable without a database — AttemptsService.updateMastery
// is the only caller, but the calculation itself has no business touching Prisma.

export const MASTERY_EWMA_ALPHA = 0.3; // weight given to the newest attempt

/** 0..1 — how much of the available points a response earned. Guards against a zero-point question dividing by zero. */
export function computeCorrectness(score: number, maxPoints: number): number {
  if (maxPoints <= 0) return 0;
  return clamp01(score / maxPoints);
}

/**
 * One EWMA step. `alpha` closer to 1 makes the newest attempt dominate;
 * closer to 0 makes mastery move slowly and resist a single lucky guess or
 * bad day. `existingMastery` of `undefined` means this is the student's
 * first graded attempt at this skill — the correctness of that first
 * attempt *is* the starting mastery, there being nothing to average against.
 */
export function nextMastery(correctness: number, existingMastery: number | undefined, alpha: number = MASTERY_EWMA_ALPHA): number {
  if (existingMastery === undefined) return clamp01(correctness);
  return clamp01(alpha * correctness + (1 - alpha) * existingMastery);
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
