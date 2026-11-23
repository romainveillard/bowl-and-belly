import { Hono } from "hono";
import { db } from "../db/client.js";
import { daySettings } from "../settings.js";

export const settingsRoutes = new Hono().get("/", (c) => c.json(daySettings(db)));
