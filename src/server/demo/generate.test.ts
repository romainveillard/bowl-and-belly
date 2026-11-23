import { isNull } from "drizzle-orm";
import { expect, it } from "vitest";
import { openDatabase } from "../db/open.js";
import { feedEntry, food, weightEntry } from "../db/schema.js";
import { daySummaries } from "../feeds/days.js";
import { generateDemo } from "./generate.js";

// Mid-afternoon in London, so today is only partly fed.
const now = new Date("2026-11-23T15:00:00Z");

const latest = (instants: Date[]) => Math.max(...instants.map((at) => at.getTime()));

function demo() {
  const db = openDatabase(":memory:");
  generateDemo(db, now);
  return db;
}

it("ends at the moment it is generated", () => {
  const db = demo();

  const fedAt = db.select({ at: feedEntry.fedAt }).from(feedEntry).all();
  expect(latest(fedAt.map((row) => row.at))).toBeLessThanOrEqual(now.getTime());
  expect(latest(fedAt.map((row) => row.at))).toBeGreaterThan(now.getTime() - 6 * 3_600_000);
  const measuredAt = db.select({ at: weightEntry.measuredAt }).from(weightEntry).all();
  expect(latest(measuredAt.map((row) => row.at))).toBeLessThanOrEqual(now.getTime());
});

it("keeps every food on sale in stock", () => {
  const stock = demo()
    .select({ stockG: food.stockG })
    .from(food)
    .where(isNull(food.archivedAt))
    .all();
  expect(stock.every((row) => row.stockG > 0)).toBe(true);
});

it("has days on target and days off it", () => {
  const days = daySummaries(demo(), 1, "2026-08-25", "2026-11-22").filter(
    (day) => day.targetKcal !== null,
  );
  const onTarget = days.filter(
    (day) => Math.abs(day.eatenKcal - (day.targetKcal ?? 0)) <= (day.targetKcal ?? 0) * 0.05,
  );
  expect(onTarget.length / days.length).toBeGreaterThan(0.3);
  expect(onTarget.length / days.length).toBeLessThan(0.8);
});
