import { describe, expect, it } from "vitest";
import { goalProgress } from "./goal.js";

const settings = { timeZone: "Europe/London", dayStartsAt: "00:00" };
const at = (day: string) => `${day}T08:00:00.000Z`;
// Biscuit, newest first: 24.6 kg a little before the diet, 23.3 kg now.
const weights = [
  { measuredAt: at("2026-11-19"), weightG: 23_300 },
  { measuredAt: at("2026-10-15"), weightG: 24_000 },
  { measuredAt: at("2026-09-15"), weightG: 24_600 },
  { measuredAt: at("2026-08-01"), weightG: 24_900 },
];
const biscuit = { goal: "lose", targetWeightG: 22_000, goalSetOn: "2026-09-17", weights } as const;

describe("goalProgress", () => {
  it("measures from the weigh-in on or before the day the goal was set", () => {
    expect(goalProgress(biscuit, settings)).toMatchObject({
      start: { weightG: 24_600 },
      latest: { weightG: 23_300 },
      remainingG: 1300,
      reached: false,
      fraction: 0.5,
    });
  });

  it("takes the first weigh-in after it when there was none before, or the first of all", () => {
    expect(goalProgress({ ...biscuit, goalSetOn: "2026-07-01" }, settings)?.start.weightG).toBe(
      24_900,
    );
    expect(goalProgress({ ...biscuit, goalSetOn: "2026-09-16" }, settings)?.start.weightG).toBe(
      24_600,
    );
    expect(goalProgress({ ...biscuit, goalSetOn: null }, settings)?.start.weightG).toBe(24_900);
  });

  it("mirrors a weight gain, and stays at the start while going the wrong way", () => {
    const gaining = {
      goal: "gain",
      targetWeightG: 5000,
      goalSetOn: "2026-09-17",
      weights: [
        { measuredAt: at("2026-11-19"), weightG: 4500 },
        { measuredAt: at("2026-09-15"), weightG: 4000 },
      ],
    } as const;

    expect(goalProgress(gaining, settings)).toMatchObject({ remainingG: 500, fraction: 0.5 });
    expect(
      goalProgress(
        { ...gaining, weights: [{ ...gaining.weights[0], weightG: 3800 }, gaining.weights[1]] },
        settings,
      ),
    ).toMatchObject({ fraction: 0, reached: false });
  });

  it("calls the goal reached at or past the target weight", () => {
    const now = { measuredAt: at("2026-11-24"), weightG: 21_900 };

    expect(goalProgress({ ...biscuit, weights: [now, ...weights] }, settings)).toMatchObject({
      reached: true,
      remainingG: 0,
      fraction: 1,
    });
  });

  it("shows nothing for maintain or before any weigh-in", () => {
    expect(goalProgress({ ...biscuit, goal: "maintain" }, settings)).toBeNull();
    expect(goalProgress({ ...biscuit, weights: [] }, settings)).toBeNull();
  });
});
