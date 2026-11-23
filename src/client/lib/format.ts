import type { TFunction } from "i18next";
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

/** "3 Nov", with the year only when it is not `today`'s. Takes "YYYY-MM-DD" or an instant. */
export function formatDay(value: string | Date, today: string, locale: string): string {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  const sameYear = String(date.getFullYear()) === today.slice(0, 4);
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
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

export function petTypeLabel(
  type: { systemKey: "cat" | "dog" | null; name: string | null },
  t: TFunction,
): string {
  return type.systemKey ? t(`petType.${type.systemKey}`) : (type.name ?? "");
}

/** Parses "4.5" or "4,5"; null when it is not a positive number. */
export function parsePositive(text: string): number | null {
  const value = Number(text.trim().replace(",", "."));
  return text.trim() !== "" && Number.isFinite(value) && value > 0 ? value : null;
}
