import { eq, sql } from "drizzle-orm";
import { leftoverFits } from "../../shared/feeds.js";
import type { DbOrTx } from "../db/open.js";
import { feedEntry, food, foodType } from "../db/schema.js";

interface FeedValues {
  petId: number;
  foodId: number;
  fedAt: Date;
  servedG: number;
  leftoverG: number | null;
  leftoverReturnedToStock: boolean;
}

/** What an entry took out of stock: what was served, less any leftover put back. */
function takenFromStockG(entry: Omit<FeedValues, "petId" | "foodId" | "fedAt">): number {
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

/** Whether a food's leftovers go back into stock by default, from its food type. */
export function returnsLeftovers(db: DbOrTx, foodId: number): boolean {
  const row = db
    .select({ returns: foodType.leftoverReturnsToStock })
    .from(food)
    .innerJoin(foodType, eq(food.foodTypeId, foodType.id))
    .where(eq(food.id, foodId))
    .get();
  return row?.returns ?? false;
}

/**
 * Logs a feed from the log form. The leftover found from the pet's previous
 * feed, if any, is recorded on that feed first, going back into stock or the
 * bin as its food type says. Undefined if the food is gone.
 */
export function logFeedWithLeftover(
  db: DbOrTx,
  values: Pick<FeedValues, "petId" | "foodId" | "fedAt" | "servedG">,
  previousLeftover: { entryId: number; leftoverG: number } | null,
): number | "invalid_leftover" | undefined {
  if (previousLeftover) {
    const previous = db
      .select()
      .from(feedEntry)
      .where(eq(feedEntry.id, previousLeftover.entryId))
      .get();
    if (
      previous?.petId !== values.petId ||
      !leftoverFits(previousLeftover.leftoverG, previous.servedG)
    ) {
      return "invalid_leftover";
    }
    editFeed(db, previous.id, {
      ...previous,
      leftoverG: previousLeftover.leftoverG,
      leftoverReturnedToStock: returnsLeftovers(db, previous.foodId),
    });
  }
  return logFeed(db, {
    ...values,
    leftoverG: null,
    leftoverReturnedToStock: returnsLeftovers(db, values.foodId),
  });
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
 * Edits a feed from Edit feed, which keeps it on its pet, and at its own
 * instant when `fedAt` is null. Refused when the leftover is more than was
 * served or the time is still to come.
 */
export function editFromForm(
  db: DbOrTx,
  id: number,
  values: Omit<FeedValues, "petId" | "fedAt"> & { fedAt: Date | null },
  now: Date,
): "invalid_leftover" | "in_future" | "not_found" | "invalid_reference" | undefined {
  if (values.leftoverG !== null && !leftoverFits(values.leftoverG, values.servedG)) {
    return "invalid_leftover";
  }
  if (values.fedAt !== null && values.fedAt > now) {
    return "in_future";
  }
  const before = db.select().from(feedEntry).where(eq(feedEntry.id, id)).get();
  if (!before) {
    return "not_found";
  }
  const edited = { ...values, petId: before.petId, fedAt: values.fedAt ?? before.fedAt };
  return editFeed(db, id, edited) ? undefined : "invalid_reference";
}

/** Records a leftover found after the feed was logged, no more than was served. */
export function recordLeftover(
  db: DbOrTx,
  id: number,
  leftover: { leftoverG: number; leftoverReturnedToStock: boolean },
): "not_found" | "invalid_leftover" | undefined {
  const before = db.select().from(feedEntry).where(eq(feedEntry.id, id)).get();
  if (!before) {
    return "not_found";
  }
  if (!leftoverFits(leftover.leftoverG, before.servedG)) {
    return "invalid_leftover";
  }
  editFeed(db, id, { ...before, ...leftover });
  return undefined;
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
