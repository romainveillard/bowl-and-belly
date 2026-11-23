import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

export const SESSION_MS = 365 * 86_400_000;
// A token older than this is reissued, so a session used within the year never ends.
const REFRESH_AFTER_MS = 86_400_000;

const sha256 = (text: string) => createHash("sha256").update(text).digest();

/** Equal-length digests keep the comparison constant-time whatever was typed. */
export function passwordMatches(attempt: string, password: string): boolean {
  return timingSafeEqual(sha256(attempt), sha256(password));
}

/** The signing secret, generated on first start and kept in the volume. */
export function loadSecret(file: string): Buffer {
  try {
    return readFileSync(file);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
      throw error;
    }
  }
  const secret = randomBytes(32);
  writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

export interface Sessions {
  issue: (now: number) => string;
  /** "valid", "refresh" when valid but due to be reissued, or "invalid". */
  check: (token: string | undefined, now: number) => "valid" | "refresh" | "invalid";
}

// The password is part of what is signed, so changing it ends every session.
export function sessions(secret: Buffer, password: string): Sessions {
  const signature = (issuedAt: string) =>
    createHmac("sha256", secret).update(issuedAt).update(sha256(password)).digest();

  return {
    issue: (now) => `${now}.${signature(String(now)).toString("base64url")}`,
    check: (token, now) => {
      const [issuedAt = "", signed = ""] = token?.split(".") ?? [];
      const expected = signature(issuedAt);
      const given = Buffer.from(signed, "base64url");
      if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
        return "invalid";
      }
      const age = now - Number(issuedAt);
      if (!(age >= 0 && age < SESSION_MS)) {
        return "invalid";
      }
      return age > REFRESH_AFTER_MS ? "refresh" : "valid";
    },
  };
}
