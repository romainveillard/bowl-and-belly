import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { requireSession } from "./auth/access.js";
import { db } from "./db/client.js";
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

const api = new Hono()
  .use(requireSession)
  .get("/health", (c) => {
    db.run(sql`select 1`);
    return c.json({ status: "ok" as const });
  })
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
  .route("/backups", backupsRoutes);

export const app = new Hono().route("/api", api);

export type AppType = typeof app;
