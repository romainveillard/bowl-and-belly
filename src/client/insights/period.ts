export type Period = "day" | "week" | "month";

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
