import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono, type Context } from "hono";
import { app } from "./app.js";
import { sqlite } from "./db/client.js";

const clientDir = "dist/client";

// Vite fingerprints everything under assets/; index.html must be revalidated
// so a new deploy is picked up.
const setCacheControl = (path: string, c: Context) => {
  c.header(
    "Cache-Control",
    path.includes("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
  );
};

const web = new Hono()
  .route("/", app)
  .all("/api/*", (c) => c.json({ code: "not_found" }, 404))
  .use(serveStatic({ root: clientDir, onFound: setCacheControl }))
  .get("*", serveStatic({ root: clientDir, path: "index.html", onFound: setCacheControl }));

const port = Number(process.env.PORT ?? 3000);

const server = serve({ fetch: web.fetch, port }, (info) => {
  console.log(`Bowl & Belly listening on port ${info.port}`);
});

// Node runs as PID 1 in the container, where signals have no default handler.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => {
      sqlite.close();
      process.exit(0);
    });
  });
}
