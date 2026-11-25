import { describe, expect, it } from "vitest";
import { openDatabase } from "../db/open.js";
import { food, pet } from "../db/schema.js";
import { logFeed } from "./entries.js";
import { logForm } from "./logForm.js";

const now = new Date("2026-11-23T18:00:00Z");
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000);

// A cat, with dry kibbles for any pet, wet pouches for cats, dog biscuits and
// an archived food.
function catPantry() {
  const db = openDatabase(":memory:");
  db.insert(pet)
    .values({
      name: "Miso",
      petTypeId: 1,
      birthDate: "2020-05-01",
      birthDatePrecision: "exact",
      neutered: true,
      activityLevel: "normal",
      goal: "maintain",
    })
    .run();
  db.insert(food)
    .values([
      { name: "Salmon kibbles", foodTypeId: 2, kcalPerKg: 3700, stockG: 1000 },
      { name: "Chicken in gravy", foodTypeId: 1, petTypeId: 1, kcalPerKg: 800, stockG: 1000 },
      { name: "Beef biscuits", foodTypeId: 2, petTypeId: 2, kcalPerKg: 3500, stockG: 1000 },
      { name: "Old tins", foodTypeId: 1, kcalPerKg: 900, stockG: 0, archivedAt: now },
    ])
    .run();
  const feed = (foodId: number, fedAt: Date, servedG = 20, leftoverG: number | null = null) =>
    logFeed(db, { petId: 1, foodId, fedAt, servedG, leftoverG, leftoverReturnedToStock: true });
  return { db, feed };
}

describe("logForm", () => {
  it("offers the pet's foods, the last fed first, then the rest by name", () => {
    const { db, feed } = catPantry();
    feed(2, hoursAgo(30), 85);
    feed(1, hoursAgo(28), 20);
    feed(2, hoursAgo(26), 70);

    const form = logForm(db, 1, now);

    expect(form?.foods.map((row) => [row.name, row.lastServedG])).toEqual([
      ["Chicken in gravy", 70],
      ["Salmon kibbles", 20],
    ]);
    expect(form?.recentCount).toBe(2);
  });

  it("asks for the leftover of a dry feed from the last 24 hours that has none yet", () => {
    const { db, feed } = catPantry();
    feed(1, hoursAgo(23));

    expect(logForm(db, 1, now)?.previous).toMatchObject({ foodName: "Salmon kibbles" });
  });

  it("doesn't ask once the bowl is older than 24 hours, binned or already recorded", () => {
    const older = catPantry();
    older.feed(1, hoursAgo(25));
    const wet = catPantry();
    wet.feed(2, hoursAgo(1));
    const recorded = catPantry();
    recorded.feed(1, hoursAgo(1), 20, 0);

    expect(logForm(older.db, 1, now)?.previous).toBeNull();
    expect(logForm(wet.db, 1, now)?.previous).toBeNull();
    expect(logForm(recorded.db, 1, now)?.previous).toBeNull();
  });
});
