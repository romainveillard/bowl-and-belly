import { describe, expect, it } from "vitest";
import { nextBackupAt } from "./schedule.js";

const daily = {
  frequency: "daily",
  weekday: null,
  time: "03:30",
  timeZone: "Europe/London",
} as const;
// 2026-11-25 is a Wednesday.
const wednesdays = { ...daily, frequency: "weekly", weekday: 3 } as const;

describe("nextBackupAt", () => {
  it("runs later today when the time has not come yet", () => {
    expect(nextBackupAt(new Date("2026-11-23T01:00:00Z"), daily)).toEqual(
      new Date("2026-11-23T03:30:00Z"),
    );
  });

  it("moves to tomorrow once today's run is due or past", () => {
    expect(nextBackupAt(new Date("2026-11-23T03:30:00Z"), daily)).toEqual(
      new Date("2026-11-24T03:30:00Z"),
    );
  });

  it("reads the time in the app time zone, not UTC", () => {
    // 03:30 in Paris is 02:30 UTC in winter; at 02:45 UTC today's run is gone.
    expect(
      nextBackupAt(new Date("2026-11-23T02:45:00Z"), { ...daily, timeZone: "Europe/Paris" }),
    ).toEqual(new Date("2026-11-24T02:30:00Z"));
  });

  it("uses the local date, which can be a day ahead of UTC", () => {
    // 23:00 UTC on the 23rd is already 10:00 on the 24th in Sydney.
    expect(
      nextBackupAt(new Date("2026-11-23T23:00:00Z"), {
        ...daily,
        time: "09:00",
        timeZone: "Australia/Sydney",
      }),
    ).toEqual(new Date("2026-11-24T22:00:00Z"));
  });

  it("waits for the chosen weekday", () => {
    expect(nextBackupAt(new Date("2026-11-23T12:00:00Z"), wednesdays)).toEqual(
      new Date("2026-11-25T03:30:00Z"),
    );
  });

  it("goes a full week ahead when this week's slot has just passed", () => {
    expect(nextBackupAt(new Date("2026-11-25T04:00:00Z"), wednesdays)).toEqual(
      new Date("2026-12-02T03:30:00Z"),
    );
  });

  it("still runs when the clocks skip the time, an hour later", () => {
    // London skips 01:00–02:00 on 29 March 2026, so 01:30 becomes 02:30 BST.
    expect(nextBackupAt(new Date("2026-03-28T12:00:00Z"), { ...daily, time: "01:30" })).toEqual(
      new Date("2026-03-29T01:30:00Z"),
    );
  });

  it("runs once when the clocks repeat the time", () => {
    // London repeats 01:00–02:00 on 25 October 2026; the first 01:30 is 00:30 UTC.
    const first = nextBackupAt(new Date("2026-10-24T12:00:00Z"), { ...daily, time: "01:30" });
    expect(first).toEqual(new Date("2026-10-25T00:30:00Z"));
    expect(nextBackupAt(first, { ...daily, time: "01:30" })).toEqual(
      new Date("2026-10-26T01:30:00Z"),
    );
  });
});
