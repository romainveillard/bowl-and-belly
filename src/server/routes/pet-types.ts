import { isNull } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/client.js";
import { petType } from "../db/schema.js";

export const petTypesRoutes = new Hono().get("/", (c) =>
  c.json(
    db
      .select({ id: petType.id, systemKey: petType.systemKey, name: petType.name })
      .from(petType)
      .where(isNull(petType.archivedAt))
      .orderBy(petType.id)
      .all(),
  ),
);
