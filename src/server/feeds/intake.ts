import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { DbOrTx } from "../db/open.js";
import { feedEntry } from "../db/schema.js";

/** kcal eaten by a pet from `from` up to, not including, `to`. */
export function kcalEaten(db: DbOrTx, petId: number, from: Date, to: Date): number {
  const row = db
    .select({
      // Leftovers are not eaten; the snapshot keeps past days true to the label of the time.
      kcal: sql<number>`coalesce(sum((${feedEntry.servedG} - coalesce(${feedEntry.leftoverG}, 0)) * ${feedEntry.kcalPerKg}), 0) / 1000.0`,
    })
    .from(feedEntry)
    .where(and(eq(feedEntry.petId, petId), gte(feedEntry.fedAt, from), lt(feedEntry.fedAt, to)))
    .get();
  return Math.round(row?.kcal ?? 0);
}
