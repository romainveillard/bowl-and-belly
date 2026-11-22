import { and, desc, eq, lte } from "drizzle-orm";
import { TARGET_SOURCES } from "../../shared/enums.js";
import { calculateTarget } from "../../shared/target.js";
import type { DbOrTx } from "../db/open.js";
import { pet, petTarget, petType, weightEntry } from "../db/schema.js";

type TargetSource = (typeof TARGET_SOURCES)[number];

/** The target in force on `day`: the latest row effective on or before it. */
export function targetOn(db: DbOrTx, petId: number, day: string) {
  return db
    .select({
      effectiveFrom: petTarget.effectiveFrom,
      kcalPerDay: petTarget.kcalPerDay,
      source: petTarget.source,
    })
    .from(petTarget)
    .where(and(eq(petTarget.petId, petId), lte(petTarget.effectiveFrom, day)))
    .orderBy(desc(petTarget.effectiveFrom))
    .limit(1)
    .get();
}

export function latestWeightG(db: DbOrTx, petId: number): number | null {
  const row = db
    .select({ weightG: weightEntry.weightG })
    .from(weightEntry)
    .where(eq(weightEntry.petId, petId))
    .orderBy(desc(weightEntry.measuredAt), desc(weightEntry.id))
    .limit(1)
    .get();
  return row?.weightG ?? null;
}

/** What the formula gives today, or null for custom types and unknown weights. */
export function suggestedKcal(db: DbOrTx, petId: number, day: string): number | null {
  const row = db
    .select({
      systemKey: petType.systemKey,
      birthDate: pet.birthDate,
      neutered: pet.neutered,
      activityLevel: pet.activityLevel,
      goal: pet.goal,
      targetWeightG: pet.targetWeightG,
    })
    .from(pet)
    .innerJoin(petType, eq(pet.petTypeId, petType.id))
    .where(eq(pet.id, petId))
    .get();
  if (!row?.systemKey) {
    return null;
  }
  return calculateTarget({
    ...row,
    petType: row.systemKey,
    today: day,
    weightG: latestWeightG(db, petId),
  });
}

/**
 * Makes `kcalPerDay` the target from `day` on. Earlier days keep theirs, and a
 * second change on the same day replaces the first.
 */
export function setTarget(
  db: DbOrTx,
  petId: number,
  day: string,
  kcalPerDay: number,
  source: TargetSource,
): void {
  db.insert(petTarget)
    .values({ petId, effectiveFrom: day, kcalPerDay, source })
    .onConflictDoUpdate({
      target: [petTarget.petId, petTarget.effectiveFrom],
      set: { kcalPerDay, source },
    })
    .run();
}

/**
 * Brings a calculated target in line with the pet's profile. A target the
 * user set stays theirs. Returns the new value when the target changed.
 */
export function syncCalculatedTarget(db: DbOrTx, petId: number, day: string): number | null {
  const current = targetOn(db, petId, day);
  if (current?.source === "manual") {
    return null;
  }
  const kcalPerDay = suggestedKcal(db, petId, day);
  if (kcalPerDay === null || kcalPerDay === current?.kcalPerDay) {
    return null;
  }
  setTarget(db, petId, day, kcalPerDay, "calculated");
  return kcalPerDay;
}
