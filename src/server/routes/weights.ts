import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/client.js";
import { weightEntry } from "../db/schema.js";
import { today } from "../settings.js";
import { grams, validate } from "../validate.js";
import { deleteReading, editReading, logReading } from "../weights/readings.js";

const idParam = z.object({ id: z.coerce.number().int() });
const reading = z.object({ weightG: grams, date: z.iso.date() });

export const weightsRoutes = new Hono()
  .post("/", validate("json", reading.extend({ petId: z.number().int() })), (c) => {
    const body = c.req.valid("json");
    if (body.date > today(db)) {
      return c.json({ code: "in_future" as const }, 400);
    }
    const result = db.transaction((tx) => logReading(tx, body, new Date()));
    return result ? c.json(result, 201) : c.json({ code: "invalid_reference" as const }, 400);
  })
  .put("/:id", validate("param", idParam), validate("json", reading), (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    if (body.date > today(db)) {
      return c.json({ code: "in_future" as const }, 400);
    }
    const result = db.transaction((tx) => editReading(tx, id, body, new Date()));
    return result ? c.json(result) : c.json({ code: "not_found" as const }, 404);
  })
  .delete("/:id", validate("param", idParam), (c) => {
    const { id } = c.req.valid("param");
    const result = db.transaction((tx) => deleteReading(tx, id, new Date()));
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
