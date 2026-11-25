import { hc } from "hono/client";
import type { AppType } from "../server/app.js";
import { accessAwareFetch } from "./access/access.js";

export const api = hc<AppType>("/", { fetch: accessAwareFetch });
