import { mkdirSync } from "node:fs";
import path from "node:path";
import { openDatabase, type Db } from "./open.js";

export const dataDir = process.env.DATA_DIR ?? "data";
mkdirSync(dataDir, { recursive: true });

export const db: Db = openDatabase(path.join(dataDir, "bowl-and-belly.db"));
