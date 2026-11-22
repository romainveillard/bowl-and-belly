import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { z } from "zod";

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
