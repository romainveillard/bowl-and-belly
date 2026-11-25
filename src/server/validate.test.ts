import { describe, expect, it } from "vitest";
import { pastInstant } from "./validate.js";

describe("pastInstant", () => {
  it("takes back the ISO instants the API sends, and nothing else", () => {
    const sent = new Date(Date.now() - 60_000).toISOString();

    expect(pastInstant.parse(sent)).toEqual(new Date(sent));
    expect(
      [true, null, 1, "2026-11-23", new Date(Date.now() + 60_000).toISOString()].map(
        (value) => pastInstant.safeParse(value).success,
      ),
    ).toEqual([false, false, false, false, false]);
  });
});
