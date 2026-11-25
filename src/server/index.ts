import { serve } from "@hono/node-server";
import { startBackups } from "./backups/scheduler.js";
import { demo, startDemoResets } from "./demo/mode.js";
import { db } from "./db/client.js";
import { web } from "./web.js";

if (demo) {
  startDemoResets(db);
} else {
  startBackups();
}

const port = Number(process.env.PORT ?? 3000);

const server = serve({ fetch: web.fetch, port }, (info) => {
  console.log(`Bowl & Belly listening on port ${info.port}`);
});

// Node runs as PID 1 in the container, where signals have no default handler.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => {
      db.$client.close();
      process.exit(0);
    });
  });
}
