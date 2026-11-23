import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { openDatabase } from "../db/open.js";
import { generateDemo } from "./generate.js";

const dataDir = process.env.DATA_DIR ?? "data-demo";
const file = path.join(dataDir, "bowl-and-belly.db");

mkdirSync(dataDir, { recursive: true });
for (const suffix of ["", "-wal", "-shm"]) {
  rmSync(file + suffix, { force: true });
}
const db = openDatabase(file);
db.transaction((tx) => generateDemo(tx, new Date()));
db.$client.close();
console.log(`Demo data written to ${file}`);
