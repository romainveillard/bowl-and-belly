import { and, desc, eq, isNull, lte, or } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { instantAt, latestAt } from "../../shared/app-day.js";
import { db } from "../db/client.js";
import { feedEntry, food, foodType, pet } from "../db/schema.js";
import { hasFeedsBefore, daySummaries } from "../feeds/days.js";
import { deleteFeed, editFeed, logFeed, restoreFeed } from "../feeds/entries.js";
import { daySettings, today } from "../settings.js";
import { validate } from "../validate.js";

const petQuery = z.object({ petId: z.coerce.number().int() });
const idParam = z.object({ id: z.coerce.number().int() });
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

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

function returnsLeftovers(foodId: number): boolean {
  const row = db
    .select({ returns: foodType.leftoverReturnsToStock })
    .from(food)
    .innerJoin(foodType, eq(food.foodTypeId, foodType.id))
    .where(eq(food.id, foodId))
    .get();
  return row?.returns ?? false;
}

export const feedsRoutes = new Hono()
  .get("/", validate("query", petQuery.extend({ from: z.iso.date(), to: z.iso.date() })), (c) => {
    const { petId, from, to } = c.req.valid("query");
    const day = today(db);
    return c.json({
      today: day,
      days: daySummaries(db, petId, from, to, day),
      hasEarlier: hasFeedsBefore(db, petId, from),
    });
  })
  .get("/log-form", validate("query", petQuery), (c) => {
    const { petId } = c.req.valid("query");
    const owner = db.select({ petTypeId: pet.petTypeId }).from(pet).where(eq(pet.id, petId)).get();
    if (!owner) {
      return c.json({ code: "not_found" as const }, 404);
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
        and(
          isNull(food.archivedAt),
          or(isNull(food.petTypeId), eq(food.petTypeId, owner.petTypeId)),
        ),
      )
      .orderBy(food.name)
      .all();

    const now = new Date();
    const feeds = db
      .select({
        id: feedEntry.id,
        foodId: feedEntry.foodId,
        fedAt: feedEntry.fedAt,
        servedG: feedEntry.servedG,
        leftoverG: feedEntry.leftoverG,
      })
      .from(feedEntry)
      .where(and(eq(feedEntry.petId, petId), lte(feedEntry.fedAt, now)))
      .orderBy(desc(feedEntry.fedAt), desc(feedEntry.id))
      .limit(500)
      .all();
    const last = new Map<number, (typeof feeds)[number]>();
    for (const feed of feeds) {
      if (!last.has(feed.foodId)) {
        last.set(feed.foodId, feed);
      }
    }
    const recent = foods
      .filter((row) => last.has(row.id))
      .toSorted(
        (a, b) => (last.get(b.id)?.fedAt.getTime() ?? 0) - (last.get(a.id)?.fedAt.getTime() ?? 0),
      );
    const others = foods.filter((row) => !last.has(row.id));

    const [previous] = feeds;
    const previousFood = previous && foods.find((row) => row.id === previous.foodId);
    const askLeftover =
      previous !== undefined &&
      previous.leftoverG === null &&
      now.getTime() - previous.fedAt.getTime() < LEFTOVER_PROMPT_MS &&
      returnsLeftovers(previous.foodId);

    return c.json({
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
    });
  })
  .post(
    "/",
    validate(
      "json",
      z.object({
        petId: z.number().int(),
        foodId: z.number().int(),
        servedG: z.number().int().positive(),
        /** "HH:MM" in the app time zone; null is now. */
        time: time.nullable(),
        /** The leftover found from the pet's previous feed, if any. */
        previousLeftover: z
          .object({ entryId: z.number().int(), leftoverG: z.number().int().nonnegative() })
          .nullable(),
      }),
    ),
    (c) => {
      const body = c.req.valid("json");
      const now = new Date();
      const fedAt = body.time === null ? now : latestAt(body.time, now, daySettings(db).timeZone);
      const result = db.transaction((tx) => {
        if (body.previousLeftover) {
          const previous = tx
            .select()
            .from(feedEntry)
            .where(eq(feedEntry.id, body.previousLeftover.entryId))
            .get();
          if (
            previous?.petId !== body.petId ||
            body.previousLeftover.leftoverG > previous.servedG
          ) {
            return "invalid_leftover" as const;
          }
          editFeed(tx, previous.id, {
            ...previous,
            leftoverG: body.previousLeftover.leftoverG,
            leftoverReturnedToStock: returnsLeftovers(previous.foodId),
          });
        }
        return logFeed(tx, {
          petId: body.petId,
          foodId: body.foodId,
          fedAt,
          servedG: body.servedG,
          leftoverG: null,
          leftoverReturnedToStock: returnsLeftovers(body.foodId),
        });
      });
      if (result === "invalid_leftover") {
        return c.json({ code: "invalid_leftover" as const }, 400);
      }
      if (result === undefined) {
        return c.json({ code: "not_found" as const }, 404);
      }
      return c.json({ id: result }, 201);
    },
  )
  .put(
    "/:id",
    validate("param", idParam),
    validate(
      "json",
      z.object({
        foodId: z.number().int(),
        servedG: z.number().int().positive(),
        leftoverG: z.number().int().nonnegative().nullable(),
        leftoverReturnedToStock: z.boolean(),
        /** The calendar date and clock time in the app time zone. */
        date: z.iso.date(),
        time,
      }),
    ),
    (c) => {
      const { id } = c.req.valid("param");
      const { date, time: clock, ...values } = c.req.valid("json");
      if (values.leftoverG !== null && values.leftoverG > values.servedG) {
        return c.json({ code: "invalid_leftover" as const }, 400);
      }
      const fedAt = instantAt(date, clock, daySettings(db).timeZone);
      if (fedAt.getTime() > Date.now()) {
        return c.json({ code: "in_future" as const }, 400);
      }
      const edited = db.transaction((tx) => {
        const before = tx.select().from(feedEntry).where(eq(feedEntry.id, id)).get();
        return before !== undefined && editFeed(tx, id, { ...values, petId: before.petId, fedAt });
      });
      return edited ? c.body(null, 204) : c.json({ code: "not_found" as const }, 404);
    },
  )
  .put(
    "/:id/leftover",
    validate("param", idParam),
    validate(
      "json",
      z.object({
        leftoverG: z.number().int().nonnegative(),
        leftoverReturnedToStock: z.boolean(),
      }),
    ),
    (c) => {
      const { id } = c.req.valid("param");
      const leftover = c.req.valid("json");
      const result = db.transaction((tx) => {
        const before = tx.select().from(feedEntry).where(eq(feedEntry.id, id)).get();
        if (!before) {
          return "not_found" as const;
        }
        if (leftover.leftoverG > before.servedG) {
          return "invalid_leftover" as const;
        }
        editFeed(tx, id, { ...before, ...leftover });
        return "done" as const;
      });
      if (result === "done") {
        return c.body(null, 204);
      }
      return c.json({ code: result }, result === "not_found" ? 404 : 400);
    },
  )
  .delete("/:id", validate("param", idParam), (c) => {
    const { id } = c.req.valid("param");
    const deleted = db.transaction((tx) => deleteFeed(tx, id));
    return deleted ? c.json(deleted) : c.json({ code: "not_found" as const }, 404);
  })
  .post(
    "/restore",
    validate(
      "json",
      z.object({
        petId: z.number().int(),
        foodId: z.number().int(),
        fedAt: z.coerce.date(),
        servedG: z.number().int().positive(),
        leftoverG: z.number().int().nonnegative().nullable(),
        leftoverReturnedToStock: z.boolean(),
        kcalPerKg: z.number().int().positive(),
      }),
    ),
    (c) => {
      const id = db.transaction((tx) => restoreFeed(tx, c.req.valid("json")));
      return c.json({ id }, 201);
    },
  );
