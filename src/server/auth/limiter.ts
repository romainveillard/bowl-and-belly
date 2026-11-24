const WINDOW_MS = 60_000;
const MAX_FAILURES = 10;
// Addresses are cheap to change, so all clients together have a ceiling too.
const MAX_FAILURES_OVERALL = 100;

/**
 * The client a login attempt counts against. One IPv6 subscriber usually has
 * a whole /64 to pick addresses from, so the /64 is the client.
 */
export function clientOf(address: string): string {
  if (!address.includes(":")) {
    return address;
  }
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped?.[1]) {
    return mapped[1];
  }
  const [head = "", tail] = address.toLowerCase().split("::");
  const start = head === "" ? [] : head.split(":");
  const end = tail === undefined || tail === "" ? [] : tail.split(":");
  const zeros = tail === undefined ? [] : Array<string>(8 - start.length - end.length).fill("0");
  const groups = [...start, ...zeros, ...end].slice(0, 4);
  return `${groups.map((group) => group.replace(/^0+(?=.)/, "")).join(":")}::/64`;
}

/** Counts failed logins per client, and across all clients, over the last minute. */
export function loginLimiter() {
  const failures = new Map<string, number[]>();
  let overall: number[] = [];
  const recent = (key: string, now: number) =>
    (failures.get(key) ?? []).filter((at) => now - at < WINDOW_MS);

  return {
    blocked: (key: string, now: number) => {
      overall = overall.filter((at) => now - at < WINDOW_MS);
      return overall.length >= MAX_FAILURES_OVERALL || recent(key, now).length >= MAX_FAILURES;
    },
    fail: (key: string, now: number) => {
      // Keyed by client address, entries for clients that never return would
      // pile up. The overall ceiling keeps this scan short.
      for (const other of failures.keys()) {
        if (recent(other, now).length === 0) {
          failures.delete(other);
        }
      }
      failures.set(key, [...recent(key, now), now]);
      overall.push(now);
    },
  };
}
