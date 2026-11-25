import { describe, expect, it } from "vitest";
import { birthDateOf, initialPetForm } from "./petForm.js";

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
