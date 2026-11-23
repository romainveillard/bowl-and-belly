import path from "node:path";
import { dataDir, db } from "../db/client.js";
import { settings } from "../db/schema.js";
import { writeBackup } from "./files.js";
import { nextBackupAt } from "./schedule.js";

export const backupDir = path.join(dataDir, "backups");

let timer: NodeJS.Timeout | undefined;
let started = false;

// Counting from the slot just run, not the clock, stops a timer that fires a
// moment early from picking the same slot again.
function schedule(after = new Date()): void {
  clearTimeout(timer);
  timer = undefined;
  const row = db.select().from(settings).get();
  if (!row?.backupEnabled) {
    return;
  }
  const at = nextBackupAt(after, {
    frequency: row.backupFrequency,
    weekday: row.backupWeekday,
    time: row.backupTime,
    timeZone: row.timeZone,
  });
  // A weekly wait stays well under setTimeout's 24.8-day limit.
  timer = setTimeout(() => {
    try {
      writeBackup(db, backupDir, at, row.backupKeep);
    } catch (error) {
      console.error("Scheduled backup failed", error);
    }
    schedule(at);
  }, at.getTime() - Date.now());
  timer.unref();
}

export function startBackups(): void {
  started = true;
  schedule();
}

/** Picks up changed settings; does nothing until the server has started the schedule. */
export function rescheduleBackups(): void {
  if (started) {
    schedule();
  }
}
