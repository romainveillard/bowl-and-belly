import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { csrf } from "hono/csrf";
import { requireSession } from "./auth/access.js";
import { db } from "./db/client.js";
import { demo, demoGuard } from "./demo/mode.js";
import { onApiError } from "./errors.js";
import { authRoutes } from "./routes/auth.js";
import { backupsRoutes } from "./routes/backups.js";
import { feedsRoutes } from "./routes/feeds.js";
import { foodTypesRoutes } from "./routes/food-types.js";
import { foodsRoutes } from "./routes/foods.js";
import { imagesRoutes } from "./routes/images.js";
import { insightsRoutes } from "./routes/insights.js";
import { petTypesRoutes } from "./routes/pet-types.js";
import { petsRoutes } from "./routes/pets.js";
import { settingsRoutes } from "./routes/settings.js";
import { weightsRoutes } from "./routes/weights.js";

const jsonBodyLimit = bodyLimit({
  maxSize: 64 * 1024,
  onError: (c) => c.json({ code: "too_large" as const }, 413),
});

/**
 * Refuses forms posted from another site, which need no login when there is
 * no password. Browsers that send no Sec-Fetch-Site are judged by Origin, on
 * the host alone, because HTTPS usually ends at a proxy in front of the app.
 */
const sameSiteForms = csrf({
  origin: (origin, c) => URL.parse(origin)?.host === new URL(c.req.url).host,
});

const api = new Hono()
  .use(sameSiteForms)
  // Before the session check, so an open route such as login can't be sent a
  // body big enough to exhaust memory. Photo uploads have their own limit.
  .use((c, next) => (c.req.path === "/api/images" ? next() : jsonBodyLimit(c, next)))
  .use(requireSession)
  .use(demo ? demoGuard(db) : (_c, next) => next())
  .get("/health", (c) => {
    db.run(sql`select 1`);
    return c.json({ status: "ok" as const });
  })
  .get("/instance", (c) => c.json({ demo }))
  .route("/auth", authRoutes)
  .route("/pets", petsRoutes)
  .route("/pet-types", petTypesRoutes)
  .route("/foods", foodsRoutes)
  .route("/food-types", foodTypesRoutes)
  .route("/feeds", feedsRoutes)
  .route("/settings", settingsRoutes)
  .route("/weights", weightsRoutes)
  .route("/insights", insightsRoutes)
  .route("/images", imagesRoutes)
  .route("/backups", backupsRoutes)
  .onError(onApiError);

export const app = new Hono().route("/api", api);

export type AppType = typeof app;
