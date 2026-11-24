import { addDays, appDayOf, appDayStart, type DaySettings } from "../../shared/app-day.js";

/**
 * When a reading dated `date` (an app day) was taken: now for today, so
 * same-day readings keep their order, and halfway through an earlier day, so
 * it falls on that day whatever time the day starts.
 */
export function measuredOn(date: string, now: Date, settings: DaySettings): Date {
  if (date === appDayOf(now, settings)) {
    return now;
  }
  const start = appDayStart(date, settings).getTime();
  const end = appDayStart(addDays(date, 1), settings).getTime();
  return new Date((start + end) / 2);
}
