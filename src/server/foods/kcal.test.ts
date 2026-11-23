import { expect, it } from "vitest";
import { openDatabase } from "../db/open.js";
import { feedEntry, food, pet, settings } from "../db/schema.js";
import { changeKcal } from "./kcal.js";

// One food at 3,400 kcal/kg fed on 28 February and on 1 March at 02:30 and
// 03:00, with the app day starting at 03:00 in London; and one feed of
// another food, which no edit may touch.
function fedOverTheMonthEnd() {
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
      { name: "Salmon kibbles", foodTypeId: 2, kcalPerKg: 3400 },
      { name: "Chicken in gravy", foodTypeId: 1, kcalPerKg: 800 },
    ])
    .run();
  const entry = {
    petId: 1,
    foodId: 1,
    servedG: 20,
    leftoverReturnedToStock: true,
    kcalPerKg: 3400,
  };
  db.insert(feedEntry)
    .values([
      { ...entry, fedAt: new Date("2026-02-28T12:00:00Z") },
      { ...entry, fedAt: new Date("2026-03-01T02:30:00Z") },
      { ...entry, fedAt: new Date("2026-03-01T03:00:00Z") },
      { ...entry, foodId: 2, kcalPerKg: 800, fedAt: new Date("2026-03-02T12:00:00Z") },
    ])
    .run();
  const snapshots = () =>
    db
      .select({ kcalPerKg: feedEntry.kcalPerKg })
      .from(feedEntry)
      .orderBy(feedEntry.id)
      .all()
      .map((row) => row.kcalPerKg);
  return { db, snapshots };
}

it("leaves past feeds alone unless asked", () => {
  const { db, snapshots } = fedOverTheMonthEnd();

  changeKcal(db, 1, 3500, { scope: "none" });

  expect(db.select({ kcalPerKg: food.kcalPerKg }).from(food).all()).toEqual([
    { kcalPerKg: 3500 },
    { kcalPerKg: 800 },
  ]);
  expect(snapshots()).toEqual([3400, 3400, 3400, 800]);
});

it("rewrites every past feed of that food, and only of that food", () => {
  const { db, snapshots } = fedOverTheMonthEnd();

  changeKcal(db, 1, 3500, { scope: "all" });

  expect(snapshots()).toEqual([3500, 3500, 3500, 800]);
});

it("rewrites feeds from the start of the chosen app day, over an earlier edit", () => {
  const { db, snapshots } = fedOverTheMonthEnd();
  changeKcal(db, 1, 3500, { scope: "all" });

  changeKcal(db, 1, 3600, { scope: "since", day: "2026-03-01" });

  // 02:30 on 1 March still belongs to 28 February, as the day starts at 03:00.
  expect(snapshots()).toEqual([3500, 3500, 3600, 800]);
});
