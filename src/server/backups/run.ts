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

/** Writes a backup and records how it went, for the Settings screen. */
export function runBackup(db: Db, dir: string, at: Date): BackupError | null {
  const keep = db.select({ keep: settings.backupKeep }).from(settings).get()?.keep ?? 1;
  try {
    writeBackup(db, dir, at, keep);
  } catch (error) {
    console.error("Backup failed", error);
    const backupError = errorOf(error);
    db.update(settings).set({ backupFailedAt: at, backupError }).run();
    return backupError;
  }
  db.update(settings).set({ backupFailedAt: null, backupError: null }).run();
  return null;
}
