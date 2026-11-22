import { Hono } from "hono";

const api = new Hono().get("/health", (c) => c.json({ status: "ok" as const }));

export const app = new Hono().route("/api", api);

export type AppType = typeof app;
