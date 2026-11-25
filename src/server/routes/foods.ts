import { and, count, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { STOCK_UNITS } from "../../shared/enums.js";
import { db } from "../db/client.js";
import { feedEntry, food, foodType, image } from "../db/schema.js";
import { changeKcal } from "../foods/kcal.js";
import { portionsFor } from "../foods/portions.js";
import { restock } from "../foods/restock.js";
import { grams, kcalPerKg, stockGrams, validate } from "../validate.js";

const idParam = z.object({ id: z.coerce.number().int() });

const foodBody = z.object({
  name: z.string().trim().min(1).max(100),
  brand: z.string().trim().max(100).nullable(),
  photoId: z.number().int().nullable(),
  foodTypeId: z.number().int(),
  /** Null suits any pet. */
  petTypeId: z.number().int().nullable(),
  kcalPerKg,
  portionName: z.string().trim().min(1).max(40).nullable(),
  portionG: grams.nullable(),
  stockUnit: z.enum(STOCK_UNITS),
  stockG: stockGrams,
});

const backfill = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("all") }),
  z.object({ scope: z.literal("since"), day: z.iso.date() }),
  z.object({ scope: z.literal("none") }),
]);

type FoodBody = z.infer<typeof foodBody>;

/** The row to store, or null when the food type does not exist. */
function rowOf<Body extends Omit<FoodBody, "stockG">>(body: Body) {
  const type = db
    .select({ systemKey: foodType.systemKey })
    .from(foodType)
    .where(eq(foodType.id, body.foodTypeId))
    .get();
  if (!type) {
    return null;
  }
  return { ...body, brand: body.brand || null, ...portionsFor(body, type.systemKey) };
}

const foodTypeLabel = { id: foodType.id, systemKey: foodType.systemKey, name: foodType.name };

const listed = {
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
};

export const foodsRoutes = new Hono()
  .get("/", (c) => {
    const foods = db
      .select(listed)
      .from(food)
      .innerJoin(foodType, eq(food.foodTypeId, foodType.id))
      .where(isNull(food.archivedAt))
      .orderBy(food.name)
      .all();
    const archived = db
      .select({ count: count() })
      .from(food)
      .where(isNotNull(food.archivedAt))
      .get();
    return c.json({ foods, archivedCount: archived?.count ?? 0 });
  })
  .get("/count", (c) => {
    const row = db.select({ count: count() }).from(food).where(isNull(food.archivedAt)).get();
    return c.json(row?.count ?? 0);
  })
  .get("/archived", (c) =>
    c.json(
      db
        .select({
          id: food.id,
          name: food.name,
          brand: food.brand,
          type: foodTypeLabel,
          archivedAt: food.archivedAt,
        })
        .from(food)
        .innerJoin(foodType, eq(food.foodTypeId, foodType.id))
        .where(isNotNull(food.archivedAt))
        .orderBy(desc(food.archivedAt))
        .all(),
    ),
  )
  .get("/:id", validate("param", idParam), (c) => {
    const { id } = c.req.valid("param");
    const row = db
      .select({ ...listed, foodTypeId: food.foodTypeId, petTypeId: food.petTypeId })
      .from(food)
      .innerJoin(foodType, eq(food.foodTypeId, foodType.id))
      .where(eq(food.id, id))
      .get();
    if (!row) {
      return c.json({ code: "not_found" as const }, 404);
    }
    const fed = db
      .select({ id: feedEntry.id })
      .from(feedEntry)
      .where(eq(feedEntry.foodId, id))
      .limit(1)
      .get();
    return c.json({ ...row, hasFeeds: fed !== undefined });
  })
  .post("/", validate("json", foodBody), (c) => {
    const row = rowOf(c.req.valid("json"));
    if (!row) {
      return c.json({ code: "unknown_food_type" as const }, 400);
    }
    const created = db.insert(food).values(row).returning({ id: food.id }).get();
    return c.json({ id: created.id }, 201);
  })
  .put(
    "/:id",
    validate("param", idParam),
    validate(
      "json",
      foodBody.extend({
        // Only sent when the user corrected the count. Otherwise the stock
        // stays as it is now, not as it was when the form opened, so feeds
        // logged meanwhile from another device still count.
        stockG: stockGrams.optional(),
        kcalBackfill: backfill,
      }),
    ),
    (c) => {
      const { id } = c.req.valid("param");
      const { kcalBackfill, ...body } = c.req.valid("json");
      const row = rowOf(body);
      if (!row) {
        return c.json({ code: "unknown_food_type" as const }, 400);
      }
      const found = db.transaction((tx) => {
        const before = tx
          .select({ photoId: food.photoId, kcalPerKg: food.kcalPerKg })
          .from(food)
          .where(eq(food.id, id))
          .get();
        if (!before) {
          return false;
        }
        tx.update(food).set(row).where(eq(food.id, id)).run();
        if (before.kcalPerKg !== row.kcalPerKg) {
          changeKcal(tx, id, row.kcalPerKg, kcalBackfill);
        }
        if (before.photoId !== null && before.photoId !== row.photoId) {
          tx.delete(image).where(eq(image.id, before.photoId)).run();
        }
        return true;
      });
      return found ? c.body(null, 204) : c.json({ code: "not_found" as const }, 404);
    },
  )
  .post(
    "/:id/restock",
    validate("param", idParam),
    validate("json", z.object({ addG: grams })),
    (c) => {
      const { id } = c.req.valid("param");
      const { addG } = c.req.valid("json");
      const restocked = db.transaction((tx) => restock(tx, id, addG));
      return restocked ? c.body(null, 204) : c.json({ code: "not_found" as const }, 404);
    },
  )
  .post("/:id/archive", validate("param", idParam), (c) => {
    const { id } = c.req.valid("param");
    const archived = db
      .update(food)
      .set({ archivedAt: new Date() })
      .where(and(eq(food.id, id), isNull(food.archivedAt)))
      .returning({ id: food.id })
      .get();
    return archived ? c.body(null, 204) : c.json({ code: "not_found" as const }, 404);
  })
  .post("/:id/restore", validate("param", idParam), (c) => {
    const { id } = c.req.valid("param");
    const restored = db
      .update(food)
      .set({ archivedAt: null })
      .where(and(eq(food.id, id), isNotNull(food.archivedAt)))
      .returning({ id: food.id })
      .get();
    return restored ? c.body(null, 204) : c.json({ code: "not_found" as const }, 404);
  });
