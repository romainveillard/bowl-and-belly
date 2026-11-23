import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { openDatabase } from "../db/open.js";
import { pet, weightEntry } from "../db/schema.js";
import { agePrompt, weighInPrompt } from "./prompts.js";
import { chooseTarget, setTarget } from "./targets.js";

// A neutered, normally active pet weighing 4 kg on 1 November.
function petWith(petTypeId: 1 | 2, birthDate: string) {
  const db = openDatabase(":memory:");
  const { id } = db
    .insert(pet)
    .values({
      name: "Miso",
      petTypeId,
      birthDate,
      birthDatePrecision: "exact",
      neutered: true,
      activityLevel: "normal",
      goal: "maintain",
    })
    .returning({ id: pet.id })
    .get();
  db.insert(weightEntry)
    .values({ petId: id, measuredAt: new Date("2026-11-01T08:00:00Z"), weightG: 4000 })
    .run();
  return { db, id };
}

const weighIn = (db: ReturnType<typeof openDatabase>, petId: number, weightG: number) =>
  db
    .insert(weightEntry)
    .values({ petId, measuredAt: new Date("2026-11-20T08:00:00Z"), weightG })
    .run();

describe("weighInPrompt", () => {
  it("suggests the new target without changing it", () => {
    const { db, id } = petWith(1, "2020-05-01");
    chooseTarget(db, id, "2026-11-01", null);
    weighIn(db, id, 4300);

    expect(weighInPrompt(db, id, "2026-11-20")).toEqual({
      reason: "weight",
      currentKcal: 238,
      suggestedKcal: 251,
      weightG: 4300,
      previousWeightG: 4000,
    });
  });

  it("asks nothing when the target stays the same", () => {
    const { db, id } = petWith(1, "2020-05-01");
    chooseTarget(db, id, "2026-11-01", null);
    weighIn(db, id, 4001);

    expect(weighInPrompt(db, id, "2026-11-20")).toBeNull();
  });

  it("never suggests over a target the user set", () => {
    const { db, id } = petWith(1, "2020-05-01");
    setTarget(db, id, "2026-11-01", 250, "manual");
    weighIn(db, id, 4300);

    expect(weighInPrompt(db, id, "2026-11-20")).toBeNull();
  });
});

describe("agePrompt", () => {
  it("asks about a puppy at 4 months and again at 12, but a kitten only at 12", () => {
    const puppy = petWith(2, "2026-07-01");
    chooseTarget(puppy.db, puppy.id, "2026-10-31", null);
    const kitten = petWith(1, "2026-07-01");
    chooseTarget(kitten.db, kitten.id, "2026-10-31", null);

    expect(agePrompt(puppy.db, puppy.id, "2026-11-01")).toMatchObject({ months: 4 });
    expect(agePrompt(kitten.db, kitten.id, "2026-11-01")).toBeNull();
    expect(agePrompt(kitten.db, kitten.id, "2027-07-01")).toMatchObject({ months: 12 });
  });

  it("asks once per step, whatever the answer", () => {
    const { db, id } = petWith(2, "2026-07-01");
    chooseTarget(db, id, "2026-10-31", null);
    db.update(pet).set({ agePromptMonths: 4 }).where(eq(pet.id, id)).run();

    expect(agePrompt(db, id, "2026-11-01")).toBeNull();
    expect(agePrompt(db, id, "2027-07-01")).toMatchObject({ months: 12 });
  });

  it("asks nothing when the target was set after the pet reached that age", () => {
    const { db, id } = petWith(2, "2026-07-01");
    chooseTarget(db, id, "2026-11-01", null);
    weighIn(db, id, 4300);

    // The weigh-in changes the suggestion, but that is the weigh-in's question.
    expect(agePrompt(db, id, "2026-11-20")).toBeNull();
  });

  it("never suggests over a target the user set", () => {
    const { db, id } = petWith(2, "2026-07-01");
    setTarget(db, id, "2026-10-31", 600, "manual");

    expect(agePrompt(db, id, "2026-11-01")).toBeNull();
  });
});
