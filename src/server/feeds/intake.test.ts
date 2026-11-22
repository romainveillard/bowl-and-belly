import { expect, it } from "vitest";
import { openDatabase } from "../db/open.js";
import { feedEntry, food, pet } from "../db/schema.js";
import { kcalEaten } from "./intake.js";

it("counts what was eaten within the range, at each entry's own kcal snapshot", () => {
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
  // The food's current value differs from every snapshot below.
  db.insert(food).values({ name: "Salmon kibbles", foodTypeId: 2, kcalPerKg: 9999 }).run();
  const entry = { petId: 1, foodId: 1, leftoverReturnedToStock: true };
  db.insert(feedEntry)
    .values([
      { ...entry, fedAt: new Date("2026-11-21T23:59:59Z"), servedG: 100, kcalPerKg: 3700 },
      { ...entry, fedAt: new Date("2026-11-22T00:00:00Z"), servedG: 20, kcalPerKg: 3700 },
      // 16 g eaten of the 20 g served: 59.2 kcal.
      {
        ...entry,
        fedAt: new Date("2026-11-22T14:30:00Z"),
        servedG: 20,
        leftoverG: 4,
        kcalPerKg: 3700,
      },
      { ...entry, fedAt: new Date("2026-11-22T17:50:00Z"), servedG: 43, kcalPerKg: 800 },
      { ...entry, fedAt: new Date("2026-11-23T00:00:00Z"), servedG: 100, kcalPerKg: 3700 },
    ])
    .run();

  // 74 + 59.2 + 34.4, rounded once at the end.
  expect(kcalEaten(db, 1, new Date("2026-11-22T00:00:00Z"), new Date("2026-11-23T00:00:00Z"))).toBe(
    168,
  );
  expect(kcalEaten(db, 1, new Date("2026-11-24T00:00:00Z"), new Date("2026-11-25T00:00:00Z"))).toBe(
    0,
  );
});
