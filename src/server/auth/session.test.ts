import { describe, expect, it } from "vitest";
import { SESSION_MS, sessions } from "./session.js";

const secret = Buffer.alloc(32, 7);
const issuedAt = Date.parse("2026-11-23T12:00:00Z");

describe("sessions", () => {
  const current = sessions(secret, "correct horse");
  const token = current.issue(issuedAt);

  it("accepts a fresh token and asks to reissue one over a day old", () => {
    expect(current.check(token, issuedAt + 60_000)).toBe("valid");
    expect(current.check(token, issuedAt + 2 * 86_400_000)).toBe("refresh");
  });

  it("ends a session a year after it was last issued", () => {
    expect(current.check(token, issuedAt + SESSION_MS - 1)).toBe("refresh");
    expect(current.check(token, issuedAt + SESSION_MS)).toBe("invalid");
  });

  it("refuses a token whose date was changed", () => {
    const [, signed] = token.split(".");
    expect(current.check(`${issuedAt + SESSION_MS}.${signed}`, issuedAt)).toBe("invalid");
  });

  it("ends every session when the password changes", () => {
    expect(sessions(secret, "new password").check(token, issuedAt)).toBe("invalid");
  });

  it("refuses missing and malformed tokens", () => {
    expect(current.check(undefined, issuedAt)).toBe("invalid");
    expect(current.check("not-a-token", issuedAt)).toBe("invalid");
  });
});
