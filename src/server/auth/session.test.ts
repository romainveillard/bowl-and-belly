import { describe, expect, it } from "vitest";
import { sessionDays, sessions } from "./session.js";

const secret = Buffer.alloc(32, 7);
const issuedAt = Date.parse("2026-11-23T12:00:00Z");
const THIRTY_DAYS_MS = 30 * 86_400_000;

describe("sessions", () => {
  const current = sessions(secret, "correct horse", 30);
  const token = current.issue(issuedAt);

  it("accepts a fresh token and asks to reissue one over a day old", () => {
    expect(current.check(token, issuedAt + 60_000)).toBe("valid");
    expect(current.check(token, issuedAt + 2 * 86_400_000)).toBe("refresh");
  });

  it("ends a session the set number of days after it was last issued", () => {
    expect(current.check(token, issuedAt + THIRTY_DAYS_MS - 1)).toBe("refresh");
    expect(current.check(token, issuedAt + THIRTY_DAYS_MS)).toBe("invalid");
  });

  it("refuses a token whose date was changed", () => {
    const [, signed] = token.split(".");
    expect(current.check(`${issuedAt + THIRTY_DAYS_MS}.${signed}`, issuedAt)).toBe("invalid");
  });

  it("ends every session when the password changes", () => {
    expect(sessions(secret, "new password", 30).check(token, issuedAt)).toBe("invalid");
  });

  it("refuses missing and malformed tokens", () => {
    expect(current.check(undefined, issuedAt)).toBe("invalid");
    expect(current.check("not-a-token", issuedAt)).toBe("invalid");
  });
});

describe("sessionDays", () => {
  it("lasts a week when BOWL_SESSION_DAYS is unset", () => {
    expect(sessionDays(undefined)).toBe(7);
    expect(sessionDays("")).toBe(7);
  });

  it("takes a whole number of days from 1 to 365", () => {
    expect(sessionDays("1")).toBe(1);
    expect(sessionDays("365")).toBe(365);
  });

  it("refuses anything else rather than guess", () => {
    const values = ["0", "366", "7.5", "30d", " 30", "-1", "1e2"];

    expect(values.filter((value) => sessionDays(value) !== null)).toEqual([]);
  });
});
