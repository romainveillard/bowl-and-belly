import { Hono } from "hono";
import { z } from "zod";
import { logIn, logOut, passwordRequired, signedIn } from "../auth/access.js";
import { validate } from "../validate.js";

export const authRoutes = new Hono()
  .get("/", (c) => c.json({ passwordRequired, signedIn: signedIn(c) }))
  .post("/login", validate("json", z.object({ password: z.string() })), async (c) => {
    const result = await logIn(c, c.req.valid("json").password);
    if (result === "ok") {
      return c.body(null, 204);
    }
    return c.json({ code: result }, result === "wrong_password" ? 401 : 429);
  })
  .post("/logout", (c) => {
    logOut(c);
    return c.body(null, 204);
  });
