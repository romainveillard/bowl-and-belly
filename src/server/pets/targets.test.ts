import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { openDatabase } from "../db/open.js";
import { pet, petTarget, petType, weightEntry } from "../db/schema.js";
import { setTarget, suggestedKcal, syncCalculatedTarget, targetOn } from "./targets.js";

// A neutered adult cat with normal activity: 238 kcal at 4 kg, 277 once active.
function catWeighing(weightG: number | null) {
  const db = openDatabase(":memory:");
  const { id } = db
    .insert(pet)
    .values({
      name: "Miso",
      petTypeId: 1,
      birthDate: "2020-05-01",
      birthDatePrecision: "exact",
      neutered: true,
      activityLevel: "normal",
      goal: "maintain",
    })
    .returning({ id: pet.id })
    .get();
  if (weightG !== null) {
    db.insert(weightEntry)
      .values({ petId: id, measuredAt: new Date("2026-11-01T08:00:00Z"), weightG })
      .run();
  }
  return { db, id };
}

describe("syncCalculatedTarget", () => {
  it("starts the target history from the pet's profile", () => {
    const { db, id } = catWeighing(4000);

    expect(syncCalculatedTarget(db, id, "2026-11-10")).toBe(238);
    expect(targetOn(db, id, "2026-11-10")).toEqual({
      effectiveFrom: "2026-11-10",
      kcalPerDay: 238,
      source: "calculated",
    });
  });

  it("keeps the old target on earlier days when the profile changes", () => {
    const { db, id } = catWeighing(4000);
    syncCalculatedTarget(db, id, "2026-11-10");
    db.update(pet).set({ activityLevel: "active" }).run();

    expect(syncCalculatedTarget(db, id, "2026-11-20")).toBe(277);
    expect(targetOn(db, id, "2026-11-19")?.kcalPerDay).toBe(238);
    expect(targetOn(db, id, "2026-11-20")?.kcalPerDay).toBe(277);
  });

  it("replaces the day's row when the profile changes twice in a day", () => {
    const { db, id } = catWeighing(4000);
    syncCalculatedTarget(db, id, "2026-11-10");
    db.update(pet).set({ activityLevel: "active" }).run();
    syncCalculatedTarget(db, id, "2026-11-10");

    expect(db.select().from(petTarget).all()).toMatchObject([
      { effectiveFrom: "2026-11-10", kcalPerDay: 277 },
    ]);
  });

  it("adds nothing to the history when the result is unchanged", () => {
    const { db, id } = catWeighing(4000);
    syncCalculatedTarget(db, id, "2026-11-10");

    expect(syncCalculatedTarget(db, id, "2026-11-20")).toBeNull();
    expect(db.select().from(petTarget).all()).toHaveLength(1);
  });

  it("leaves a target the user set alone", () => {
    const { db, id } = catWeighing(4000);
    setTarget(db, id, "2026-11-10", 250, "manual");
    db.update(pet).set({ activityLevel: "active" }).run();

    expect(syncCalculatedTarget(db, id, "2026-11-20")).toBeNull();
    expect(targetOn(db, id, "2026-11-20")).toMatchObject({ kcalPerDay: 250, source: "manual" });
  });

  it("sets no target while the weight is unknown", () => {
    const { db, id } = catWeighing(null);

    expect(syncCalculatedTarget(db, id, "2026-11-10")).toBeNull();
    expect(targetOn(db, id, "2026-11-10")).toBeUndefined();
  });
});

describe("suggestedKcal", () => {
  it("has nothing to suggest for a custom pet type", () => {
    const { db, id } = catWeighing(4000);
    const rabbit = db.insert(petType).values({ name: "Rabbit" }).returning().get();
    db.update(pet).set({ petTypeId: rabbit.id }).where(eq(pet.id, id)).run();

    expect(suggestedKcal(db, id, "2026-11-10")).toBeNull();
  });

  it("uses the most recent weigh-in", () => {
    const { db, id } = catWeighing(4000);
    db.insert(weightEntry)
      .values({ petId: id, measuredAt: new Date("2026-11-08T08:00:00Z"), weightG: 4500 })
      .run();

    expect(suggestedKcal(db, id, "2026-11-10")).toBe(260);
  });
});
