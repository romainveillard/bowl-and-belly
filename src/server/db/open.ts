import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema.js";
import { removeUnusedImages } from "./images.js";
import { seed } from "./seed.js";

export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database };

/** A database handle or a transaction on it. */
export type DbOrTx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

export function openDatabase(filename: string): Db {
  const sqlite = new Database(filename);
  sqlite.pragma("journal_mode = WAL");

  const db = drizzle(sqlite, { schema, casing: "snake_case" });

  // Drizzle Kit rebuilds a table to change it, which only works with foreign
  // keys off, and the PRAGMA in its SQL is ignored inside the migrator's
  // transaction. So enforcement is switched around the migrations instead.
  sqlite.pragma("foreign_keys = OFF");
  migrate(db, { migrationsFolder: "drizzle" });
  sqlite.pragma("foreign_keys = ON");
  if (sqlite.prepare("PRAGMA foreign_key_check").all().length > 0) {
    throw new Error("Migrations left broken foreign keys");
  }

  seed(db);
  removeUnusedImages(db);

  return db;
}
