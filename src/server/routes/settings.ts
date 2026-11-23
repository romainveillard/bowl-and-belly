import { Hono } from "hono";
import { z } from "zod";
import { BACKUP_FREQUENCIES } from "../../shared/enums.js";
import { latestBackupAt } from "../backups/files.js";
import { backupDir, nextScheduledBackup, rescheduleBackups } from "../backups/scheduler.js";
import { db } from "../db/client.js";
import { settings } from "../db/schema.js";
import { validate } from "../validate.js";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

function isTimeZone(value: string): boolean {
  try {
    return new Intl.DateTimeFormat("en", { timeZone: value }).resolvedOptions().timeZone !== "";
  } catch {
    return false;
  }
}

const settingsBody = z
  .object({
    timeZone: z.string().refine(isTimeZone),
    dayStartsAt: time,
    backupEnabled: z.boolean(),
    backupFrequency: z.enum(BACKUP_FREQUENCIES),
    backupWeekday: z.number().int().min(1).max(7).nullable(),
    backupTime: time,
    backupKeep: z.number().int().min(1).max(999),
  })
  .refine((body) => body.backupFrequency !== "weekly" || body.backupWeekday !== null, {
    path: ["backupWeekday"],
  });

const shown = {
  timeZone: settings.timeZone,
  dayStartsAt: settings.dayStartsAt,
  backupEnabled: settings.backupEnabled,
  backupFrequency: settings.backupFrequency,
  backupWeekday: settings.backupWeekday,
  backupTime: settings.backupTime,
  backupKeep: settings.backupKeep,
  backupFailedAt: settings.backupFailedAt,
  backupError: settings.backupError,
};

export const settingsRoutes = new Hono()
  .get("/", (c) => {
    const row = db.select(shown).from(settings).get();
    if (!row) {
      throw new Error("The settings row is missing");
    }
    return c.json({
      ...row,
      lastBackupAt: latestBackupAt(backupDir),
      nextBackupAt: nextScheduledBackup(),
    });
  })
  .put("/", validate("json", settingsBody), (c) => {
    db.update(settings).set(c.req.valid("json")).run();
    rescheduleBackups();
    return c.body(null, 204);
  });
