import { expect, it } from "vitest";
import { dayStatus } from "./dayStatus.js";

const today = "2026-11-22";

const yesterday = (eatenKcal: number) => ({ day: "2026-11-21", eatenKcal, targetKcal: 260 });

it("calls a past day on target within 5% of it either way", () => {
  expect(dayStatus(yesterday(247), today)).toBe("onTarget");
  expect(dayStatus(yesterday(273), today)).toBe("onTarget");
  expect(dayStatus(yesterday(246), today)).toBeNull();
  expect(dayStatus(yesterday(274), today)).toBeNull();
});

it("never judges today, which is still going", () => {
  expect(dayStatus({ day: today, eatenKcal: 260, targetKcal: 260 }, today)).toBe("soFar");
});

it("has nothing to say without a target", () => {
  expect(dayStatus({ day: "2026-11-21", eatenKcal: 200, targetKcal: null }, today)).toBeNull();
});
