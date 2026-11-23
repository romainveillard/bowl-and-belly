import { and, eq, gte } from "drizzle-orm";
import { appDayStart } from "../../shared/app-day.js";
import type { DbOrTx } from "../db/open.js";
import { feedEntry, food } from "../db/schema.js";
import { daySettings } from "../settings.js";

/** Which past feeds take the food's new kcal value. */
export type KcalBackfill = { scope: "all" } | { scope: "since"; day: string } | { scope: "none" };

/**
 * Changes a food's kcal and, if asked, the snapshot on its past feeds: all of
 * them (a misread label) or those from the start of an app day (a recipe
 * change). Edits apply in the order they are saved, so a later one overwrites
 * whatever range it overlaps.
 */
export function changeKcal(
  db: DbOrTx,
  foodId: number,
  kcalPerKg: number,
  backfill: KcalBackfill,
): void {
  db.update(food).set({ kcalPerKg }).where(eq(food.id, foodId)).run();
  if (backfill.scope === "none") {
    return;
  }
  const ofThisFood = eq(feedEntry.foodId, foodId);
  db.update(feedEntry)
    .set({ kcalPerKg })
    .where(
      backfill.scope === "all"
        ? ofThisFood
        : and(ofThisFood, gte(feedEntry.fedAt, appDayStart(backfill.day, daySettings(db)))),
    )
    .run();
}
