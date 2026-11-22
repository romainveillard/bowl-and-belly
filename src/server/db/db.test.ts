import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { openDatabase } from "./open.js";
import { removeUnusedImages } from "./images.js";
import { food, foodType, image, pet, petTarget, petType, settings } from "./schema.js";
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

describe("migrations", () => {
  it("rebuild a table that other rows point at without losing them", () => {
    // A database as the first release left it, with a pet that has a target.
    const file = path.join(mkdtempSync(path.join(tmpdir(), "bowl-and-belly-")), "test.db");
    const firstMigrationAt = /"when": (\d+)/.exec(
      readFileSync("drizzle/meta/_journal.json", "utf8"),
    )?.[1];
    const old = new Database(file);
    old.exec(readFileSync("drizzle/0000_initial_schema.sql", "utf8"));
    old.exec(`
      CREATE TABLE __drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric);
      INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('', ${firstMigrationAt});
      INSERT INTO pet_type (system_key) VALUES ('cat');
      INSERT INTO pet (name, pet_type_id, birth_date, birth_date_precision, neutered, activity_level, goal)
        VALUES ('Miso', 1, '2020-05-01', 'exact', 1, 'normal', 'maintain');
      INSERT INTO pet_target (pet_id, effective_from, kcal_per_day, source)
        VALUES (1, '2026-11-01', 238, 'calculated');
    `);
    old.close();

    const db = openDatabase(file);

    expect(db.select({ name: pet.name }).from(pet).all()).toEqual([{ name: "Miso" }]);
    expect(db.select().from(petTarget).all()).toHaveLength(1);
    expect(() => db.delete(pet).run()).toThrow(/FOREIGN KEY constraint failed/);
  });
});

describe("removeUnusedImages", () => {
  it("drops only the photos that no pet or food uses", () => {
    const db = openDatabase(":memory:");
    const data = Buffer.from("photo");
    db.insert(image).values([{ data }, { data }, { data }]).run();
    db.insert(pet)
      .values({
        name: "Miso",
        petTypeId: 1,
        photoId: 1,
        birthDate: "2020-05-01",
        birthDatePrecision: "exact",
        neutered: true,
        activityLevel: "normal",
        goal: "maintain",
      })
      .run();
    db.insert(food)
      .values({ name: "Salmon kibbles", foodTypeId: 2, kcalPerKg: 3700, photoId: 3 })
      .run();

    removeUnusedImages(db);

    expect(db.select({ id: image.id }).from(image).all()).toEqual([{ id: 1 }, { id: 3 }]);
  });
});
