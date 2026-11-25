import { and, asc, eq, gte } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { addDays, appDayStart } from "../../shared/app-day.js";
import { db } from "../db/client.js";
import { weightEntry } from "../db/schema.js";
import { daySummaries } from "../feeds/days.js";
import { targetHistory, targetIn } from "../pets/targets.js";
import { daySettings, today } from "../settings.js";
import { validate } from "../validate.js";

/** Without `weightsFrom`, the weight chart looks back this far. */
const WEIGHT_DAYS = 56;
/** Longer ranges would only come from a hand-made request. */
const MAX_RANGE_DAYS = 400;

export const insightsRoutes = new Hono().get(
  "/",
  validate(
    "query",
    z.object({
      petId: z.coerce.number().int(),
      from: z.iso.date(),
      to: z.iso.date(),
      /** The first day of weigh-ins to return, up to now. */
      weightsFrom: z.iso.date().optional(),
    }),
  ),
  (c) => {
    const { petId, from, to, weightsFrom } = c.req.valid("query");
    if (to < from || addDays(from, MAX_RANGE_DAYS) < to) {
      return c.json({ code: "invalid_range" as const }, 400);
    }
    const day = today(db);
    const summaries = new Map(
      daySummaries(db, petId, from, to).map((summary) => [summary.day, summary]),
    );

    // Every day of the range, fed or not, each with the target in force that day.
    const targets = targetHistory(db, petId);
    const days = [];
    for (let date = from; date <= to; date = addDays(date, 1)) {
      const summary = summaries.get(date);
      days.push({
        day: date,
        eatenKcal: summary?.eatenKcal ?? 0,
        targetKcal: targetIn(targets, date)?.kcalPerDay ?? null,
        fed: summary !== undefined,
      });
    }

    const weights = db
      .select({ at: weightEntry.measuredAt, weightG: weightEntry.weightG })
      .from(weightEntry)
      .where(
        and(
          eq(weightEntry.petId, petId),
          gte(
            weightEntry.measuredAt,
            appDayStart(weightsFrom ?? addDays(day, -WEIGHT_DAYS), daySettings(db)),
          ),
        ),
      )
      .orderBy(asc(weightEntry.measuredAt))
      .all()
      .map((reading) => ({ at: reading.at.getTime(), weightG: reading.weightG }));

    return c.json({ today: day, days, weights });
  },
);
