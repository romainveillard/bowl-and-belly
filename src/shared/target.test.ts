import { describe, expect, it } from "vitest";
import { ageInMonths, calculateTarget, type TargetInput } from "./target.js";

// RER is 70 × kg^0.75: 198 kcal at 4 kg and 662 kcal at 20 kg.
const adultCat: TargetInput = {
  petType: "cat",
  birthDate: "2020-05-10",
  today: "2026-11-22",
  neutered: true,
  activityLevel: "normal",
  goal: "maintain",
  targetWeightG: null,
  weightG: 4000,
};
const adultDog: TargetInput = { ...adultCat, petType: "dog", weightG: 20_000 };

describe("calculateTarget", () => {
  it.each([
    ["neutered, normal", { neutered: true, activityLevel: "normal" }, 238, 927],
    ["neutered, active", { neutered: true, activityLevel: "active" }, 277, 1059],
    ["intact, normal", { neutered: false, activityLevel: "normal" }, 277, 1059],
    ["intact, active", { neutered: false, activityLevel: "active" }, 317, 1192],
    ["inactive, neutered", { neutered: true, activityLevel: "inactive" }, 198, 728],
    ["inactive, intact", { neutered: false, activityLevel: "inactive" }, 198, 728],
  ] as const)("applies the adult factor for %s", (_case, profile, cat, dog) => {
    expect(calculateTarget({ ...adultCat, ...profile })).toBe(cat);
    expect(calculateTarget({ ...adultDog, ...profile })).toBe(dog);
  });

  it("feeds a weight-loss goal for the target weight, ahead of activity and neutering", () => {
    const losing = { goal: "lose", activityLevel: "active", neutered: false } as const;

    expect(calculateTarget({ ...adultCat, ...losing, weightG: 5000, targetWeightG: 4000 })).toBe(
      158,
    );
    expect(
      calculateTarget({ ...adultDog, ...losing, weightG: 22_000, targetWeightG: 18_000 }),
    ).toBe(612);
  });

  it("feeds a weight-gain goal with the usual adult factor at the target weight", () => {
    const gaining = { goal: "gain", weightG: 3600, targetWeightG: 4500 } as const;

    expect(calculateTarget({ ...adultCat, ...gaining })).toBe(260);
    expect(calculateTarget({ ...adultCat, ...gaining, activityLevel: "inactive" })).toBe(216);
  });

  it("feeds growing pets for their current weight, whatever their goal or activity", () => {
    const kitten = { ...adultCat, birthDate: "2026-05-22", weightG: 1500 };

    expect(calculateTarget(kitten)).toBe(237);
    expect(
      calculateTarget({
        ...kitten,
        goal: "lose",
        targetWeightG: 1000,
        activityLevel: "inactive",
      }),
    ).toBe(237);
  });

  it("steps a puppy's factor down at 4 months and to the adult one at 12", () => {
    const puppy = { ...adultDog, today: "2026-11-22", weightG: 5000 };

    expect(calculateTarget({ ...puppy, birthDate: "2026-07-23" })).toBe(702);
    expect(calculateTarget({ ...puppy, birthDate: "2026-07-22" })).toBe(468);
    expect(calculateTarget({ ...puppy, birthDate: "2025-11-23" })).toBe(468);
    expect(calculateTarget({ ...puppy, birthDate: "2025-11-22" })).toBe(328);
  });

  it("returns nothing until the weight it needs is known", () => {
    expect(calculateTarget({ ...adultCat, weightG: null })).toBeNull();
    expect(calculateTarget({ ...adultCat, goal: "lose", targetWeightG: null })).toBeNull();
    // A weight goal does not need a weigh-in, only the target weight.
    expect(calculateTarget({ ...adultCat, goal: "lose", weightG: null, targetWeightG: 4000 })).toBe(
      158,
    );
  });
});

describe("ageInMonths", () => {
  it("counts completed months only", () => {
    expect(ageInMonths("2026-01-31", "2026-02-28")).toBe(0);
    expect(ageInMonths("2026-01-31", "2026-03-31")).toBe(2);
    expect(ageInMonths("2025-12-15", "2026-01-15")).toBe(1);
  });
});
