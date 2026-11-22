import { count, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/client.js";
import { food } from "../db/schema.js";

export const foodsRoutes = new Hono().get("/count", (c) => {
  const row = db.select({ count: count() }).from(food).where(isNull(food.archivedAt)).get();
  return c.json(row?.count ?? 0);
});
