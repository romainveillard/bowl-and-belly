import { serveStatic } from "@hono/node-server/serve-static";
import { Hono, type Context } from "hono";
import { compress } from "hono/compress";
import { secureHeaders } from "hono/secure-headers";
import { app } from "./app.js";

const clientDir = "dist/client";

// Vite fingerprints everything under assets/; index.html must be revalidated
// so a new deploy is picked up.
const setCacheControl = (path: string, c: Context) => {
  c.header(
    "Cache-Control",
    path.includes("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
  );
};

export const web = new Hono()
  .use(
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
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
  // The build writes .br and .gz copies, sent to browsers that accept them.
  .use(serveStatic({ root: clientDir, precompressed: true, onFound: setCacheControl }))
  .get(
    "*",
    serveStatic({
      root: clientDir,
      path: "index.html",
      precompressed: true,
      onFound: setCacheControl,
    }),
  );
