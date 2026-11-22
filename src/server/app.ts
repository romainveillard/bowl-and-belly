import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "./db/client.js";

const api = new Hono().get("/health", (c) => {
  db.run(sql`select 1`);
  return c.json({ status: "ok" as const });
});

export const app = new Hono().route("/api", api);

export type AppType = typeof app;
