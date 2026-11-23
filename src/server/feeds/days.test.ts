import { expect, it } from "vitest";
import { openDatabase } from "../db/open.js";
import { feedEntry, food, pet, settings } from "../db/schema.js";
import { setTarget } from "../pets/targets.js";
import { daySummaries, hasFeedsBefore } from "./days.js";

// Days start at 03:00 in London. A target of 260 kcal applies from the 21st,
// 250 from the 22nd. Each food's current kcal differs from every snapshot.
function fedOverTwoDays() {
  const db = openDatabase(":memory:");
  db.update(settings).set({ timeZone: "Europe/London", dayStartsAt: "03:00" }).run();
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
      { name: "Chicken in gravy", foodTypeId: 1, kcalPerKg: 9999 },
      { name: "Salmon kibbles", foodTypeId: 2, kcalPerKg: 9999 },
    ])
    .run();
  setTarget(db, 1, "2026-11-21", 260, "calculated");
  setTarget(db, 1, "2026-11-22", 250, "calculated");
  const wet = { petId: 1, foodId: 1, kcalPerKg: 800, leftoverReturnedToStock: false };
  const dry = { petId: 1, foodId: 2, kcalPerKg: 3700, leftoverReturnedToStock: true };
  db.insert(feedEntry)
    .values([
      { ...dry, fedAt: new Date("2026-11-21T07:45:00Z"), servedG: 22 },
      { ...wet, fedAt: new Date("2026-11-21T19:40:00Z"), servedG: 42 },
      // 02:30 on the 22nd still belongs to the 21st.
      { ...wet, fedAt: new Date("2026-11-22T02:30:00Z"), servedG: 43 },
      // 16 g eaten of the 20 g served.
      { ...dry, fedAt: new Date("2026-11-22T14:30:00Z"), servedG: 20, leftoverG: 4 },
    ])
    .run();
  return db;
}

it("groups feeds by app day, newest first, with each day's own target", () => {
  const days = daySummaries(fedOverTwoDays(), 1, "2026-11-20", "2026-11-22");

  expect(days.map((day) => [day.day, day.targetKcal, day.entries.length])).toEqual([
    ["2026-11-22", 250, 1],
    ["2026-11-21", 260, 3],
  ]);
});

it("counts what was eaten, not what was served, at each feed's snapshot", () => {
  const [today, yesterday] = daySummaries(fedOverTwoDays(), 1, "2026-11-21", "2026-11-22");

  // 81.4 + 33.6 + 34.4, rounded once.
  expect(yesterday?.eatenKcal).toBe(149);
  expect(
    yesterday?.byType.map((total) => [total.type.systemKey, total.eatenG, total.kcal]),
  ).toEqual([
    ["wet", 85, 68],
    ["dry", 22, 81],
  ]);
  expect(today?.entries.map((entry) => entry.kcal)).toEqual([59]);
});

it("includes the day asked for even without feeds, and only that one", () => {
  const days = daySummaries(fedOverTwoDays(), 1, "2026-11-23", "2026-11-25", "2026-11-25");

  expect(days).toEqual([
    { day: "2026-11-25", targetKcal: 250, eatenKcal: 0, byType: [], entries: [] },
  ]);
});

it("tells whether there are earlier feeds to load", () => {
  const db = fedOverTwoDays();

  expect(hasFeedsBefore(db, 1, "2026-11-21")).toBe(false);
  expect(hasFeedsBefore(db, 1, "2026-11-22")).toBe(true);
});
