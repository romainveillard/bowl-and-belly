import { expect, it } from "vitest";
import { dayStatus, isOverTarget, onTargetDays } from "./dayStatus.js";

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

it("never calls a day both on target and over it", () => {
  // About 103%: past 100%, inside the band, so badged on target with a normal bar.
  expect(dayStatus(yesterday(268), today)).toBe("onTarget");
  expect(isOverTarget(268, 260)).toBe(false);
});

it("counts a day as over target only beyond the on-target band", () => {
  expect(isOverTarget(273, 260)).toBe(false);
  expect(isOverTarget(274, 260)).toBe(true);
  expect(isOverTarget(500, null)).toBe(false);
});

const day = (date: string, eatenKcal: number, fed = true, targetKcal: number | null = 260) => ({
  day: date,
  eatenKcal,
  targetKcal,
  fed,
});

it("counts only finished days with feeds and a target, today left out", () => {
  expect(
    onTargetDays(
      [
        day("2026-11-18", 255),
        day("2026-11-19", 300),
        day("2026-11-20", 0, false),
        day("2026-11-21", 250, true, null),
        day(today, 255),
      ],
      today,
    ),
  ).toEqual({ counted: 2, onTarget: 1 });
});
