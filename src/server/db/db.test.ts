import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { openDatabase } from "./open.js";
import { foodType, pet, petType, settings } from "./schema.js";
import { seed } from "./seed.js";

describe("seed", () => {
  it("adds the built-in types, with dry leftovers going back into stock and wet ones binned", () => {
    const db = openDatabase(":memory:");

    expect(db.select({ systemKey: petType.systemKey }).from(petType).all()).toEqual([
      { systemKey: "cat" },
      { systemKey: "dog" },
    ]);
    expect(
      db
        .select({ systemKey: foodType.systemKey, returns: foodType.leftoverReturnsToStock })
        .from(foodType)
        .all(),
    ).toEqual([
      { systemKey: "wet", returns: false },
      { systemKey: "dry", returns: true },
    ]);
  });

  it("leaves changed settings and existing rows alone when it runs again", () => {
    const db = openDatabase(":memory:");
    db.update(settings).set({ timeZone: "Pacific/Auckland", dayStartsAt: "03:00" }).run();

    seed(db);

    expect(db.select().from(settings).all()).toMatchObject([
      { timeZone: "Pacific/Auckland", dayStartsAt: "03:00" },
    ]);
    expect(db.select().from(petType).all()).toHaveLength(2);
    expect(db.select().from(foodType).all()).toHaveLength(2);
  });
});

describe("constraints", () => {
  const validPet = {
    name: "Miso",
    petTypeId: 1,
    birthDate: "2020-05-01",
    birthDatePrecision: "exact",
    neutered: true,
    activityLevel: "normal",
    goal: "maintain",
  } as const;

  it("rejects enum values outside the fixed set", () => {
    const db = openDatabase(":memory:");
    db.insert(pet).values(validPet).run();

    expect(() => db.$client.exec("UPDATE pet SET activity_level = 'lazy'")).toThrow(
      /CHECK constraint failed: pet_activity_level/,
    );
  });

  it("requires a target weight for any goal other than maintaining", () => {
    const db = openDatabase(":memory:");

    expect(() =>
      db
        .insert(pet)
        .values({ ...validPet, goal: "lose" })
        .run(),
    ).toThrow(/CHECK constraint failed: pet_goal_has_target_weight/);
    db.insert(pet)
      .values({ ...validPet, goal: "lose", targetWeightG: 4200 })
      .run();
  });

  it("requires a name on custom types", () => {
    const db = openDatabase(":memory:");

    expect(() => db.insert(petType).values({}).run()).toThrow(
      /CHECK constraint failed: pet_type_labelled/,
    );
    db.insert(petType).values({ name: "Rabbit" }).run();
  });

  it("keeps settings to a single row", () => {
    const db = openDatabase(":memory:");

    expect(() => db.insert(settings).values({ id: 2, timeZone: "UTC" }).run()).toThrow(
      /CHECK constraint failed: settings_single_row/,
    );
  });

  it("requires a weekday for weekly backups", () => {
    const db = openDatabase(":memory:");

    expect(() =>
      db.update(settings).set({ backupFrequency: "weekly" }).where(eq(settings.id, 1)).run(),
    ).toThrow(/CHECK constraint failed: settings_weekly_has_weekday/);
    db.update(settings).set({ backupFrequency: "weekly", backupWeekday: 7 }).run();
  });
});
