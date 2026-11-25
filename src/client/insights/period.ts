import { addDays, addMonths } from "../../shared/app-day.js";
import { weekStart } from "../../shared/insights.js";

export type Period = "day" | "week" | "month";

/**
 * The days a period around `from` covers, the days its arrows go to, and
 * whether it is the latest, which has nothing after it yet.
 */
export function periodSpan(period: Period, from: string, today: string) {
  if (period === "day") {
    return {
      start: from,
      end: from,
      previous: addDays(from, -1),
      next: addDays(from, 1),
      atLatest: from === today,
    };
  }
  if (period === "week") {
    const start = weekStart(from);
    return {
      start,
      end: addDays(start, 6),
      previous: addDays(start, -7),
      next: addDays(start, 7),
      atLatest: start === weekStart(today),
    };
  }
  const start = `${from.slice(0, 7)}-01`;
  const next = addMonths(start, 1);
  return {
    start,
    end: addDays(next, -1),
    previous: addMonths(start, -1),
    next,
    atLatest: start === `${today.slice(0, 7)}-01`,
  };
}

const PERIODS: readonly Period[] = ["day", "week", "month"];

/** A real "YYYY-MM-DD" day: 2026-02-30 doesn't come back the same. */
function isDay(text: string): boolean {
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

/**
 * The period and day Insights shows, from its address, "?period=week&from=2026-11-16".
 * Without a period it takes this device's last one; a day that isn't one, or
 * is still to come, as an old or edited link may give, falls back to today.
 */
export function insightsAddress(
  search: URLSearchParams,
  today: string,
  storedPeriod: Period,
): { period: Period; from: string } {
  const asked = search.get("period");
  const from = search.get("from");
  return {
    period: PERIODS.find((period) => period === asked) ?? storedPeriod,
    from: from !== null && isDay(from) && from <= today ? from : today,
  };
}
