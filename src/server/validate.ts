import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import { z } from "zod";

// Far beyond any real pet or bag of food, but small enough that daily totals
// and stock sums stay exact and readable.
const MAX_GRAMS = 1_000_000;

/** A served amount, weigh-in, portion or restock. */
export const grams = z.number().int().positive().max(MAX_GRAMS);
export const leftoverGrams = z.number().int().nonnegative().max(MAX_GRAMS);
/** Stock may run below zero, when more is logged than was entered. */
export const stockGrams = z
  .number()
  .int()
  .min(-10 * MAX_GRAMS)
  .max(10 * MAX_GRAMS);
/** Pure fat is about 9,000 kcal per kg. */
export const kcalPerKg = z.number().int().positive().max(10_000);
export const kcalPerDay = z.number().int().positive().max(20_000);
/** An instant as the API sends it back for an undo: an ISO date-time, never in the future. */
export const pastInstant = z.iso
  .datetime()
  .transform((value) => new Date(value))
  .refine((date) => date.getTime() <= Date.now());

/** Zod validation that answers with a code and the offending fields, never Zod's sentences. */
export const validate = <Target extends keyof ValidationTargets, Schema extends z.ZodType>(
  target: Target,
  schema: Schema,
) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          code: "invalid_request" as const,
          fields: result.error.issues.map((issue) => issue.path.join(".")),
        },
        400,
      );
    }
    return undefined;
  });
