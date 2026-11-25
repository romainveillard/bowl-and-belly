import { describe, expect, it } from "vitest";
import { bigChangeFrom } from "./weights.js";

// Newest first, as the pet's weigh-ins come.
const readings = [
  { day: "2026-11-20", weightG: 4500 },
  { day: "2026-10-01", weightG: 3000 },
];
const dayOf = (reading: (typeof readings)[number]) => reading.day;

describe("bigChangeFrom", () => {
  it("flags a reading more than 20% away from the one before it", () => {
    expect(bigChangeFrom(45_000, "2026-11-25", readings, dayOf)).toBe(readings[0]);
    expect(bigChangeFrom(5400, "2026-11-25", readings, dayOf)).toBeUndefined();
    expect(bigChangeFrom(5401, "2026-11-25", readings, dayOf)).toBe(readings[0]);
  });

  it("compares a backdated reading with the one before its own date", () => {
    expect(bigChangeFrom(3100, "2026-10-15", readings, dayOf)).toBeUndefined();
    expect(bigChangeFrom(4500, "2026-10-15", readings, dayOf)).toBe(readings[1]);
  });

  it("compares a reading older than all the others with the latest", () => {
    expect(bigChangeFrom(3000, "2026-09-01", readings, dayOf)).toBe(readings[0]);
  });
});
