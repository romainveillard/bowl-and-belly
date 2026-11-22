import type { ACTIVITY_LEVELS, GOALS, PET_TYPE_KEYS } from "./enums.js";

export interface TargetInput {
  petType: (typeof PET_TYPE_KEYS)[number];
  /** "YYYY-MM-DD" */
  birthDate: string;
  /** The app day the target is calculated for, "YYYY-MM-DD". */
  today: string;
  neutered: boolean;
  activityLevel: (typeof ACTIVITY_LEVELS)[number];
  goal: (typeof GOALS)[number];
  targetWeightG: number | null;
  /** Latest weigh-in, if any. */
  weightG: number | null;
}

/** Completed calendar months between two "YYYY-MM-DD" dates. */
export function ageInMonths(birthDate: string, today: string): number {
  const [birthYear = 0, birthMonth = 0, birthDay = 0] = birthDate.split("-").map(Number);
  const [year = 0, month = 0, day = 0] = today.split("-").map(Number);
  return (year - birthYear) * 12 + (month - birthMonth) - (day < birthDay ? 1 : 0);
}

// Factors from the 2021 AAHA Nutrition and Weight Management Guidelines, Box 1.
// AAHA gives ranges: the low end is used for normal activity and the high end
// for active pets. The dog inactive factor is the midpoint of its 1.0–1.2.
const FACTORS = {
  cat: {
    growth: () => 2.5,
    lose: 0.8,
    inactive: 1.0,
    intact: { active: 1.6, normal: 1.4 },
    neutered: { active: 1.4, normal: 1.2 },
  },
  dog: {
    growth: (months: number) => (months < 4 ? 3.0 : 2.0),
    lose: 1.0,
    inactive: 1.1,
    intact: { active: 1.8, normal: 1.6 },
    neutered: { active: 1.6, normal: 1.4 },
  },
};

const ADULT_FROM_MONTHS = 12;

export interface TargetExplanation {
  kcalPerDay: number;
  restingKcal: number;
  factor: number;
  /** Which case of the table applied. */
  basis: "growth" | "lose" | "inactive" | "adult";
}

/**
 * The daily kcal target and how it was reached, or null when the weight it
 * depends on is not known yet. The first matching case wins: growth, weight
 * loss, inactive, then the adult factors.
 */
export function explainTarget(input: TargetInput): TargetExplanation | null {
  const factors = FACTORS[input.petType];
  const months = ageInMonths(input.birthDate, input.today);
  const growing = months < ADULT_FROM_MONTHS;

  // A weight goal feeds for the weight aimed at, except while growing.
  const weightG = !growing && input.goal !== "maintain" ? input.targetWeightG : input.weightG;
  if (weightG === null) {
    return null;
  }

  let factor: number;
  let basis: TargetExplanation["basis"];
  if (growing) {
    factor = factors.growth(months);
    basis = "growth";
  } else if (input.goal === "lose") {
    factor = factors.lose;
    basis = "lose";
  } else if (input.activityLevel === "inactive") {
    factor = factors.inactive;
    basis = "inactive";
  } else {
    factor = factors[input.neutered ? "neutered" : "intact"][input.activityLevel];
    basis = "adult";
  }

  const restingEnergy = 70 * (weightG / 1000) ** 0.75;
  return {
    kcalPerDay: Math.round(restingEnergy * factor),
    restingKcal: Math.round(restingEnergy),
    factor,
    basis,
  };
}

export function calculateTarget(input: TargetInput): number | null {
  return explainTarget(input)?.kcalPerDay ?? null;
}
