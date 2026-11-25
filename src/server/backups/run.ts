import type { BACKUP_ERRORS } from "../../shared/enums.js";
import type { Db } from "../db/open.js";
import { settings } from "../db/schema.js";
import { writeBackup } from "./files.js";

type BackupError = (typeof BACKUP_ERRORS)[number];

// Node's file calls fail with errno codes, SQLite's VACUUM INTO with its own.
function errorOf(error: unknown): BackupError {
  const code = error instanceof Error && "code" in error ? error.code : undefined;
  switch (code) {
    case "ENOSPC":
    case "SQLITE_FULL":
      return "disk_full";
    case "EACCES":
    case "EPERM":
    case "EROFS":
    case "SQLITE_CANTOPEN":
    case "SQLITE_READONLY":
      return "cannot_write";
    default:
      return "unknown";
  }
}

/**
 * Writes a backup and records how it went, for the Settings screen. Never
 * throws: it runs from a timer, where an exception would end the process.
 */
export function runBackup(db: Db, dir: string, at: Date): BackupError | null {
  try {
    const keep = db.select({ keep: settings.backupKeep }).from(settings).get()?.keep ?? 1;
    writeBackup(db, dir, at, keep);
    db.update(settings).set({ backupFailedAt: null, backupError: null }).run();
    return null;
  } catch (error) {
    console.error("Backup failed", error);
    const backupError = errorOf(error);
    try {
      db.update(settings).set({ backupFailedAt: at, backupError }).run();
    } catch (recordError) {
      console.error("Could not record the backup failure", recordError);
    }
    return backupError;
  }
}
