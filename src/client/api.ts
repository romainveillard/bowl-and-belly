import { hc } from "hono/client";
import type { AppType } from "../server/app.js";
import { accessAwareFetch } from "./lib/access.js";

export const api = hc<AppType>("/", { fetch: accessAwareFetch });
