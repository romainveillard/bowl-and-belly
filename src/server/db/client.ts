import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

const dataDir = process.env.DATA_DIR ?? "data";
mkdirSync(dataDir, { recursive: true });

export const sqlite: Database.Database = new Database(path.join(dataDir, "bowl-and-belly.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema, casing: "snake_case" });
