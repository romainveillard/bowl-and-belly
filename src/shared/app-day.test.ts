import { describe, expect, it } from "vitest";
import { appDayOf, appDayStart } from "./app-day.js";

const utc = (iso: string) => new Date(`${iso}Z`);

describe("appDayOf", () => {
  it("uses the app time zone, not UTC, to pick the calendar day", () => {
    const london = { timeZone: "Europe/London", dayStartsAt: "00:00" };

    expect(appDayOf(utc("2026-06-30T22:59:59"), london)).toBe("2026-06-30");
    expect(appDayOf(utc("2026-06-30T23:00:00"), london)).toBe("2026-07-01");
  });

  it("keeps entries before the day start on the previous day", () => {
    const paris = { timeZone: "Europe/Paris", dayStartsAt: "03:00" };

    expect(appDayOf(utc("2026-01-10T01:59:59"), paris)).toBe("2026-01-09");
    expect(appDayOf(utc("2026-01-10T02:00:00"), paris)).toBe("2026-01-10");
  });

  it("does not start the day early when the clocks skip the start time", () => {
    // London jumps from 01:00 to 02:00 on 29 March 2026, so 01:30 never
    // happens and the day starts at 02:30 BST. 02:10 BST reads as past 01:30
    // on the wall clock but is still the 28th.
    const london = { timeZone: "Europe/London", dayStartsAt: "01:30" };

    expect(appDayOf(utc("2026-03-29T01:10:00"), london)).toBe("2026-03-28");
    expect(appDayOf(utc("2026-03-29T01:30:00"), london)).toBe("2026-03-29");
  });

  it("does not fall back to the previous day when the clocks repeat the start time", () => {
    // London repeats 01:00–02:00 on 25 October 2026. The second 01:15 reads
    // as before 01:30 on the wall clock but comes after the day has started.
    const london = { timeZone: "Europe/London", dayStartsAt: "01:30" };

    expect(appDayOf(utc("2026-10-25T00:29:59"), london)).toBe("2026-10-24");
    expect(appDayOf(utc("2026-10-25T01:15:00"), london)).toBe("2026-10-25");
  });
});

describe("appDayStart", () => {
  it("returns the UTC instant of the day start in the app time zone", () => {
    expect(appDayStart("2026-07-01", { timeZone: "Europe/London", dayStartsAt: "00:00" })).toEqual(
      utc("2026-06-30T23:00:00"),
    );
    expect(appDayStart("2026-01-10", { timeZone: "Europe/Paris", dayStartsAt: "03:00" })).toEqual(
      utc("2026-01-10T02:00:00"),
    );
  });

  it("takes the first occurrence of a repeated start time", () => {
    expect(appDayStart("2026-10-25", { timeZone: "Europe/London", dayStartsAt: "01:30" })).toEqual(
      utc("2026-10-25T00:30:00"),
    );
  });

  it("agrees with appDayOf on every day boundary of a year", () => {
    const timeZones = ["Europe/London", "America/St_Johns", "Australia/Lord_Howe", "Asia/Kolkata"];
    const dayStarts = ["00:00", "01:30", "02:15", "03:00"];

    for (const timeZone of timeZones) {
      for (const dayStartsAt of dayStarts) {
        const settings = { timeZone, dayStartsAt };
        for (let offset = 1; offset <= 366; offset++) {
          const day = new Date(Date.UTC(2026, 0, offset)).toISOString().slice(0, 10);
          const previous = new Date(Date.UTC(2026, 0, offset - 1)).toISOString().slice(0, 10);
          const start = appDayStart(day, settings);

          expect(appDayOf(start, settings), `${day} ${timeZone} ${dayStartsAt}`).toBe(day);
          expect(
            appDayOf(new Date(start.getTime() - 1), settings),
            `before ${day} ${timeZone} ${dayStartsAt}`,
          ).toBe(previous);
        }
      }
    }
  });
});
