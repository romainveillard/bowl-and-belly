import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { appDayOf, instantAt } from "../../shared/app-day.js";
import { db } from "../db/client.js";
import type { DbOrTx } from "../db/open.js";
import { pet, weightEntry } from "../db/schema.js";
import { weighInPrompt } from "../pets/prompts.js";
import { daySettings, today } from "../settings.js";
import { validate } from "../validate.js";

const idParam = z.object({ id: z.coerce.number().int() });
const reading = z.object({ weightG: z.number().int().positive(), date: z.iso.date() });

function latestId(tx: DbOrTx, petId: number): number | undefined {
  return tx
    .select({ id: weightEntry.id })
    .from(weightEntry)
    .where(eq(weightEntry.petId, petId))
    .orderBy(desc(weightEntry.measuredAt), desc(weightEntry.id))
    .limit(1)
    .get()?.id;
}

/**
 * When a reading dated `date` was taken: now for today, so same-day readings
 * keep their order, and midday for an earlier day.
 */
function measuredOn(date: string): Date {
  return date === today(db) ? new Date() : instantAt(date, "12:00", daySettings(db).timeZone);
}

export const weightsRoutes = new Hono()
  .post("/", validate("json", reading.extend({ petId: z.number().int() })), (c) => {
    const { petId, weightG, date } = c.req.valid("json");
    if (date > today(db)) {
      return c.json({ code: "in_future" as const }, 400);
    }
    const result = db.transaction((tx) => {
      const exists = tx.select({ id: pet.id }).from(pet).where(eq(pet.id, petId)).get();
      if (!exists) {
        return null;
      }
      const { id } = tx
        .insert(weightEntry)
        .values({ petId, weightG, measuredAt: measuredOn(date) })
        .returning({ id: weightEntry.id })
        .get();
      // A backdated reading only joins the history; only the latest can change the target.
      return {
        id,
        prompt: latestId(tx, petId) === id ? weighInPrompt(tx, petId, today(tx)) : null,
      };
    });
    return result ? c.json(result, 201) : c.json({ code: "not_found" as const }, 404);
  })
  .put("/:id", validate("param", idParam), validate("json", reading), (c) => {
    const { id } = c.req.valid("param");
    const { weightG, date } = c.req.valid("json");
    if (date > today(db)) {
      return c.json({ code: "in_future" as const }, 400);
    }
    const result = db.transaction((tx) => {
      const before = tx.select().from(weightEntry).where(eq(weightEntry.id, id)).get();
      if (!before) {
        return null;
      }
      const wasLatest = latestId(tx, before.petId) === id;
      const sameDay =
        appDayOf(before.measuredAt, {
          timeZone: daySettings(tx).timeZone,
          dayStartsAt: "00:00",
        }) === date;
      tx.update(weightEntry)
        .set({ weightG, measuredAt: sameDay ? before.measuredAt : measuredOn(date) })
        .where(eq(weightEntry.id, id))
        .run();
      const isLatest = latestId(tx, before.petId) === id;
      return { prompt: wasLatest || isLatest ? weighInPrompt(tx, before.petId, today(tx)) : null };
    });
    return result ? c.json(result) : c.json({ code: "not_found" as const }, 404);
  })
  .delete("/:id", validate("param", idParam), (c) => {
    const { id } = c.req.valid("param");
    const result = db.transaction((tx) => {
      const before = tx.select().from(weightEntry).where(eq(weightEntry.id, id)).get();
      if (!before) {
        return null;
      }
      const wasLatest = latestId(tx, before.petId) === id;
      tx.delete(weightEntry).where(eq(weightEntry.id, id)).run();
      return {
        deleted: before,
        prompt: wasLatest ? weighInPrompt(tx, before.petId, today(tx)) : null,
      };
    });
    return result ? c.json(result) : c.json({ code: "not_found" as const }, 404);
  })
  .post(
    "/restore",
    validate(
      "json",
      z.object({
        petId: z.number().int(),
        measuredAt: z.coerce.date(),
        weightG: z.number().int().positive(),
      }),
    ),
    (c) => {
      const created = db
        .insert(weightEntry)
        .values(c.req.valid("json"))
        .returning({ id: weightEntry.id })
        .get();
      return c.json({ id: created.id }, 201);
    },
  );
