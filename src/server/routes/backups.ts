import { createReadStream, fstatSync, mkdtempSync, openSync, rmSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { Hono } from "hono";
import { copyDatabase } from "../backups/files.js";
import { runBackup } from "../backups/run.js";
import { backupDir } from "../backups/scheduler.js";
import { dataDir, db } from "../db/client.js";
import { today } from "../settings.js";

export const backupsRoutes = new Hono()
  .post("/", (c) => {
    const error = runBackup(db, backupDir, new Date());
    return error ? c.json({ code: error }, 500) : c.body(null, 204);
  })
  .get("/download", (c) => {
    // In the data volume, which is writable even when the container isn't,
    // and big enough for a copy of the database.
    const dir = mkdtempSync(path.join(dataDir, ".download-"));
    let fd: number;
    try {
      const file = path.join(dir, "backup.db");
      copyDatabase(db, file);
      fd = openSync(file, "r");
    } finally {
      // The open file stays readable until the stream closes it, so nothing
      // is left behind however the download ends.
      rmSync(dir, { recursive: true, force: true });
    }
    const stream = Readable.toWeb(createReadStream("", { fd }));
    return c.body(stream as ReadableStream, 200, {
      "Content-Type": "application/vnd.sqlite3",
      "Content-Length": String(fstatSync(fd).size),
      "Content-Disposition": `attachment; filename="bowl-and-belly-${today(db)}.db"`,
    });
  });
