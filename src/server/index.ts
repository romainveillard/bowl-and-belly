import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { sqlite } from "./db/client.js";

const port = Number(process.env.PORT ?? 3000);

const server = serve({ fetch: app.fetch, port }, (info) => {
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
