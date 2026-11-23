import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Hono } from "hono";
import { copyDatabase } from "../backups/files.js";
import { db } from "../db/client.js";
import { today } from "../settings.js";

export const backupsRoutes = new Hono().get("/download", (c) => {
  const dir = mkdtempSync(path.join(tmpdir(), "bowl-and-belly-"));
  try {
    const file = path.join(dir, "backup.db");
    copyDatabase(db, file);
    const data = readFileSync(file);
    return c.body(data, 200, {
      "Content-Type": "application/vnd.sqlite3",
      "Content-Disposition": `attachment; filename="bowl-and-belly-${today(db)}.db"`,
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
