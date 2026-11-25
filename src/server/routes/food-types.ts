import { and, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/client.js";
import { foodType } from "../db/schema.js";
import { validate } from "../validate.js";

const idParam = z.object({ id: z.coerce.number().int() });
const foodTypeBody = z.object({
  name: z.string().trim().min(1).max(40),
  leftoverReturnsToStock: z.boolean(),
});

// Built-in labels depend on the language, so the client checks those.
function nameTaken(name: string, exceptId?: number): boolean {
  return db
    .select({ name: foodType.name })
    .from(foodType)
    .where(
      and(
        isNull(foodType.archivedAt),
        exceptId === undefined ? undefined : ne(foodType.id, exceptId),
      ),
    )
    .all()
    .some((type) => type.name?.toLocaleLowerCase() === name.toLocaleLowerCase());
}

// Archived types are listed too, for the pets and foods that still use them.
export const foodTypesRoutes = new Hono()
  .get("/", (c) =>
    c.json(
      db
        .select({
          id: foodType.id,
          systemKey: foodType.systemKey,
          name: foodType.name,
          archived: sql<boolean>`${foodType.archivedAt} IS NOT NULL`.mapWith(Boolean),
          leftoverReturnsToStock: foodType.leftoverReturnsToStock,
        })
        .from(foodType)
        .orderBy(foodType.id)
        .all(),
    ),
  )
  .post("/", validate("json", foodTypeBody), (c) => {
    const body = c.req.valid("json");
    if (nameTaken(body.name)) {
      return c.json({ code: "name_taken" as const }, 409);
    }
    const created = db.insert(foodType).values(body).returning({ id: foodType.id }).get();
    return c.json(created, 201);
  })
  // Seeded types are read-only, so they answer as if missing.
  .put("/:id", validate("param", idParam), validate("json", foodTypeBody), (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    if (nameTaken(body.name, id)) {
      return c.json({ code: "name_taken" as const }, 409);
    }
    const updated = db
      .update(foodType)
      .set(body)
      .where(and(eq(foodType.id, id), isNull(foodType.systemKey)))
      .returning({ id: foodType.id })
      .get();
    return updated ? c.body(null, 204) : c.json({ code: "not_found" as const }, 404);
  })
  .post("/:id/archive", validate("param", idParam), (c) => {
    const archived = db
      .update(foodType)
      .set({ archivedAt: new Date() })
      .where(
        and(
          eq(foodType.id, c.req.valid("param").id),
          isNull(foodType.systemKey),
          isNull(foodType.archivedAt),
        ),
      )
      .returning({ id: foodType.id })
      .get();
    return archived ? c.body(null, 204) : c.json({ code: "not_found" as const }, 404);
  })
  .post("/:id/restore", validate("param", idParam), (c) => {
    const { id } = c.req.valid("param");
    const type = db
      .select({ name: foodType.name })
      .from(foodType)
      .where(and(eq(foodType.id, id), isNull(foodType.systemKey), isNotNull(foodType.archivedAt)))
      .get();
    if (!type?.name) {
      return c.json({ code: "not_found" as const }, 404);
    }
    if (nameTaken(type.name, id)) {
      return c.json({ code: "name_taken" as const }, 409);
    }
    db.update(foodType).set({ archivedAt: null }).where(eq(foodType.id, id)).run();
    return c.body(null, 204);
  });
