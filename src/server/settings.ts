import { appDayOf, type DaySettings } from "../shared/app-day.js";
import type { DbOrTx } from "./db/open.js";
import { settings } from "./db/schema.js";

export function daySettings(db: DbOrTx): DaySettings {
  const row = db
    .select({ timeZone: settings.timeZone, dayStartsAt: settings.dayStartsAt })
    .from(settings)
    .get();
  if (!row) {
    throw new Error("The settings row is missing");
  }
  return row;
}

export function today(db: DbOrTx): string {
  return appDayOf(new Date(), daySettings(db));
}
