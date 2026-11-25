import type { QueryClient } from "@tanstack/react-query";

/**
 * The cached data each kind of write can change, by the first part of its
 * query key. Cached data stays fresh for a while without refetching, so a
 * screen not listed here shows stale data after the write: a day's totals and
 * targets live under "feeds" (Insights and weigh-in charts too), Log feed's
 * foods, kcal and stock under "log-form", and the Pets list's eaten-today
 * under "pets".
 */
export const AFFECTED = {
  feed: ["feeds", "pets", "foods", "log-form"],
  weighIn: ["pets", "feeds"],
  pet: ["pets", "feeds", "log-form"],
  food: ["foods", "feeds", "pets", "log-form"],
  foodType: ["food-types", "foods", "feeds", "log-form"],
  petType: ["pet-types", "pets", "foods", "feeds", "log-form"],
} as const;

/** Marks everything under these keys stale, refetching what is on screen. */
export function refresh(queryClient: QueryClient, keys: readonly string[]) {
  return Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
}
