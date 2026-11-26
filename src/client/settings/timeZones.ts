/** Every time zone the browser knows, alphabetically, with the one set added if it doesn't. */
export function allZones(current: string): string[] {
  const zones = Intl.supportedValuesOf("timeZone");
  return zones.includes(current) ? zones : [...zones, current].toSorted();
}

/** The device's zone first, then the one set when it differs. */
export function suggestedZones(device: string, current: string): string[] {
  return device === current ? [device] : [device, current];
}

/**
 * The zones whose names hold every word typed, whatever the case, and with
 * spaces, slashes and underscores alike: "new york" finds America/New_York.
 */
export function matchZones(zones: string[], query: string): string[] {
  const words = query
    .toLowerCase()
    .split(/[\s/_]+/)
    .filter(Boolean);
  return zones.filter((zone) => {
    const name = zone.toLowerCase().replaceAll("_", " ");
    return words.every((word) => name.includes(word));
  });
}

/**
 * The zone's offset from GMT at `at`, as the app's language writes it ("GMT+1",
 * "UTC+1"). Intl leaves the number off at zero, so every row gets one, and
 * writes a hyphen where the mock-ups have a minus sign.
 */
export function zoneOffset(zone: string, at: Date, locale: string): string {
  const name =
    new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: "shortOffset" })
      .formatToParts(at)
      .find((part) => part.type === "timeZoneName")?.value ?? "";
  return /^[A-Z]+$/.test(name) ? `${name}+0` : name.replace("-", "−");
}
