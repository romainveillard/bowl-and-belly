const WINDOW_MS = 60_000;
const MAX_FAILURES = 10;

/** Counts failed logins per key over the last minute. */
export function loginLimiter() {
  const failures = new Map<string, number[]>();
  const recent = (key: string, now: number) =>
    (failures.get(key) ?? []).filter((at) => now - at < WINDOW_MS);

  return {
    blocked: (key: string, now: number) => recent(key, now).length >= MAX_FAILURES,
    fail: (key: string, now: number) => {
      // Keyed by client address, entries for clients that never return would pile up.
      for (const other of failures.keys()) {
        if (recent(other, now).length === 0) {
          failures.delete(other);
        }
      }
      failures.set(key, [...recent(key, now), now]);
    },
  };
}
