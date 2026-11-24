import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { appDayOf } from "../../shared/app-day.js";
import { db } from "../db/client.js";
import type { DbOrTx } from "../db/open.js";
import { pet, weightEntry } from "../db/schema.js";
import { weighInPrompt } from "../pets/prompts.js";
import { daySettings, today } from "../settings.js";
import { grams, validate } from "../validate.js";
import { measuredOn } from "../weights/readings.js";

const idParam = z.object({ id: z.coerce.number().int() });
const reading = z.object({ weightG: grams, date: z.iso.date() });

function latestId(tx: DbOrTx, petId: number): number | undefined {
  return tx
    .select({ id: weightEntry.id })
    .from(weightEntry)
    .where(eq(weightEntry.petId, petId))
    .orderBy(desc(weightEntry.measuredAt), desc(weightEntry.id))
    .limit(1)
    .get()?.id;
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
        .values({ petId, weightG, measuredAt: measuredOn(date, new Date(), daySettings(tx)) })
        .returning({ id: weightEntry.id })
        .get();
      // A backdated reading only joins the history; only the latest can change the target.
      return {
        id,
        prompt: latestId(tx, petId) === id ? weighInPrompt(tx, petId, today(tx)) : null,
      };
    });
    return result ? c.json(result, 201) : c.json({ code: "invalid_reference" as const }, 400);
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
      const settings = daySettings(tx);
      const measuredAt =
        appDayOf(before.measuredAt, settings) === date
          ? before.measuredAt
          : measuredOn(date, new Date(), settings);
      tx.update(weightEntry).set({ weightG, measuredAt }).where(eq(weightEntry.id, id)).run();
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
        weightG: grams,
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
