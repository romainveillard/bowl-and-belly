import { eq, sql } from "drizzle-orm";
import type { DbOrTx } from "../db/open.js";
import { feedEntry, food } from "../db/schema.js";

export interface FeedValues {
  petId: number;
  foodId: number;
  fedAt: Date;
  servedG: number;
  leftoverG: number | null;
  leftoverReturnedToStock: boolean;
}

/** What an entry took out of stock: what was served, less any leftover put back. */
export function takenFromStockG(entry: Omit<FeedValues, "petId" | "foodId" | "fedAt">): number {
  return entry.servedG - (entry.leftoverReturnedToStock ? (entry.leftoverG ?? 0) : 0);
}

// Stock may go below zero: logging is never blocked by a stale count.
function changeStock(db: DbOrTx, foodId: number, deltaG: number): void {
  if (deltaG !== 0) {
    db.update(food)
      .set({ stockG: sql`${food.stockG} + ${deltaG}` })
      .where(eq(food.id, foodId))
      .run();
  }
}

function kcalOf(db: DbOrTx, foodId: number): number | undefined {
  return db.select({ kcalPerKg: food.kcalPerKg }).from(food).where(eq(food.id, foodId)).get()
    ?.kcalPerKg;
}

/** Logs a feed at the food's current kcal and takes it out of stock. Undefined if the food is gone. */
export function logFeed(db: DbOrTx, values: FeedValues): number | undefined {
  const kcalPerKg = kcalOf(db, values.foodId);
  if (kcalPerKg === undefined) {
    return undefined;
  }
  return restoreFeed(db, { ...values, kcalPerKg });
}

/**
 * Edits a feed and moves stock by the difference. The kcal snapshot stays
 * unless the food changes, when the new food's current value is taken.
 */
export function editFeed(db: DbOrTx, id: number, values: FeedValues): boolean {
  const before = db.select().from(feedEntry).where(eq(feedEntry.id, id)).get();
  if (!before) {
    return false;
  }
  const kcalPerKg = values.foodId === before.foodId ? before.kcalPerKg : kcalOf(db, values.foodId);
  if (kcalPerKg === undefined) {
    return false;
  }
  changeStock(db, before.foodId, takenFromStockG(before));
  changeStock(db, values.foodId, -takenFromStockG(values));
  db.update(feedEntry)
    .set({ ...values, kcalPerKg })
    .where(eq(feedEntry.id, id))
    .run();
  return true;
}

/**
 * Deletes a feed logged by mistake: the food never left the bag, so what it
 * took out of stock goes back. Returns the row, so the delete can be undone.
 */
export function deleteFeed(db: DbOrTx, id: number) {
  const row = db.delete(feedEntry).where(eq(feedEntry.id, id)).returning().get();
  if (row) {
    changeStock(db, row.foodId, takenFromStockG(row));
  }
  return row;
}

/** Writes a feed with a given kcal snapshot, as undoing a delete needs. */
export function restoreFeed(db: DbOrTx, values: FeedValues & { kcalPerKg: number }): number {
  const created = db.insert(feedEntry).values(values).returning({ id: feedEntry.id }).get();
  changeStock(db, values.foodId, -takenFromStockG(values));
  return created.id;
}
