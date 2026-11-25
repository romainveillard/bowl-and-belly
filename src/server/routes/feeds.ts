import { Hono } from "hono";
import { z } from "zod";
import { instantAt, latestAt } from "../../shared/app-day.js";
import { db } from "../db/client.js";
import { hasFeedsBefore, daySummaries } from "../feeds/days.js";
import {
  deleteFeed,
  editFromForm,
  logFeedWithLeftover,
  recordLeftover,
  restoreFeed,
} from "../feeds/entries.js";
import { logForm } from "../feeds/logForm.js";
import { daySettings, today } from "../settings.js";
import { grams, kcalPerKg, leftoverGrams, pastInstant, validate } from "../validate.js";

const petQuery = z.object({ petId: z.coerce.number().int() });
const idParam = z.object({ id: z.coerce.number().int() });
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

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
    const form = logForm(db, c.req.valid("query").petId, new Date());
    return form ? c.json(form) : c.json({ code: "not_found" as const }, 404);
  })
  .post(
    "/",
    validate(
      "json",
      z.object({
        petId: z.number().int(),
        foodId: z.number().int(),
        servedG: grams,
        /** "HH:MM" in the app time zone; null is now. */
        time: time.nullable(),
        /** The leftover found from the pet's previous feed, if any. */
        previousLeftover: z
          .object({ entryId: z.number().int(), leftoverG: leftoverGrams })
          .nullable(),
      }),
    ),
    (c) => {
      const body = c.req.valid("json");
      const now = new Date();
      const fedAt = body.time === null ? now : latestAt(body.time, now, daySettings(db).timeZone);
      const result = db.transaction((tx) =>
        logFeedWithLeftover(
          tx,
          { petId: body.petId, foodId: body.foodId, fedAt, servedG: body.servedG },
          body.previousLeftover,
        ),
      );
      if (result === "invalid_leftover") {
        return c.json({ code: "invalid_leftover" as const }, 400);
      }
      if (result === undefined) {
        return c.json({ code: "invalid_reference" as const }, 400);
      }
      return c.json({ id: result }, 201);
    },
  )
  .put(
    "/:id",
    validate("param", idParam),
    validate(
      "json",
      z
        .object({
          foodId: z.number().int(),
          servedG: grams,
          leftoverG: leftoverGrams.nullable(),
          leftoverReturnedToStock: z.boolean(),
          /**
           * The calendar date and clock time in the app time zone, sent only
           * when changed: they hold no seconds, and a repeated autumn hour
           * would be read as its first pass.
           */
          date: z.iso.date().optional(),
          time: time.optional(),
        })
        .refine((body) => (body.date === undefined) === (body.time === undefined), {
          path: ["time"],
        }),
    ),
    (c) => {
      const { id } = c.req.valid("param");
      const { date, time: clock, ...values } = c.req.valid("json");
      const fedAt =
        date === undefined || clock === undefined
          ? null
          : instantAt(date, clock, daySettings(db).timeZone);
      const refused = db.transaction((tx) =>
        editFromForm(tx, id, { ...values, fedAt }, new Date()),
      );
      if (!refused) {
        return c.body(null, 204);
      }
      return c.json({ code: refused }, refused === "not_found" ? 404 : 400);
    },
  )
  .put(
    "/:id/leftover",
    validate("param", idParam),
    validate(
      "json",
      z.object({
        leftoverG: leftoverGrams,
        leftoverReturnedToStock: z.boolean(),
      }),
    ),
    (c) => {
      const { id } = c.req.valid("param");
      const refused = db.transaction((tx) => recordLeftover(tx, id, c.req.valid("json")));
      if (!refused) {
        return c.body(null, 204);
      }
      return c.json({ code: refused }, refused === "not_found" ? 404 : 400);
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
        fedAt: pastInstant,
        servedG: grams,
        leftoverG: leftoverGrams.nullable(),
        leftoverReturnedToStock: z.boolean(),
        kcalPerKg,
      }),
    ),
    (c) => {
      const id = db.transaction((tx) => restoreFeed(tx, c.req.valid("json")));
      return c.json({ id }, 201);
    },
  );
