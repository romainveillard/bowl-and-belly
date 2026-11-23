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
