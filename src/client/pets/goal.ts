import { appDayOf, type DaySettings } from "../../shared/app-day.js";
import type { GOALS } from "../../shared/enums.js";

interface Weighed {
  measuredAt: string;
  weightG: number;
}

/**
 * How far a pet has come towards its target weight: from the weigh-in when
 * the goal was set (the latest on or before that day, else the first after;
 * the first of all for a goal from before the day was recorded) to the
 * latest. Null for maintain, or before any weigh-in.
 */
export function goalProgress(
  pet: {
    goal: (typeof GOALS)[number];
    targetWeightG: number | null;
    goalSetOn: string | null;
    /** Newest first. */
    weights: readonly Weighed[];
  },
  settings: DaySettings,
) {
  const [latest] = pet.weights;
  if (pet.goal === "maintain" || pet.targetWeightG === null || !latest) {
    return null;
  }
  const setOn = pet.goalSetOn;
  const dayOf = (reading: Weighed) => appDayOf(new Date(reading.measuredAt), settings);
  const oldestFirst = pet.weights.toReversed();
  const start =
    (setOn === null
      ? oldestFirst[0]
      : (pet.weights.find((reading) => dayOf(reading) <= setOn) ??
        oldestFirst.find((reading) => dayOf(reading) > setOn))) ?? latest;

  // Gaining mirrors losing: distances are measured in the goal's direction.
  const direction = pet.goal === "lose" ? -1 : 1;
  const needed = (pet.targetWeightG - start.weightG) * direction;
  const made = (latest.weightG - start.weightG) * direction;
  const reached = (pet.targetWeightG - latest.weightG) * direction <= 0;
  return {
    start,
    latest,
    targetWeightG: pet.targetWeightG,
    reached,
    remainingG: reached ? 0 : Math.abs(pet.targetWeightG - latest.weightG),
    /** Along the bar from the start to the target weight, 0 to 1. */
    fraction: reached ? 1 : needed > 0 ? Math.min(Math.max(made / needed, 0), 1) : 0,
  };
}
