import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";

// Vite fingerprints everything under assets/, so it never changes; index.html
// must be revalidated so a new deploy is picked up. Set once the response
// exists: serveStatic's onFound runs after it is built, too late for headers.
const cacheControl = createMiddleware(async (c, next) => {
  await next();
  // A missing asset falls through to index.html, which must not be kept.
  const hashed =
    c.req.path.startsWith("/assets/") &&
    !c.res.headers.get("Content-Type")?.startsWith("text/html");
  c.header("Cache-Control", hashed ? "public, max-age=31536000, immutable" : "no-cache");
});

/** The built app, from `root`: its files, and index.html for every other path. */
export function staticFiles(root: string) {
  return (
    new Hono()
      .use(cacheControl)
      // The build writes .br and .gz copies, sent to browsers that accept them.
      .use(serveStatic({ root, precompressed: true }))
      .get("*", serveStatic({ root, path: "index.html", precompressed: true }))
  );
}
