import i18n from "i18next";
import { describe, expect, it } from "vitest";
import { barDetailLines, placeDetails, type ChartDay } from "./ChartDetails.js";

const today = "2026-11-25";
const tuesday: ChartDay = {
  day: "2026-11-17",
  eatenKcal: 251,
  targetKcal: 260,
  fed: true,
  byType: [
    { type: { systemKey: "wet", name: null }, kcal: 70 },
    { type: { systemKey: "dry", name: null }, kcal: 181 },
    { type: { systemKey: null, name: "Raw" }, kcal: 0 },
  ],
};
const lines = (day: ChartDay) => barDetailLines(day, today, "en-GB", i18n.t);

describe("barDetailLines", () => {
  it("names the day, the kcal against the target, and the split, custom types included", () => {
    expect(lines(tuesday)).toEqual({
      date: "Tue 17 Nov",
      value: "251 / 260 kcal",
      note: "On target · Wet 70 · Dry 181 · Raw 0",
    });
  });

  it("judges a day by the same 5% band as everywhere else", () => {
    expect(lines({ ...tuesday, eatenKcal: 274 }).note).toMatch(/^Over target/);
    expect(lines({ ...tuesday, eatenKcal: 273 }).note).toMatch(/^On target/);
    expect(lines({ ...tuesday, eatenKcal: 246 }).note).toMatch(/^Under target/);
  });

  it("says so far for today, and gives no status without a target", () => {
    expect(lines({ ...tuesday, day: today }).note).toMatch(/^So far ·/);
    expect(lines({ ...tuesday, targetKcal: null })).toMatchObject({
      value: "251 kcal",
      note: "Wet 70 · Dry 181 · Raw 0",
    });
  });
});

describe("placeDetails", () => {
  it("opens on the side with more room, no wider than that room", () => {
    expect(placeDetails({ x: 52, y: 38, width: 30 }, 314, 176)).toMatchObject({
      side: "right",
      offset: 94,
      maxWidth: 220,
    });
    expect(placeDetails({ x: 268, y: 60, width: 30 }, 314, 176)).toMatchObject({
      side: "left",
      offset: 58,
      maxWidth: 256,
    });
  });

  it("stays inside the chart top to bottom, pointing at the bar's top", () => {
    expect(placeDetails({ x: 10, y: 20, width: 30 }, 314, 176)).toMatchObject({
      top: 0,
      arrowTop: 20,
    });
    expect(placeDetails({ x: 10, y: 170, width: 30 }, 314, 176)).toMatchObject({
      top: 104,
      arrowTop: 62,
    });
  });
});
