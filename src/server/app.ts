import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "./db/client.js";
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
  .get("/health", (c) => {
    db.run(sql`select 1`);
    return c.json({ status: "ok" as const });
  })
  .route("/pets", petsRoutes)
  .route("/pet-types", petTypesRoutes)
  .route("/foods", foodsRoutes)
  .route("/food-types", foodTypesRoutes)
  .route("/feeds", feedsRoutes)
  .route("/settings", settingsRoutes)
  .route("/weights", weightsRoutes)
  .route("/insights", insightsRoutes)
  .route("/images", imagesRoutes);

export const app = new Hono().route("/api", api);

export type AppType = typeof app;
