/** Within this share of the target, either way, a day counts as on target. */
const ON_TARGET_TOLERANCE = 0.05;

/** The badge on a History day: today is still in progress; other days may be on target. */
export function dayStatus(
  day: { day: string; eatenKcal: number; targetKcal: number | null },
  today: string,
): "soFar" | "onTarget" | null {
  if (day.day === today) {
    return "soFar";
  }
  return isOnTarget(day.eatenKcal, day.targetKcal) ? "onTarget" : null;
}

/** Within the tolerance of the target, either way. */
export function isOnTarget(eatenKcal: number, targetKcal: number | null): boolean {
  return (
    targetKcal !== null && Math.abs(eatenKcal - targetKcal) <= targetKcal * ON_TARGET_TOLERANCE
  );
}

/** Over target by more than the same tolerance, so a day on target is never also over it. */
export function isOverTarget(eatenKcal: number, targetKcal: number | null): boolean {
  return targetKcal !== null && eatenKcal > targetKcal * (1 + ON_TARGET_TOLERANCE);
}

/**
 * "5 of 7 days on target": the finished days with feeds and a target, which
 * the count is out of, and how many of them were on target. Today is left
 * out while it is still going.
 */
export function onTargetDays(
  days: { day: string; eatenKcal: number; targetKcal: number | null; fed: boolean }[],
  today: string,
): { counted: number; onTarget: number } {
  const counted = days.filter((day) => day.fed && day.day < today && day.targetKcal !== null);
  return {
    counted: counted.length,
    onTarget: counted.filter((day) => isOnTarget(day.eatenKcal, day.targetKcal)).length,
  };
}
