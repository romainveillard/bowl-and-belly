import { desc, eq } from "drizzle-orm";
import { addDays, appDayOf, appDayStart, type DaySettings } from "../../shared/app-day.js";
import type { DbOrTx } from "../db/open.js";
import { pet, weightEntry } from "../db/schema.js";
import { weighInPrompt } from "../pets/prompts.js";
import { latestWeightG } from "../pets/targets.js";
import { daySettings } from "../settings.js";

/**
 * When a reading dated `date` (an app day) was taken: now for today, so
 * same-day readings keep their order, and halfway through an earlier day, so
 * it falls on that day whatever time the day starts.
 */
export function measuredOn(date: string, now: Date, settings: DaySettings): Date {
  if (date === appDayOf(now, settings)) {
    return now;
  }
  const start = appDayStart(date, settings).getTime();
  const end = appDayStart(addDays(date, 1), settings).getTime();
  return new Date((start + end) / 2);
}

function latestId(db: DbOrTx, petId: number): number | undefined {
  return db
    .select({ id: weightEntry.id })
    .from(weightEntry)
    .where(eq(weightEntry.petId, petId))
    .orderBy(desc(weightEntry.measuredAt), desc(weightEntry.id))
    .limit(1)
    .get()?.id;
}

/**
 * Logs a weigh-in dated `date`. Only the latest reading can change the
 * target, so a backdated one just joins the history and asks nothing.
 * Undefined if the pet is gone.
 */
export function logReading(
  db: DbOrTx,
  reading: { petId: number; weightG: number; date: string },
  now: Date,
) {
  const exists = db.select({ id: pet.id }).from(pet).where(eq(pet.id, reading.petId)).get();
  if (!exists) {
    return undefined;
  }
  const settings = daySettings(db);
  const { id } = db
    .insert(weightEntry)
    .values({
      petId: reading.petId,
      weightG: reading.weightG,
      measuredAt: measuredOn(reading.date, now, settings),
    })
    .returning({ id: weightEntry.id })
    .get();
  return {
    id,
    prompt:
      latestId(db, reading.petId) === id
        ? weighInPrompt(db, reading.petId, appDayOf(now, settings))
        : null,
  };
}

/**
 * Corrects a weigh-in. A reading left on its day keeps its time. The target
 * question is asked again when it was the latest reading or has become it.
 * Undefined if the reading is gone.
 */
export function editReading(
  db: DbOrTx,
  id: number,
  reading: { weightG: number; date: string },
  now: Date,
) {
  const before = db.select().from(weightEntry).where(eq(weightEntry.id, id)).get();
  if (!before) {
    return undefined;
  }
  const wasLatest = latestId(db, before.petId) === id;
  const settings = daySettings(db);
  const measuredAt =
    appDayOf(before.measuredAt, settings) === reading.date
      ? before.measuredAt
      : measuredOn(reading.date, now, settings);
  db.update(weightEntry)
    .set({ weightG: reading.weightG, measuredAt })
    .where(eq(weightEntry.id, id))
    .run();
  const isLatest = latestId(db, before.petId) === id;
  return {
    prompt: wasLatest || isLatest ? weighInPrompt(db, before.petId, appDayOf(now, settings)) : null,
  };
}

/**
 * Deletes a weigh-in, asking the target question again if it was the latest.
 * Returns the row, so the delete can be undone. Undefined if it is gone.
 */
export function deleteReading(db: DbOrTx, id: number, now: Date) {
  const before = db.select().from(weightEntry).where(eq(weightEntry.id, id)).get();
  if (!before) {
    return undefined;
  }
  const wasLatest = latestId(db, before.petId) === id;
  db.delete(weightEntry).where(eq(weightEntry.id, id)).run();
  return {
    deleted: before,
    prompt: wasLatest ? weighInPrompt(db, before.petId, appDayOf(now, daySettings(db))) : null,
  };
}

/**
 * The pet form's current weight: logged as a weigh-in now when it differs
 * from the latest reading. True if one was logged.
 */
export function logCurrentWeight(
  db: DbOrTx,
  petId: number,
  weightG: number | null,
  now: Date,
): boolean {
  if (weightG === null || weightG === latestWeightG(db, petId)) {
    return false;
  }
  db.insert(weightEntry).values({ petId, measuredAt: now, weightG }).run();
  return true;
}
