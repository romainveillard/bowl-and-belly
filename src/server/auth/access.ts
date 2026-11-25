import path from "node:path";
import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { dataDir } from "../db/client.js";
import { clientOf, loginLimiter } from "./limiter.js";
import { loadSecret, passwordMatches, SESSION_MS, sessions } from "./session.js";

const COOKIE = "bowl_session";
const password = process.env.BOWL_PASSWORD || null;
const trustCloudflare = process.env.BOWL_TRUST_PROXY === "cloudflare";
const current = password && sessions(loadSecret(path.join(dataDir, "session-secret")), password);
const limiter = loginLimiter();

export const passwordRequired = password !== null;

/** Why the server won't start with this password, for the log. */
export function passwordProblem(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  if (value === "change-me") {
    return "BOWL_PASSWORD is still the README's example. Choose your own.";
  }
  // Characters as a person counts them, so an emoji counts once.
  if ([...new Intl.Segmenter().segment(value)].length < 12) {
    return "BOWL_PASSWORD must be at least 12 characters long.";
  }
  return null;
}

export const configuredPasswordProblem = passwordProblem(password);

/** The visitor's address from Cloudflare's header, when the operator says it can be trusted. */
export function cloudflareAddress(c: Context): string | undefined {
  return trustCloudflare ? c.req.header("CF-Connecting-IP") : undefined;
}

// Behind a proxy every request comes from the proxy, so the limit is global
// unless the operator says Cloudflare's client address header can be trusted.
function clientKey(c: Context): string {
  const address = cloudflareAddress(c);
  return address ? clientOf(address) : "global";
}

function startSession(c: Context, token: string) {
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure:
      new URL(c.req.url).protocol === "https:" || c.req.header("X-Forwarded-Proto") === "https",
    path: "/",
    maxAge: SESSION_MS / 1000,
  });
}

export function signedIn(c: Context): boolean {
  return !current || current.check(getCookie(c, COOKIE), Date.now()) !== "invalid";
}

/** Guards the API; health and the auth routes stay open. */
export const requireSession: MiddlewareHandler = async (c, next) => {
  const route = c.req.path;
  if (
    !current ||
    route === "/api/health" ||
    route === "/api/auth" ||
    route.startsWith("/api/auth/")
  ) {
    return next();
  }
  const now = Date.now();
  const state = current.check(getCookie(c, COOKIE), now);
  if (state === "invalid") {
    return c.json({ code: "unauthorised" as const }, 401);
  }
  if (state === "refresh") {
    startSession(c, current.issue(now));
  }
  return next();
};

type LoginResult = "ok" | "wrong_password" | "too_many_attempts";

export async function logIn(c: Context, attempt: string): Promise<LoginResult> {
  if (!current || !password) {
    return "ok";
  }
  const key = clientKey(c);
  if (limiter.blocked(key, Date.now())) {
    return "too_many_attempts";
  }
  if (!passwordMatches(attempt, password)) {
    limiter.fail(key, Date.now());
    // Slows guessing further, within the per-minute limit.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return "wrong_password";
  }
  startSession(c, current.issue(Date.now()));
  return "ok";
}

export function logOut(c: Context): void {
  deleteCookie(c, COOKIE, { path: "/" });
}
