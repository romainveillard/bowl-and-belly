import { sql } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import { nextBackupAt } from "../backups/schedule.js";
import type { Db } from "../db/open.js";
import {
  feedEntry,
  food,
  foodType,
  image,
  pet,
  petTarget,
  petType,
  settings,
  weightEntry,
} from "../db/schema.js";
import { seed } from "../db/seed.js";
import { generateDemo } from "./generate.js";

export const demo = process.env.BOWL_DEMO === "true";

// How much a visitor can add between two resets.
const LIMITS = new Map([
  ["/api/pets", 5],
  ["/api/foods", 10],
  ["/api/feeds", 100],
]);
const DISABLED = ["POST /api/images", "POST /api/backups", "GET /api/backups/download"];

const added = new Map<string, number>();

/** Replaces everything with fresh demo data ending now. */
export function resetDemo(db: Db): void {
  db.transaction((tx) => {
    // Children before parents, for the foreign keys.
    for (const table of [feedEntry, weightEntry, petTarget, pet, food, image, petType, foodType]) {
      tx.delete(table).run();
    }
    tx.delete(settings).run();
    // Ids start again from 1, so links into the demo survive a reset.
    tx.run(sql`DELETE FROM sqlite_sequence`);
  });
  seed(db);
  db.transaction((tx) => generateDemo(tx, new Date()));
  added.clear();
}

/** Resets the demo every night at 03:00 in its time zone. */
export function startDemoResets(db: Db): void {
  const schedule = () => {
    const at = nextBackupAt(new Date(), {
      frequency: "daily",
      weekday: null,
      time: "03:00",
      timeZone: "Europe/London",
    });
    setTimeout(() => {
      resetDemo(db);
      schedule();
    }, at.getTime() - Date.now()).unref();
  };
  resetDemo(db);
  schedule();
}

/** Keeps strangers from uploading files, taking backups or filling the database. */
export const demoGuard: MiddlewareHandler = async (c, next) => {
  if (!demo) {
    return next();
  }
  if (DISABLED.includes(`${c.req.method} ${c.req.path}`)) {
    return c.json({ code: "demo_disabled" as const }, 403);
  }
  const limit = c.req.method === "POST" ? LIMITS.get(c.req.path) : undefined;
  const limited = limit === undefined ? null : c.req.path;
  if (limited && limit !== undefined && (added.get(limited) ?? 0) >= limit) {
    return c.json({ code: "demo_limit" as const }, 403);
  }
  await next();
  if (limited && c.res.status === 201) {
    added.set(limited, (added.get(limited) ?? 0) + 1);
  }
};
