import { isIP } from "node:net";
import type { MiddlewareHandler } from "hono";
import { passwordRequired } from "./access.js";

/** Names listed in BOWL_HOSTS, such as a tunnel's public hostname. */
export const listedHosts = (process.env.BOWL_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim().toLowerCase())
  .filter((host) => host !== "");

function knownHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[(.*)\]$/, "$1");
  return host === "localhost" || isIP(host) !== 0 || listedHosts.includes(host);
}

/**
 * With no password, any page a browser on the network opens could otherwise
 * point its own domain at this address and use the app as if it were its own
 * (DNS rebinding). A rebound name is never an address, localhost, or a name
 * the operator listed.
 */
export const knownHostsOnly: MiddlewareHandler = async (c, next) => {
  if (passwordRequired || knownHost(new URL(c.req.url).hostname)) {
    return next();
  }
  return c.json({ code: "forbidden" as const }, 403);
};
