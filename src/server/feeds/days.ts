import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { addDays, appDayOf, appDayStart } from "../../shared/app-day.js";
import type { DbOrTx } from "../db/open.js";
import { feedEntry, food, foodType } from "../db/schema.js";
import { targetHistory, targetIn } from "../pets/targets.js";
import { daySettings } from "../settings.js";

const eatenG = (entry: { servedG: number; leftoverG: number | null }) =>
  entry.servedG - (entry.leftoverG ?? 0);

/**
 * One summary per app day from `from` to `to`, newest first: days with at
 * least one feed, and `always` even when it has none. kcal comes from each
 * feed's own snapshot, so past days stay true to the label of the time.
 */
export function daySummaries(db: DbOrTx, petId: number, from: string, to: string, always?: string) {
  const settings = daySettings(db);
  const entries = db
    .select({
      id: feedEntry.id,
      fedAt: feedEntry.fedAt,
      servedG: feedEntry.servedG,
      leftoverG: feedEntry.leftoverG,
      leftoverReturnedToStock: feedEntry.leftoverReturnedToStock,
      kcalPerKg: feedEntry.kcalPerKg,
      food: { id: food.id, name: food.name, brand: food.brand, photoId: food.photoId },
      type: {
        id: foodType.id,
        systemKey: foodType.systemKey,
        name: foodType.name,
        leftoverReturnsToStock: foodType.leftoverReturnsToStock,
      },
    })
    .from(feedEntry)
    .innerJoin(food, eq(feedEntry.foodId, food.id))
    .innerJoin(foodType, eq(food.foodTypeId, foodType.id))
    .where(
      and(
        eq(feedEntry.petId, petId),
        gte(feedEntry.fedAt, appDayStart(from, settings)),
        lt(feedEntry.fedAt, appDayStart(addDays(to, 1), settings)),
      ),
    )
    .orderBy(desc(feedEntry.fedAt), desc(feedEntry.id))
    .all();

  const byDay = new Map<string, typeof entries>();
  if (always !== undefined && always >= from && always <= to) {
    byDay.set(always, []);
  }
  for (const entry of entries) {
    const day = appDayOf(entry.fedAt, settings);
    const dayEntries = byDay.get(day);
    if (dayEntries) {
      dayEntries.push(entry);
    } else {
      byDay.set(day, [entry]);
    }
  }

  const targets = targetHistory(db, petId);
  return [...byDay.entries()]
    .toSorted(([a], [b]) => b.localeCompare(a))
    .map(([day, dayEntries]) => {
      const kcalOf = (entry: (typeof entries)[number]) => (eatenG(entry) * entry.kcalPerKg) / 1000;
      const types = new Map<
        number,
        { type: (typeof entries)[number]["type"]; eatenG: number; kcal: number }
      >();
      for (const entry of dayEntries) {
        const total = types.get(entry.type.id) ?? { type: entry.type, eatenG: 0, kcal: 0 };
        total.eatenG += eatenG(entry);
        total.kcal += kcalOf(entry);
        types.set(entry.type.id, total);
      }
      return {
        day,
        targetKcal: targetIn(targets, day)?.kcalPerDay ?? null,
        // Rounded once from the exact sum, so it can differ by one from the rows added up.
        eatenKcal: Math.round(dayEntries.reduce((sum, entry) => sum + kcalOf(entry), 0)),
        byType: [...types.values()]
          .toSorted((a, b) => a.type.id - b.type.id)
          .map((total) => ({ ...total, kcal: Math.round(total.kcal) })),
        entries: dayEntries.map((entry) => ({
          ...entry,
          kcal: Math.round((eatenG(entry) * entry.kcalPerKg) / 1000),
        })),
      };
    });
}

/** Whether the pet has any feed before the app day `day`. */
export function hasFeedsBefore(db: DbOrTx, petId: number, day: string): boolean {
  const row = db
    .select({ id: feedEntry.id })
    .from(feedEntry)
    .where(and(eq(feedEntry.petId, petId), lt(feedEntry.fedAt, appDayStart(day, daySettings(db)))))
    .orderBy(asc(feedEntry.fedAt))
    .limit(1)
    .get();
  return row !== undefined;
}
