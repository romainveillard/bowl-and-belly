import { desc, eq } from "drizzle-orm";
import { AGE_STEPS, ageInMonths } from "../../shared/target.js";
import type { DbOrTx } from "../db/open.js";
import { pet, petType, weightEntry } from "../db/schema.js";
import { suggestedKcal, targetOn } from "./targets.js";

/**
 * The calculated target and what the formula now gives, when they differ.
 * A target the user set is theirs: nothing is ever suggested over it.
 */
function changedSuggestion(db: DbOrTx, petId: number, day: string) {
  const current = targetOn(db, petId, day);
  if (!current || current.source === "manual") {
    return null;
  }
  const suggested = suggestedKcal(db, petId, day);
  if (suggested === null || suggested === current.kcalPerDay) {
    return null;
  }
  return { current, suggestedKcal: suggested };
}

/**
 * Asked after the latest weigh-in changes: a weigh-in never moves the target
 * by itself, so scale noise does not make it jitter.
 */
export function weighInPrompt(db: DbOrTx, petId: number, day: string) {
  const change = changedSuggestion(db, petId, day);
  if (!change) {
    return null;
  }
  const [latest, previous] = db
    .select({ weightG: weightEntry.weightG })
    .from(weightEntry)
    .where(eq(weightEntry.petId, petId))
    .orderBy(desc(weightEntry.measuredAt), desc(weightEntry.id))
    .limit(2)
    .all();
  return {
    reason: "weight" as const,
    currentKcal: change.current.kcalPerDay,
    suggestedKcal: change.suggestedKcal,
    weightG: latest?.weightG ?? null,
    previousWeightG: previous?.weightG ?? null,
  };
}

/**
 * Asked once when a pet has reached an age at which the factor table moves
 * it on (a puppy at 4 months, any pet at 12), if its calculated target was
 * set before it got there.
 */
export function agePrompt(db: DbOrTx, petId: number, day: string) {
  const row = db
    .select({
      systemKey: petType.systemKey,
      birthDate: pet.birthDate,
      agePromptMonths: pet.agePromptMonths,
    })
    .from(pet)
    .innerJoin(petType, eq(pet.petTypeId, petType.id))
    .where(eq(pet.id, petId))
    .get();
  if (!row?.systemKey) {
    return null;
  }
  const months = ageInMonths(row.birthDate, day);
  const reached = AGE_STEPS[row.systemKey].filter((step) => step <= months).at(-1);
  if (reached === undefined || (row.agePromptMonths ?? 0) >= reached) {
    return null;
  }
  const change = changedSuggestion(db, petId, day);
  if (!change || ageInMonths(row.birthDate, change.current.effectiveFrom) >= reached) {
    return null;
  }
  return {
    reason: "age" as const,
    months: reached,
    currentKcal: change.current.kcalPerDay,
    suggestedKcal: change.suggestedKcal,
  };
}
