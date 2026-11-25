import type { GOALS } from "../../shared/enums.js";

interface GoalFields {
  goal: (typeof GOALS)[number];
  targetWeightG: number | null;
}

/**
 * The app day a pet's goal counts from once its form is saved: `day` when the
 * goal or its target weight changes, the one it had otherwise, and none for
 * maintain.
 */
export function goalSetOn(
  before: (GoalFields & { goalSetOn: string | null }) | undefined,
  after: GoalFields,
  day: string,
): string | null {
  if (after.goal === "maintain") {
    return null;
  }
  if (before && before.goal === after.goal && before.targetWeightG === after.targetWeightG) {
    return before.goalSetOn;
  }
  return day;
}
