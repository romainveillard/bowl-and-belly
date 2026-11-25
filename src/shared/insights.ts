import { addDays } from "./app-day.js";

export interface DayIntake {
  /** App day, "YYYY-MM-DD". */
  day: string;
  eatenKcal: number;
  targetKcal: number | null;
  /** Whether anything was logged that day; an unlogged day is not a day of fasting. */
  fed: boolean;
}

interface PeriodIntake {
  /** First day of the week (a Monday) or of the month. */
  start: string;
  /** Average daily kcal over the days counted, or null when none counts. */
  averageKcal: number | null;
  /** Average daily target over the same days. */
  targetKcal: number | null;
  /** How many days the average is over. */
  days: number;
}

/** The Monday that starts the week of `day`. */
export function weekStart(day: string): string {
  // getUTCDay: 0 is Sunday; Monday-based weeks put Sunday last.
  const weekday = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(day, -weekday);
}

function monthStart(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

const average = (values: number[]) =>
  values.length === 0
    ? null
    : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

/**
 * Average daily intake per week or month. Only days with at least one feed
 * count, and today is left out while it is still going, so a half-logged
 * day never drags an average down.
 */
export function periodIntake(
  days: DayIntake[],
  period: "week" | "month",
  today: string,
): PeriodIntake[] {
  const groups = new Map<string, DayIntake[]>();
  for (const day of days) {
    const start = period === "week" ? weekStart(day.day) : monthStart(day.day);
    groups.set(start, [...(groups.get(start) ?? []), day]);
  }
  return [...groups.entries()]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([start, group]) => {
      const counted = group.filter((day) => day.fed && day.day !== today);
      const targets = counted.flatMap((day) => (day.targetKcal === null ? [] : [day.targetKcal]));
      return {
        start,
        averageKcal: average(counted.map((day) => day.eatenKcal)),
        targetKcal: average(targets),
        days: counted.length,
      };
    });
}

/** The Week view's weight chart: the last 8 weeks, today included. */
export const WEIGHT_CHART_DAYS = 56;

export interface Reading {
  /** Milliseconds since the epoch. */
  at: number;
  weightG: number;
}

const DAY_MS = 86_400_000;

/**
 * For each reading, the average of the readings taken in the `windowDays`
 * days up to and including it. Readings come in any order and go out oldest
 * first.
 */
export function rollingAverage(
  readings: Reading[],
  windowDays = 7,
): (Reading & { averageG: number })[] {
  const sorted = readings.toSorted((a, b) => a.at - b.at);
  return sorted.map((reading) => {
    const inWindow = sorted.filter(
      (other) => other.at <= reading.at && other.at > reading.at - windowDays * DAY_MS,
    );
    return {
      ...reading,
      averageG: average(inWindow.map((other) => other.weightG)) ?? reading.weightG,
    };
  });
}
