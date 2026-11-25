import { describe, expect, it } from "vitest";
import { goalSetOn } from "./goals.js";

const day = "2026-11-25";
const losing = { goal: "lose", targetWeightG: 22_000, goalSetOn: "2026-09-17" } as const;

describe("goalSetOn", () => {
  it("starts a new goal today, and keeps an untouched one's day", () => {
    expect(goalSetOn(undefined, { goal: "lose", targetWeightG: 22_000 }, day)).toBe(day);
    expect(goalSetOn(losing, { goal: "lose", targetWeightG: 22_000 }, day)).toBe("2026-09-17");
  });

  it("starts again when the target weight or the direction changes", () => {
    expect(goalSetOn(losing, { goal: "lose", targetWeightG: 21_500 }, day)).toBe(day);
    expect(goalSetOn(losing, { goal: "gain", targetWeightG: 22_000 }, day)).toBe(day);
  });

  it("keeps no day for maintain, and leaves an unrecorded goal unrecorded", () => {
    expect(goalSetOn(losing, { goal: "maintain", targetWeightG: null }, day)).toBeNull();
    expect(
      goalSetOn({ ...losing, goalSetOn: null }, { goal: "lose", targetWeightG: 22_000 }, day),
    ).toBeNull();
  });
});
