import i18next from "i18next";
import ICU from "i18next-icu";
import { describe, expect, it, vi } from "vitest";
import enGB from "../i18n/locales/en-GB.json" with { type: "json" };
import { formatAppDay, formatAppDayRange, formatWhen } from "./format.js";

const i18n = i18next.createInstance();
await i18n.use(ICU).init({ lng: "en-GB", resources: { "en-GB": { translation: enGB } } });

// Wednesday 25 November, 23:30 in London.
const now = new Date("2026-11-25T23:30:00Z");
const london = (future: boolean) => ({ now, timeZone: "Europe/London", future, locale: "en-GB" });

describe("formatAppDay", () => {
  it("shows the same day on a device west of UTC", () => {
    vi.stubEnv("TZ", "America/Los_Angeles");
    try {
      // Midnight UTC is the previous evening in Los Angeles, so a formatter
      // without the UTC time zone would show the 24th.
      expect(new Date("2026-11-25T00:00:00Z").getDate()).toBe(24);

      expect(formatAppDay("2026-11-25", "en-GB", { day: "numeric", month: "short" })).toBe(
        "25 Nov",
      );
      expect(
        formatAppDayRange("2026-11-23", "2026-11-29", "en-GB", { day: "numeric", month: "short" }),
      ).toMatch(/^23\D+29 Nov$/);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("formatWhen", () => {
  it("names today, tomorrow and yesterday by the app's clock", () => {
    expect(formatWhen("2026-11-25T03:30:00Z", london(false), i18n.t)).toContain("today");
    expect(formatWhen("2026-11-26T03:30:00Z", london(true), i18n.t)).toContain("tomorrow");
    expect(formatWhen("2026-11-24T03:30:00Z", london(false), i18n.t)).toContain("yesterday");
  });

  it("uses the app's time zone, not the device's, for the day and the time", () => {
    // It is already the 26th in Paris, so the 25th there is yesterday.
    const paris = { ...london(false), timeZone: "Europe/Paris" };

    expect(formatWhen("2026-11-25T22:45:00Z", london(false), i18n.t)).toBe("today at 22:45");
    expect(formatWhen("2026-11-25T22:45:00Z", paris, i18n.t)).toBe("yesterday at 23:45");
  });

  it("gives the weekday ahead and the date behind", () => {
    expect(formatWhen("2026-11-29T03:30:00Z", london(true), i18n.t)).toContain("Sunday");
    expect(formatWhen("2026-11-21T03:30:00Z", london(false), i18n.t)).toContain("21 Nov");
  });
});
