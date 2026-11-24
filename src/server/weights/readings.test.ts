import { describe, expect, it } from "vitest";
import { appDayOf } from "../../shared/app-day.js";
import { measuredOn } from "./readings.js";

const utc = (iso: string) => new Date(`${iso}Z`);

describe("measuredOn", () => {
  it("keeps the time for a reading dated today, before the calendar day has caught up", () => {
    // 01:00 on the 25th is still the 24th when the day starts at 03:00.
    const settings = { timeZone: "UTC", dayStartsAt: "03:00" };
    const now = utc("2026-11-25T01:00:00");

    expect(measuredOn("2026-11-24", now, settings)).toEqual(now);
  });

  it("puts an earlier reading on its own app day when the day starts late", () => {
    // Midday on the clock would belong to the previous app day here.
    const settings = { timeZone: "Europe/London", dayStartsAt: "23:00" };
    const measured = measuredOn("2026-11-20", utc("2026-11-25T09:00:00"), settings);

    expect(appDayOf(measured, settings)).toBe("2026-11-20");
  });

  it("stays inside a day the clocks shorten", () => {
    const settings = { timeZone: "Europe/London", dayStartsAt: "00:00" };
    const measured = measuredOn("2026-03-29", utc("2026-04-02T09:00:00"), settings);

    expect(measured).toEqual(utc("2026-03-29T11:30:00"));
    expect(appDayOf(measured, settings)).toBe("2026-03-29");
  });
});
