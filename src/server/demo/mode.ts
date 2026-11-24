import { count, sql } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import type { MiddlewareHandler } from "hono";
import { routePath } from "hono/route";
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

// Every POST, PUT and PATCH route, keyed by its registered pattern, must be in
// exactly one of the three lists below. A route that adds rows needs mapping
// to the tables it adds to, or visitors could use it to get past the limits;
// mode.test.ts fails for a route that isn't listed.

/** Refused outright: settings are shared by every visitor, and files and backups aren't for strangers. */
export const DISABLED = new Set([
  "POST /api/images",
  "POST /api/backups",
  "GET /api/backups/download",
  "PUT /api/settings",
]);

/** The limited tables each route can add rows to. */
export const ADDS_ROWS = new Map<string, { table: SQLiteTable; limit: number }[]>([
  ["POST /api/pets", [PETS, WEIGH_INS]],
  // The pet form logs a weigh-in when the weight changes.
  ["PUT /api/pets/:id", [WEIGH_INS]],
  ["POST /api/foods", [FOODS]],
  ["POST /api/feeds", [FEEDS]],
  ["POST /api/feeds/restore", [FEEDS]],
  ["POST /api/weights", [WEIGH_INS]],
  ["POST /api/weights/restore", [WEIGH_INS]],
  ["POST /api/pet-types", [PET_TYPES]],
  ["POST /api/food-types", [FOOD_TYPES]],
]);

/** Routes that write but never add a row to a limited table. */
export const ADDS_NO_ROWS = new Set([
  "POST /api/auth/login",
  "POST /api/auth/logout",
  "POST /api/pets/:id/age-prompt",
  "PUT /api/pets/:id/target",
  "POST /api/pets/:id/archive",
  "POST /api/pets/:id/restore",
  "PUT /api/pet-types/:id",
  "POST /api/pet-types/:id/archive",
  "POST /api/pet-types/:id/restore",
  "PUT /api/foods/:id",
  "POST /api/foods/:id/restock",
  "POST /api/foods/:id/archive",
  "POST /api/foods/:id/restore",
  "PUT /api/food-types/:id",
  "POST /api/food-types/:id/archive",
  "POST /api/food-types/:id/restore",
  "PUT /api/feeds/:id",
  "PUT /api/feeds/:id/leftover",
  "PUT /api/weights/:id",
]);

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
    // The pattern of the route the request reached, such as "/api/pets/:id".
    const route = `${method} ${routePath(c, -1)}`;
    if (DISABLED.has(route)) {
      return c.json({ code: "demo_disabled" as const }, 403);
    }
    const tables = ADDS_ROWS.get(route) ?? [];
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
