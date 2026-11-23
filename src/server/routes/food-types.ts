import { isNull } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/client.js";
import { foodType } from "../db/schema.js";

export const foodTypesRoutes = new Hono().get("/", (c) =>
  c.json(
    db
      .select({ id: foodType.id, systemKey: foodType.systemKey, name: foodType.name })
      .from(foodType)
      .where(isNull(foodType.archivedAt))
      .orderBy(foodType.id)
      .all(),
  ),
);
