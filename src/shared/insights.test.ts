import { describe, expect, it } from "vitest";
import { periodIntake, rollingAverage, weekStart, type DayIntake } from "./insights.js";

const day = (
  date: string,
  eatenKcal: number,
  fed = true,
  targetKcal: number | null = 260,
): DayIntake => ({
  day: date,
  eatenKcal,
  targetKcal,
  fed,
});

describe("weekStart", () => {
  it("starts weeks on Monday, with Sunday as the last day", () => {
    expect(weekStart("2026-11-23")).toBe("2026-11-23");
    expect(weekStart("2026-11-29")).toBe("2026-11-23");
    expect(weekStart("2026-11-22")).toBe("2026-11-16");
    expect(weekStart("2027-01-01")).toBe("2026-12-28");
  });
});

describe("periodIntake", () => {
  it("averages over the days with feeds, not every day of the week", () => {
    const [week] = periodIntake(
      [day("2026-11-16", 250), day("2026-11-17", 0, false), day("2026-11-18", 270)],
      "week",
      "2026-11-30",
    );

    expect(week).toEqual({ start: "2026-11-16", averageKcal: 260, targetKcal: 260, days: 2 });
  });

  it("leaves today out while it is still going", () => {
    const [week] = periodIntake(
      [day("2026-11-23", 250), day("2026-11-24", 90)],
      "week",
      "2026-11-24",
    );

    expect(week).toMatchObject({ averageKcal: 250, days: 1 });
  });

  it("has no average for a period without a finished day with feeds", () => {
    expect(periodIntake([day("2026-11-24", 90)], "week", "2026-11-24")).toEqual([
      { start: "2026-11-23", averageKcal: null, targetKcal: null, days: 0 },
    ]);
  });

  it("averages the target over the same days, as it can change mid-month", () => {
    const [month] = periodIntake(
      [
        day("2026-11-01", 250, true, 250),
        day("2026-11-20", 270, true, 270),
        day("2026-11-21", 0, false, 300),
      ],
      "month",
      "2026-12-01",
    );

    expect(month).toEqual({ start: "2026-11-01", averageKcal: 260, targetKcal: 260, days: 2 });
  });

  it("groups by calendar month, oldest first", () => {
    expect(
      periodIntake([day("2026-12-01", 200), day("2026-11-30", 300)], "month", "2027-01-01").map(
        (month) => month.start,
      ),
    ).toEqual(["2026-11-01", "2026-12-01"]);
  });
});

const at = (date: string) => Date.parse(`${date}T08:00:00Z`);

describe("rollingAverage", () => {
  it("averages each reading with those of the six days before it", () => {
    const result = rollingAverage([
      { at: at("2026-11-10"), weightG: 4600 },
      { at: at("2026-11-01"), weightG: 4400 },
      { at: at("2026-11-07"), weightG: 4500 },
    ]);

    expect(result.map((reading) => reading.averageG)).toEqual([4400, 4450, 4550]);
  });

  it("drops a reading exactly seven days old", () => {
    const [, second] = rollingAverage([
      { at: at("2026-11-01"), weightG: 4000 },
      { at: at("2026-11-08"), weightG: 5000 },
    ]);

    expect(second?.averageG).toBe(5000);
  });
});
