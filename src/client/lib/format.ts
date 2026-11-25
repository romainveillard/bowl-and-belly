import type { TFunction } from "i18next";
import { addDays, appDayOf, type DaySettings } from "../../shared/app-day.js";
import { ageInMonths } from "../../shared/target.js";

/** A reading as entered: trailing zeros stripped, but at least one decimal. */
export function formatReadingKg(weightG: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(weightG / 1000);
}

/** Derived weights (lists, averages) always show one decimal. */
export function formatKg(weightG: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(weightG / 1000);
}

/** "17:50", on the app's clock rather than the device's. */
export function formatTime(instant: string | Date, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(new Date(instant));
}

/**
 * When a backup ran or will run, on the app's clock: "today at 03:30",
 * "tomorrow at 03:30" or "yesterday at 03:30", then "Sunday at 03:30" ahead
 * or "21 Nov at 03:30" behind.
 */
export function formatWhen(
  instant: string | Date,
  options: { now: Date; timeZone: string; future: boolean; locale: string },
  t: TFunction,
): string {
  const { now, timeZone, future, locale } = options;
  const calendar = { timeZone, dayStartsAt: "00:00" };
  const today = appDayOf(now, calendar);
  const day = appDayOf(new Date(instant), calendar);
  const time = formatTime(instant, timeZone, locale);
  if (day === today) {
    return t("settings.when.today", { time });
  }
  if (day === addDays(today, future ? 1 : -1)) {
    return t(future ? "settings.when.tomorrow" : "settings.when.yesterday", { time });
  }
  const date = new Intl.DateTimeFormat(locale, {
    ...(future ? { weekday: "long" } : { day: "numeric", month: "short" }),
    timeZone,
  }).format(new Date(instant));
  return t("settings.when.on", { date, time });
}

const calendarDate = (day: string) => new Date(`${day}T00:00:00Z`);

/** An app day ("YYYY-MM-DD") in words, read as a calendar date so no time zone moves it. */
export function formatAppDay(
  day: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(calendarDate(day));
}

/** A span of app days in words, such as "17–23 Nov". */
export function formatAppDayRange(
  start: string,
  end: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).formatRange(
    calendarDate(start),
    calendarDate(end),
  );
}

/** "2026-11-21", the calendar date on the app's clock, as a date input wants it. */
export function formatDateInput(instant: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(new Date(instant));
}

/** "3 Nov" for an app day, "YYYY-MM-DD", with the year only when it is not `today`'s. */
export function formatDay(day: string, today: string, locale: string): string {
  const date = new Date(`${day}T00:00:00`);
  const sameYear = String(date.getFullYear()) === today.slice(0, 4);
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
}

/**
 * formatDay for an instant, such as when a weigh-in was taken, on the app day
 * it falls in: the device's own time zone could put it a day off.
 */
export function formatInstantDay(
  instant: string | Date,
  settings: DaySettings,
  today: string,
  locale: string,
): string {
  return formatDay(appDayOf(new Date(instant), settings), today, locale);
}

/** "since 3 Nov", or "since today". */
export function formatSince(day: string, today: string, locale: string, t: TFunction): string {
  return day === today
    ? t("date.sinceToday")
    : t("date.since", { date: formatDay(day, today, locale) });
}

interface Age {
  birthDate: string;
  birthDatePrecision: "exact" | "year" | "estimated";
}

/** "3", "about 6", or months for a pet under a year old. */
export function formatAge(pet: Age, today: string, t: TFunction): string {
  const months = ageInMonths(pet.birthDate, today);
  const age = months < 12 ? t("age.months", { count: months }) : String(Math.floor(months / 12));
  return pet.birthDatePrecision === "exact" ? age : t("age.about", { age });
}

/** Parses "4.5" or "4,5"; null when it is not a positive number. */
export function parsePositive(text: string): number | null {
  const value = Number(text.trim().replace(",", "."));
  return text.trim() !== "" && Number.isFinite(value) && value > 0 ? value : null;
}
