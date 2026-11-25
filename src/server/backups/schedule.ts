import { addDays, appDayOf, instantAt } from "../../shared/app-day.js";
import type { BACKUP_FREQUENCIES } from "../../shared/enums.js";

interface BackupSchedule {
  frequency: (typeof BACKUP_FREQUENCIES)[number];
  /** ISO weekday, 1 is Monday; only read for weekly backups. */
  weekday: number | null;
  /** "HH:MM" in `timeZone`. */
  time: string;
  timeZone: string;
}

function isoWeekday(day: string): number {
  return new Date(day).getUTCDay() || 7;
}

/** The first moment strictly after `after` when the schedule's clock time comes round. */
export function nextBackupAt(after: Date, schedule: BackupSchedule): Date {
  const calendarDay = appDayOf(after, { timeZone: schedule.timeZone, dayStartsAt: "00:00" });
  // A week and a day covers a weekly slot that has already passed today.
  for (let offset = 0; offset <= 7; offset++) {
    const day = addDays(calendarDay, offset);
    if (schedule.frequency === "weekly" && isoWeekday(day) !== schedule.weekday) {
      continue;
    }
    const at = instantAt(day, schedule.time, schedule.timeZone);
    if (at > after) {
      return at;
    }
  }
  throw new Error("No backup slot within eight days");
}
