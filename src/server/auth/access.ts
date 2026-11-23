import path from "node:path";
import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { dataDir } from "../db/client.js";
import { loginLimiter } from "./limiter.js";
import { loadSecret, passwordMatches, SESSION_MS, sessions } from "./session.js";

const COOKIE = "bowl_session";
const password = process.env.BOWL_PASSWORD || null;
const trustCloudflare = process.env.BOWL_TRUST_PROXY === "cloudflare";
const current = password && sessions(loadSecret(path.join(dataDir, "session-secret")), password);
const limiter = loginLimiter();

export const passwordRequired = password !== null;

// Behind a proxy every request comes from the proxy, so the limit is global
// unless the operator says Cloudflare's client address header can be trusted.
const clientKey = (c: Context) => (trustCloudflare && c.req.header("CF-Connecting-IP")) || "global";

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
  if (!current || c.req.path === "/api/health" || c.req.path.startsWith("/api/auth")) {
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

export type LoginResult = "ok" | "wrong_password" | "too_many_attempts";

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
