import { and, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/client.js";
import { petType } from "../db/schema.js";
import { validate } from "../validate.js";

const idParam = z.object({ id: z.coerce.number().int() });
const petTypeBody = z.object({ name: z.string().trim().min(1).max(40) });

// Built-in labels depend on the language, so the client checks those.
function nameTaken(name: string, exceptId?: number): boolean {
  return db
    .select({ name: petType.name })
    .from(petType)
    .where(
      and(
        isNull(petType.archivedAt),
        exceptId === undefined ? undefined : ne(petType.id, exceptId),
      ),
    )
    .all()
    .some((type) => type.name?.toLocaleLowerCase() === name.toLocaleLowerCase());
}

// Archived types are listed too, for the pets and foods that still use them.
export const petTypesRoutes = new Hono()
  .get("/", (c) =>
    c.json(
      db
        .select({
          id: petType.id,
          systemKey: petType.systemKey,
          name: petType.name,
          archived: sql<boolean>`${petType.archivedAt} IS NOT NULL`.mapWith(Boolean),
        })
        .from(petType)
        .orderBy(petType.id)
        .all(),
    ),
  )
  .post("/", validate("json", petTypeBody), (c) => {
    const body = c.req.valid("json");
    if (nameTaken(body.name)) {
      return c.json({ code: "name_taken" as const }, 409);
    }
    const created = db.insert(petType).values(body).returning({ id: petType.id }).get();
    return c.json(created, 201);
  })
  // Seeded types are read-only, so they answer as if missing.
  .put("/:id", validate("param", idParam), validate("json", petTypeBody), (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    if (nameTaken(body.name, id)) {
      return c.json({ code: "name_taken" as const }, 409);
    }
    const updated = db
      .update(petType)
      .set(body)
      .where(and(eq(petType.id, id), isNull(petType.systemKey)))
      .returning({ id: petType.id })
      .get();
    return updated ? c.body(null, 204) : c.json({ code: "not_found" as const }, 404);
  })
  .post("/:id/archive", validate("param", idParam), (c) => {
    const archived = db
      .update(petType)
      .set({ archivedAt: new Date() })
      .where(
        and(
          eq(petType.id, c.req.valid("param").id),
          isNull(petType.systemKey),
          isNull(petType.archivedAt),
        ),
      )
      .returning({ id: petType.id })
      .get();
    return archived ? c.body(null, 204) : c.json({ code: "not_found" as const }, 404);
  })
  .post("/:id/restore", validate("param", idParam), (c) => {
    const { id } = c.req.valid("param");
    const type = db
      .select({ name: petType.name })
      .from(petType)
      .where(and(eq(petType.id, id), isNull(petType.systemKey), isNotNull(petType.archivedAt)))
      .get();
    if (!type?.name) {
      return c.json({ code: "not_found" as const }, 404);
    }
    if (nameTaken(type.name, id)) {
      return c.json({ code: "name_taken" as const }, 409);
    }
    db.update(petType).set({ archivedAt: null }).where(eq(petType.id, id)).run();
    return c.body(null, 204);
  });
