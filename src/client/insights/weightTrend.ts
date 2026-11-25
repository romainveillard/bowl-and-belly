/** Below this, a change reads as steady however light the pet: scales are not that precise. */
const STEADY_MIN_G = 50;
const STEADY_SHARE = 0.01;

/**
 * How the rolling average moved from the first to the last of a period's
 * readings: steady within 1% or 50 g, whichever is larger. Nothing to say
 * with fewer than two readings.
 */
export function weightTrend(
  averagesG: number[],
): { direction: "steady" } | { direction: "up" | "down"; changeG: number } | null {
  const first = averagesG[0];
  const last = averagesG.at(-1);
  if (first === undefined || last === undefined || averagesG.length < 2) {
    return null;
  }
  const change = last - first;
  if (Math.abs(change) < Math.max(first * STEADY_SHARE, STEADY_MIN_G)) {
    return { direction: "steady" };
  }
  return { direction: change > 0 ? "up" : "down", changeG: Math.abs(change) };
}
