import { expect, it } from "vitest";
import { insightsAddress, periodSpan } from "./period.js";

const today = "2026-11-25";
const address = (search: string) => insightsAddress(new URLSearchParams(search), today, "week");

it("shows the period and day the address names", () => {
  expect(address("period=month&from=2026-09-14")).toEqual({ period: "month", from: "2026-09-14" });
});

it("falls back to this device's period, and today", () => {
  expect(address("")).toEqual({ period: "week", from: today });
  expect(address("period=year")).toEqual({ period: "week", from: today });
});

it("ignores a day that isn't one, or is still to come", () => {
  expect(address("period=day&from=2026-02-30").from).toBe(today);
  expect(address("period=day&from=yesterday").from).toBe(today);
  expect(address("period=day&from=2026-11-26").from).toBe(today);
  expect(address("period=day&from=2026-11-25").from).toBe(today);
});

it("spans Monday-to-Sunday weeks and whole months, across a year's end", () => {
  expect(periodSpan("week", "2026-12-02", "2026-12-06")).toEqual({
    start: "2026-11-30",
    end: "2026-12-06",
    previous: "2026-11-23",
    next: "2026-12-07",
    atLatest: true,
  });
  expect(periodSpan("month", "2026-12-14", "2027-01-05")).toEqual({
    start: "2026-12-01",
    end: "2026-12-31",
    previous: "2026-11-01",
    next: "2027-01-01",
    atLatest: false,
  });
});
