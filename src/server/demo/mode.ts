import { count, sql } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
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

// How many rows all visitors together can add to a table between two resets.
const PETS = { table: pet, limit: 10 };
const FOODS = { table: food, limit: 30 };
const FEEDS = { table: feedEntry, limit: 500 };
const WEIGH_INS = { table: weightEntry, limit: 200 };
const PET_TYPES = { table: petType, limit: 10 };
const FOOD_TYPES = { table: foodType, limit: 10 };

/** The limited tables a request can add rows to, whichever route it takes. */
function addsTo(method: string, path: string): { table: SQLiteTable; limit: number }[] {
  if (method === "PUT" && /^\/api\/pets\/\d+$/.test(path)) {
    // The pet form logs a weigh-in when the weight changes.
    return [WEIGH_INS];
  }
  if (method !== "POST") {
    return [];
  }
  switch (path) {
    case "/api/pets":
      return [PETS, WEIGH_INS];
    case "/api/foods":
      return [FOODS];
    case "/api/feeds":
    case "/api/feeds/restore":
      return [FEEDS];
    case "/api/weights":
    case "/api/weights/restore":
      return [WEIGH_INS];
    case "/api/pet-types":
      return [PET_TYPES];
    case "/api/food-types":
      return [FOOD_TYPES];
    default:
      return [];
  }
}

// Settings are shared by every visitor, so none of them can change.
const DISABLED = [
  "POST /api/images",
  "POST /api/backups",
  "GET /api/backups/download",
  "PUT /api/settings",
];

/** Rows in each limited table just after the last reset. */
const atReset = new Map<SQLiteTable, number>();

const rowsIn = (db: Db, table: SQLiteTable) =>
  db.select({ rows: count() }).from(table).get()?.rows ?? 0;

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
  for (const { table } of [PETS, FOODS, FEEDS, WEIGH_INS, PET_TYPES, FOOD_TYPES]) {
    atReset.set(table, rowsIn(db, table));
  }
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

/**
 * Keeps strangers from uploading files, taking backups or filling the
 * database. Limits count rows rather than requests, so every route that adds
 * to a table counts against it.
 */
export function demoGuard(db: Db): MiddlewareHandler {
  // Requests let through whose rows aren't written yet. A slow body keeps a
  // request waiting between the check and the write, and parallel ones must
  // not all pass the check meanwhile.
  const inFlight = new Map<SQLiteTable, number>();
  const pending = (table: SQLiteTable) => inFlight.get(table) ?? 0;

  return async (c, next) => {
    // Hono answers HEAD with the GET handler, which runs in full.
    const method = c.req.method === "HEAD" ? "GET" : c.req.method;
    if (DISABLED.includes(`${method} ${c.req.path}`)) {
      return c.json({ code: "demo_disabled" as const }, 403);
    }
    const tables = addsTo(c.req.method, c.req.path);
    const full = tables.some(
      ({ table, limit }) => rowsIn(db, table) - (atReset.get(table) ?? 0) + pending(table) >= limit,
    );
    if (full) {
      return c.json({ code: "demo_limit" as const }, 403);
    }
    for (const { table } of tables) {
      inFlight.set(table, pending(table) + 1);
    }
    try {
      await next();
    } finally {
      for (const { table } of tables) {
        inFlight.set(table, pending(table) - 1);
      }
    }
    return undefined;
  };
}
