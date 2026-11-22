import { hc } from "hono/client";
import type { AppType } from "../server/app.js";

export const api = hc<AppType>("/");
