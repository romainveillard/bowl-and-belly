import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { openDatabase } from "../db/open.js";
import { pet, petTarget, petType, weightEntry } from "../db/schema.js";
import {
  applyTargetChoice,
  chooseTarget,
  chooseTargetAfterEdit,
  formulaInputs,
  suggestedKcal,
  targetOn,
} from "./targets.js";

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

describe("chooseTarget", () => {
  it("starts the target history from the pet's profile", () => {
    const { db, id } = catWeighing(4000);

    expect(chooseTarget(db, id, "2026-11-10", null)).toBe(238);
    expect(targetOn(db, id, "2026-11-10")).toEqual({
      effectiveFrom: "2026-11-10",
      kcalPerDay: 238,
      source: "calculated",
    });
  });

  it("keeps the old target on earlier days when the profile changes", () => {
    const { db, id } = catWeighing(4000);
    chooseTarget(db, id, "2026-11-10", null);
    db.update(pet).set({ activityLevel: "active" }).run();

    expect(chooseTarget(db, id, "2026-11-20", null)).toBe(277);
    expect(targetOn(db, id, "2026-11-19")?.kcalPerDay).toBe(238);
    expect(targetOn(db, id, "2026-11-20")?.kcalPerDay).toBe(277);
  });

  it("replaces the day's row when the profile changes twice in a day", () => {
    const { db, id } = catWeighing(4000);
    chooseTarget(db, id, "2026-11-10", null);
    db.update(pet).set({ activityLevel: "active" }).run();
    chooseTarget(db, id, "2026-11-10", null);

    expect(db.select().from(petTarget).all()).toMatchObject([
      { effectiveFrom: "2026-11-10", kcalPerDay: 277 },
    ]);
  });

  it("adds nothing to the history when the result is unchanged", () => {
    const { db, id } = catWeighing(4000);
    chooseTarget(db, id, "2026-11-10", null);

    expect(chooseTarget(db, id, "2026-11-20", null)).toBeNull();
    expect(db.select().from(petTarget).all()).toHaveLength(1);
  });

  it("removes the day's row when the target changes back to the one before it", () => {
    const { db, id } = catWeighing(4000);
    chooseTarget(db, id, "2026-11-10", null);
    db.update(pet).set({ activityLevel: "active" }).run();
    chooseTarget(db, id, "2026-11-20", null);
    db.update(pet).set({ activityLevel: "normal" }).run();

    expect(chooseTarget(db, id, "2026-11-20", null)).toBe(238);
    expect(db.select().from(petTarget).all()).toMatchObject([
      { effectiveFrom: "2026-11-10", kcalPerDay: 238 },
    ]);
  });

  it("keeps the day's row when only the value matches the one before it, not who set it", () => {
    const { db, id } = catWeighing(4000);
    chooseTarget(db, id, "2026-11-10", null);
    chooseTarget(db, id, "2026-11-20", 250);

    expect(chooseTarget(db, id, "2026-11-20", 238)).toBe(238);
    expect(targetOn(db, id, "2026-11-20")).toMatchObject({ kcalPerDay: 238, source: "manual" });
  });

  it("keeps a target the user set when the profile changes, until they go back to the formula", () => {
    const { db, id } = catWeighing(4000);
    expect(chooseTarget(db, id, "2026-11-10", 250)).toBe(250);
    db.update(pet).set({ activityLevel: "active" }).run();

    expect(chooseTarget(db, id, "2026-11-20", 250)).toBeNull();
    expect(db.select().from(petTarget).all()).toHaveLength(1);

    expect(chooseTarget(db, id, "2026-11-21", null)).toBe(277);
    expect(targetOn(db, id, "2026-11-20")).toMatchObject({ kcalPerDay: 250, source: "manual" });
    expect(targetOn(db, id, "2026-11-21")).toMatchObject({ kcalPerDay: 277, source: "calculated" });
  });

  it("sets no target while the weight is unknown", () => {
    const { db, id } = catWeighing(null);

    expect(chooseTarget(db, id, "2026-11-10", null)).toBeNull();
    expect(targetOn(db, id, "2026-11-10")).toBeUndefined();
  });

  it("makes a calculated target the user's own when the pet moves to a custom type", () => {
    const { db, id } = catWeighing(4000);
    chooseTarget(db, id, "2026-11-10", null);
    const rabbit = db.insert(petType).values({ name: "Rabbit" }).returning().get();
    db.update(pet).set({ petTypeId: rabbit.id }).where(eq(pet.id, id)).run();

    expect(chooseTarget(db, id, "2026-11-20", null)).toBeNull();
    expect(targetOn(db, id, "2026-11-20")).toEqual({
      effectiveFrom: "2026-11-20",
      kcalPerDay: 238,
      source: "manual",
    });
  });

  it("keeps a calculated target while a built-in type only lacks a weight", () => {
    const { db, id } = catWeighing(4000);
    chooseTarget(db, id, "2026-11-10", null);
    db.delete(weightEntry).run();

    expect(chooseTarget(db, id, "2026-11-20", null)).toBeNull();
    expect(targetOn(db, id, "2026-11-20")?.source).toBe("calculated");
  });
});

describe("applyTargetChoice", () => {
  it("refuses going back to the formula when it has nothing to suggest, keeping the user's own", () => {
    const { db, id } = catWeighing(null);
    chooseTarget(db, id, "2026-11-10", 300);

    expect(applyTargetChoice(db, id, "2026-11-20", null)).toBe("no_suggestion");
    expect(targetOn(db, id, "2026-11-20")).toMatchObject({ kcalPerDay: 300, source: "manual" });
  });
});

// The cat after a weigh-in at 5 kg whose suggested 281 kcal the user declined.
function catKeeping238() {
  const { db, id } = catWeighing(4000);
  chooseTarget(db, id, "2026-11-10", null);
  db.insert(weightEntry)
    .values({ petId: id, measuredAt: new Date("2026-11-15T08:00:00Z"), weightG: 5000 })
    .run();
  const before = formulaInputs(db, id);
  if (!before) {
    throw new Error("Missing pet");
  }
  return { db, id, before };
}

describe("chooseTargetAfterEdit", () => {
  it("keeps a declined suggestion when the edit leaves the formula's inputs alone", () => {
    const { db, id, before } = catKeeping238();
    db.update(pet).set({ name: "Miso the Great" }).run();

    expect(
      chooseTargetAfterEdit(db, id, "2026-11-20", { before, weighed: false, manualKcal: null }),
    ).toBeNull();
    expect(targetOn(db, id, "2026-11-20")?.kcalPerDay).toBe(238);
  });

  it("follows the formula again when the edit changes what it reads", () => {
    const { db, id, before } = catKeeping238();
    db.update(pet).set({ activityLevel: "active" }).run();

    expect(
      chooseTargetAfterEdit(db, id, "2026-11-20", { before, weighed: false, manualKcal: null }),
    ).toBe(328);
  });

  it("follows the formula again when the edit logs a new weight", () => {
    const { db, id, before } = catKeeping238();

    expect(
      chooseTargetAfterEdit(db, id, "2026-11-20", { before, weighed: true, manualKcal: null }),
    ).toBe(281);
  });

  it("goes back to the formula from a target the user set", () => {
    const { db, id } = catWeighing(4000);
    chooseTarget(db, id, "2026-11-10", 250);
    const before = formulaInputs(db, id);
    if (!before) {
      throw new Error("Missing pet");
    }

    expect(
      chooseTargetAfterEdit(db, id, "2026-11-20", { before, weighed: false, manualKcal: null }),
    ).toBe(238);
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
