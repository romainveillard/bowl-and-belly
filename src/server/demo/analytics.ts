import { createHmac, randomBytes } from "node:crypto";
import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context, MiddlewareHandler } from "hono";
import { cloudflareAddress } from "../auth/access.js";
import { answeringRoute, demo } from "./mode.js";

/** Cloudflare Web Analytics' site token, which only the demo sends to browsers. */
export const analyticsToken = (demo && process.env.BOWL_CF_ANALYTICS_TOKEN) || null;

// Replaced on the first request of each UTC day and never written anywhere,
// so a key can't be followed from one day to the next or traced to an address.
let secret = { day: "", key: Buffer.alloc(0) };

/** The same for every request from one browser on one address, all day. */
function visitorKey(c: Context, now: Date): string {
  const day = now.toISOString().slice(0, 10);
  if (secret.day !== day) {
    secret = { day, key: randomBytes(32) };
  }
  // Requests made without a socket, as in tests, have no connection to ask.
  const socket = c.env?.incoming ? getConnInfo(c).remote.address : undefined;
  const address = cloudflareAddress(c) ?? socket ?? "";
  return createHmac("sha256", secret.key)
    .update(`${address}\n${c.req.header("User-Agent") ?? ""}`)
    .digest("hex")
    .slice(0, 16);
}

/**
 * Writes one line to stdout per API request, for scripts/usage-report.mjs.
 * Only the route's pattern goes out: no query values, bodies, headers or
 * addresses, since visitors type into the demo.
 */
export const usageLog: MiddlewareHandler = async (c, next) => {
  const now = new Date();
  await next();
  if (c.req.path === "/api/health") {
    return;
  }
  console.log(
    JSON.stringify({
      type: "usage",
      timestamp: now.toISOString(),
      route: answeringRoute(c).route,
      status: c.res.status,
      visitor: visitorKey(c, now),
    }),
  );
};
