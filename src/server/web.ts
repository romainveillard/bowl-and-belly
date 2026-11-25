import { Hono } from "hono";
import { compress } from "hono/compress";
import { secureHeaders } from "hono/secure-headers";
import { app } from "./app.js";
import { knownHostsOnly } from "./auth/hosts.js";
import { analyticsToken, usageLog } from "./demo/analytics.js";
import { demo } from "./demo/mode.js";
import { staticFiles } from "./staticFiles.js";

const clientDir = "dist/client";

export const web = new Hono()
  .use(knownHostsOnly)
  .use("/api/*", demo ? usageLog : (_c, next) => next())
  .use(
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        ...(analyticsToken && {
          scriptSrc: ["'self'", "https://static.cloudflareinsights.com"],
          connectSrc: ["'self'", "https://cloudflareinsights.com"],
        }),
        // Recharts and React set inline style attributes.
        styleSrc: ["'self'", "'unsafe-inline'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
      xFrameOptions: "DENY",
      // HTTPS ends at the operator's proxy, which decides whether to pin it.
      strictTransportSecurity: false,
    }),
  )
  // Without a proxy in front, as on a LAN, nothing else compresses responses.
  .use("/api/*", compress())
  .route("/", app)
  .all("/api/*", (c) => c.json({ code: "not_found" }, 404))
  .route("/", staticFiles(clientDir));
