import { describe, expect, it } from "vitest";
import { targetBasis } from "./pets.js";

// A neutered adult cat with normal activity at 4 kg: the formula gives 238 kcal.
const miso: Parameters<typeof targetBasis>[0] = {
  type: { systemKey: "cat", name: null },
  birthDate: "2020-05-01",
  today: "2026-11-25",
  neutered: true,
  activityLevel: "normal",
  goal: "maintain",
  targetWeightG: null,
  weights: [{ id: 1, measuredAt: "2026-11-20T08:00:00.000Z", weightG: 4000 }],
};

describe("targetBasis", () => {
  it("names the row of the factor table behind a target the formula still gives", () => {
    expect(targetBasis(miso, { kcalPerDay: 238, source: "calculated" })).toMatchObject({
      kind: "formula",
      row: "adultNeuteredNormal",
    });
    expect(
      targetBasis({ ...miso, birthDate: "2026-05-01" }, { kcalPerDay: 495, source: "calculated" }),
    ).toMatchObject({ kind: "formula", row: "growth" });
  });

  it("only says calculated once the pet's profile gives a different figure", () => {
    expect(targetBasis(miso, { kcalPerDay: 250, source: "calculated" })).toEqual({
      kind: "calculated",
    });
  });

  it("never explains a target the user set", () => {
    expect(targetBasis(miso, { kcalPerDay: 238, source: "manual" })).toEqual({ kind: "manual" });
  });
});
