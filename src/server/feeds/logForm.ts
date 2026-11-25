import { and, desc, eq, isNull, lte, max, or } from "drizzle-orm";
import type { DbOrTx } from "../db/open.js";
import { feedEntry, food, foodType, pet } from "../db/schema.js";
import { returnsLeftovers } from "./entries.js";

/**
 * Only a recent previous feed prompts for a leftover; older bowls are long
 * gone. Foods whose leftovers are binned use Add leftover instead.
 */
const LEFTOVER_PROMPT_MS = 24 * 60 * 60 * 1000;

const foodTypeLabel = {
  id: foodType.id,
  systemKey: foodType.systemKey,
  name: foodType.name,
  leftoverReturnsToStock: foodType.leftoverReturnsToStock,
};

/**
 * What the log form offers a pet: the foods for its type or for any pet,
 * recently fed ones first with the last amount served, and the previous feed
 * when its leftover is worth asking about. Undefined if the pet is gone.
 */
export function logForm(db: DbOrTx, petId: number, now: Date) {
  const owner = db.select({ petTypeId: pet.petTypeId }).from(pet).where(eq(pet.id, petId)).get();
  if (!owner) {
    return undefined;
  }
  const foods = db
    .select({
      id: food.id,
      name: food.name,
      brand: food.brand,
      photoId: food.photoId,
      type: foodTypeLabel,
      kcalPerKg: food.kcalPerKg,
      portionName: food.portionName,
      portionG: food.portionG,
      stockUnit: food.stockUnit,
      stockG: food.stockG,
    })
    .from(food)
    .innerJoin(foodType, eq(food.foodTypeId, foodType.id))
    .where(
      and(isNull(food.archivedAt), or(isNull(food.petTypeId), eq(food.petTypeId, owner.petTypeId))),
    )
    .orderBy(food.name)
    .all();

  const fedSoFar = and(eq(feedEntry.petId, petId), lte(feedEntry.fedAt, now));
  // SQLite takes the bare served_g from the row that holds the MAX.
  const lastFeeds = db
    .select({ foodId: feedEntry.foodId, fedAt: max(feedEntry.fedAt), servedG: feedEntry.servedG })
    .from(feedEntry)
    .where(fedSoFar)
    .groupBy(feedEntry.foodId)
    .all();
  const last = new Map(lastFeeds.map((feed) => [feed.foodId, feed]));
  const recent = foods
    .filter((row) => last.has(row.id))
    .toSorted(
      (a, b) => (last.get(b.id)?.fedAt?.getTime() ?? 0) - (last.get(a.id)?.fedAt?.getTime() ?? 0),
    );
  const others = foods.filter((row) => !last.has(row.id));

  const previous = db
    .select({
      id: feedEntry.id,
      foodId: feedEntry.foodId,
      fedAt: feedEntry.fedAt,
      servedG: feedEntry.servedG,
      leftoverG: feedEntry.leftoverG,
    })
    .from(feedEntry)
    .where(fedSoFar)
    .orderBy(desc(feedEntry.fedAt), desc(feedEntry.id))
    .limit(1)
    .get();
  const previousFood = previous && foods.find((row) => row.id === previous.foodId);
  const askLeftover =
    previous !== undefined &&
    previous.leftoverG === null &&
    now.getTime() - previous.fedAt.getTime() < LEFTOVER_PROMPT_MS &&
    returnsLeftovers(db, previous.foodId);

  return {
    foods: [...recent, ...others].map((row) => ({
      ...row,
      lastServedG: last.get(row.id)?.servedG ?? null,
    })),
    recentCount: recent.length,
    previous:
      askLeftover && previous
        ? {
            id: previous.id,
            fedAt: previous.fedAt,
            servedG: previous.servedG,
            foodName: previousFood?.name ?? null,
          }
        : null,
  };
}
