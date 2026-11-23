export interface DaySettings {
  /** IANA time zone, e.g. "Europe/London". */
  timeZone: string;
  /** "HH:MM" in the app time zone. */
  dayStartsAt: string;
}

const DAY_MS = 86_400_000;

const formatters = new Map<string, Intl.DateTimeFormat>();

/** The wall-clock reading in `timeZone`, expressed as if it were a UTC timestamp. */
function wallClock(instant: number, timeZone: string): number {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, number>> = {};
  for (const part of formatter.formatToParts(instant)) {
    parts[part.type] = Number(part.value);
  }
  return Date.UTC(
    parts.year ?? 0,
    (parts.month ?? 1) - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
}

function offsetAt(instant: number, timeZone: string): number {
  return wallClock(instant, timeZone) - Math.floor(instant / 1000) * 1000;
}

export function addDays(day: string, days: number): string {
  return new Date(Date.parse(day) + days * DAY_MS).toISOString().slice(0, 10);
}

function minutesOf(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** The UTC instant at which the app day `day` ("YYYY-MM-DD") begins. */
export function appDayStart(day: string, settings: DaySettings): Date {
  const wall = Date.parse(day) + minutesOf(settings.dayStartsAt) * 60_000;
  const candidates = [
    wall - offsetAt(wall - DAY_MS, settings.timeZone),
    wall - offsetAt(wall + DAY_MS, settings.timeZone),
  ];
  const exact = candidates.filter((candidate) => wallClock(candidate, settings.timeZone) === wall);
  // A start time repeated by a clock change takes its first occurrence; one
  // skipped by a clock change moves forward by the length of the gap. This
  // matches Temporal's "compatible" disambiguation.
  return new Date(exact.length > 0 ? Math.min(...exact) : Math.max(...candidates));
}

/** The app day ("YYYY-MM-DD") that `instant` belongs to. */
export function appDayOf(instant: Date, settings: DaySettings): string {
  const shifted =
    wallClock(instant.getTime(), settings.timeZone) - minutesOf(settings.dayStartsAt) * 60_000;
  const day = new Date(shifted).toISOString().slice(0, 10);
  // Around a clock change the wall clock alone can put an instant on the wrong
  // side of a day start, so the actual start instants have the last word.
  if (instant < appDayStart(day, settings)) {
    return addDays(day, -1);
  }
  const next = addDays(day, 1);
  return instant >= appDayStart(next, settings) ? next : day;
}

/** The instant the clock in `timeZone` read `time` ("HH:MM") on `date` ("YYYY-MM-DD"). */
export function instantAt(date: string, time: string, timeZone: string): Date {
  return appDayStart(date, { timeZone, dayStartsAt: time });
}

/**
 * The most recent instant, at or before `now`, when the clock in the app time
 * zone read `time` ("HH:MM"). A feed logged at 00:10 for 23:50 lands on the
 * previous evening, not in the future.
 */
export function latestAt(time: string, now: Date, timeZone: string): Date {
  const today = appDayOf(now, { timeZone, dayStartsAt: "00:00" });
  const candidate = instantAt(today, time, timeZone);
  return candidate <= now ? candidate : instantAt(addDays(today, -1), time, timeZone);
}
