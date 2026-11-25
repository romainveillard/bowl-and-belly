import { describe, expect, it } from "vitest";
import { birthDateOf, initialPetForm, petBodyOf, petFormProblems, readPetForm } from "./petForm.js";

const today = "2026-11-25";
const blank = initialPetForm(undefined, "en-GB");

describe("birthDateOf", () => {
  it("takes an exact date only up to today", () => {
    expect(birthDateOf({ ...blank, birthDate: "2020-05-01" }, today, undefined)).toBe("2020-05-01");
    expect(birthDateOf({ ...blank, birthDate: "2026-11-26" }, today, undefined)).toBeNull();
  });

  it("stores a birth year as 1 January", () => {
    expect(birthDateOf({ ...blank, ageMode: "year", birthYear: "2019" }, today, undefined)).toBe(
      "2019-01-01",
    );
    expect(birthDateOf({ ...blank, ageMode: "year", birthYear: "2027" }, today, undefined)).toBe(
      null,
    );
  });

  it("turns an age into an estimated date, by the month", () => {
    expect(birthDateOf({ ...blank, ageMode: "estimated", ageYears: "6" }, today, undefined)).toBe(
      "2020-11-25",
    );
    expect(birthDateOf({ ...blank, ageMode: "estimated", ageYears: "0.5" }, today, undefined)).toBe(
      "2026-05-25",
    );
  });

  it("keeps an unchanged estimate's date, so the pet goes on ageing between edits", () => {
    const estimated = { birthDate: "2020-03-10", birthDatePrecision: "estimated", today } as const;

    expect(birthDateOf({ ...blank, ageMode: "estimated", ageYears: "6" }, today, estimated)).toBe(
      "2020-03-10",
    );
    expect(birthDateOf({ ...blank, ageMode: "estimated", ageYears: "7" }, today, estimated)).toBe(
      "2019-11-25",
    );
  });
});

const miso = { ...blank, name: "Miso", birthDate: "2020-05-01" };
const check = (form: typeof blank, systemKey: string | null) =>
  petFormProblems(form, readPetForm(form, systemKey, today, undefined), systemKey);
const bodyOf = (form: typeof blank, systemKey: string | null) =>
  petBodyOf(form, readPetForm(form, systemKey, today, undefined), 1);

describe("petFormProblems", () => {
  it("lets a custom type go without a target, but not an own target switched on", () => {
    expect(check(miso, null).has("ownTarget")).toBe(false);
    expect(check({ ...miso, ownTargetKcal: "lots" }, null).get("ownTarget")).toBe("ownTarget");
    expect(check({ ...miso, ownTarget: true }, "cat").get("ownTarget")).toBe("ownTarget");
  });

  it("asks for a target weight only when the goal is to lose or gain", () => {
    expect(check(miso, "cat").has("targetWeight")).toBe(false);
    expect(check({ ...miso, goal: "lose" }, "cat").get("targetWeight")).toBe("targetWeight");
  });

  it("names the birth field's problem after the way the age is given", () => {
    expect(check({ ...miso, ageMode: "year" }, "cat").get("birth")).toBe("birthYear");
    expect(check({ ...miso, ageMode: "estimated" }, "cat").get("birth")).toBe("age");
  });

  it("leaves the current weight optional, but refuses one that doesn't read as a number", () => {
    expect(check(miso, "cat").has("weight")).toBe(false);
    expect(check({ ...miso, weight: "heavy" }, "cat").get("weight")).toBe("weight");
  });
});

describe("petBodyOf", () => {
  it("sends whole grams, and a target weight only when losing or gaining", () => {
    const form = { ...miso, weight: "4,2504", targetWeight: "3,9" };

    expect(bodyOf(form, "cat")).toMatchObject({ weightG: 4250, targetWeightG: null });
    expect(bodyOf({ ...form, goal: "lose" }, "cat")).toMatchObject({ targetWeightG: 3900 });
  });

  it("sends an own target only when it is chosen, which a custom type always is", () => {
    const typed = { ...miso, ownTargetKcal: "250.4" };

    expect(bodyOf(typed, "cat")?.manualTargetKcal).toBeNull();
    expect(bodyOf({ ...typed, ownTarget: true }, "cat")?.manualTargetKcal).toBe(250);
    expect(bodyOf(typed, null)?.manualTargetKcal).toBe(250);
  });
});
