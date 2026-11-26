import { describe, expect, it } from "vitest";
import { allZones, matchZones, suggestedZones, zoneOffset } from "./timeZones.js";

describe("allZones", () => {
  it("keeps a zone set elsewhere that the browser doesn't list, in its alphabetical place", () => {
    const zones = allZones("Antarctica/Unlisted");

    expect(zones).toContain("Antarctica/Unlisted");
    expect(zones).toEqual(zones.toSorted());
  });
});

describe("suggestedZones", () => {
  it("offers the device's zone, then the one set when it differs", () => {
    expect(suggestedZones("Europe/London", "Europe/Paris")).toEqual([
      "Europe/London",
      "Europe/Paris",
    ]);
    expect(suggestedZones("Europe/London", "Europe/London")).toEqual(["Europe/London"]);
  });
});

describe("matchZones", () => {
  const zones = ["America/New_York", "America/Paramaribo", "Europe/London", "Europe/Paris"];

  it("finds a zone from part of any word, whatever the case", () => {
    expect(matchZones(zones, "PAR")).toEqual(["America/Paramaribo", "Europe/Paris"]);
  });

  it("reads spaces as the underscores and slashes in a zone's name", () => {
    expect(matchZones(zones, "new york")).toEqual(["America/New_York"]);
    expect(matchZones(zones, "europe lon")).toEqual(["Europe/London"]);
  });
});

describe("zoneOffset", () => {
  const winter = new Date("2026-01-15T12:00:00Z");

  it("writes zero as +0 rather than leaving the number off", () => {
    expect(zoneOffset("Europe/London", winter, "en-GB")).toBe("GMT+0");
    expect(zoneOffset("Europe/London", winter, "fr")).toBe("UTC+0");
  });

  it("follows the zone's clocks on the day given", () => {
    expect(zoneOffset("Europe/London", new Date("2026-07-15T12:00:00Z"), "en-GB")).toBe("GMT+1");
  });

  it("writes a minus sign and keeps half hours", () => {
    expect(zoneOffset("America/Paramaribo", winter, "en-GB")).toBe("GMT−3");
    expect(zoneOffset("Asia/Kolkata", winter, "en-GB")).toBe("GMT+5:30");
  });
});
