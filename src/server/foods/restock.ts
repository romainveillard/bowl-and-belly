import { eq } from "drizzle-orm";
import type { DbOrTx } from "../db/open.js";
import { food } from "../db/schema.js";

/**
 * Adds a purchase to a food's stock. Stock that had run below zero counts as
 * an empty shelf. Run it in a transaction, so a feed logged between the read
 * and the write isn't lost. False if the food is gone.
 */
export function restock(db: DbOrTx, foodId: number, addG: number): boolean {
  const row = db.select({ stockG: food.stockG }).from(food).where(eq(food.id, foodId)).get();
  if (!row) {
    return false;
  }
  db.update(food)
    .set({ stockG: Math.max(row.stockG, 0) + addG })
    .where(eq(food.id, foodId))
    .run();
  return true;
}
