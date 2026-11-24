import { and, desc, eq, lte } from "drizzle-orm";
import { addDays } from "../../shared/app-day.js";
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
 * Applies the user's choice from `day` on: their own value, or the formula's
 * when `manualKcal` is null. Nothing is written when that is already the
 * target, and a change back to the value in force before `day` removes that
 * day's row, so the history only shows real changes. Returns the new kcal
 * value if it differs from the one in force before.
 */
export function chooseTarget(
  db: DbOrTx,
  petId: number,
  day: string,
  manualKcal: number | null,
): number | null {
  const before = targetOn(db, petId, day);
  const source = manualKcal === null ? "calculated" : "manual";
  const kcalPerDay = manualKcal ?? suggestedKcal(db, petId, day);
  if (kcalPerDay === null) {
    return null;
  }
  const setToday = before?.effectiveFrom === day;
  const previous = setToday ? targetOn(db, petId, addDays(day, -1)) : before;
  if (previous?.source === source && previous.kcalPerDay === kcalPerDay) {
    if (setToday) {
      db.delete(petTarget)
        .where(and(eq(petTarget.petId, petId), eq(petTarget.effectiveFrom, day)))
        .run();
    }
  } else if (before?.source !== source || before.kcalPerDay !== kcalPerDay) {
    setTarget(db, petId, day, kcalPerDay, source);
  }
  return kcalPerDay === before?.kcalPerDay ? null : kcalPerDay;
}
