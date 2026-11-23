import { and, eq, isNull, ne } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/client.js";
import { food, pet, petType } from "../db/schema.js";
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

export const petTypesRoutes = new Hono()
  .get("/", (c) =>
    c.json(
      db
        .select({ id: petType.id, systemKey: petType.systemKey, name: petType.name })
        .from(petType)
        .where(isNull(petType.archivedAt))
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
  // A type no pet or food uses is deleted rather than kept archived.
  .post("/:id/archive", validate("param", idParam), (c) => {
    const { id } = c.req.valid("param");
    const custom = and(eq(petType.id, id), isNull(petType.systemKey));
    const removed = db.transaction((tx) => {
      const inUse =
        tx.select({ id: pet.id }).from(pet).where(eq(pet.petTypeId, id)).get() ??
        tx.select({ id: food.id }).from(food).where(eq(food.petTypeId, id)).get();
      return inUse
        ? tx.update(petType).set({ archivedAt: new Date() }).where(custom).returning().get()
        : tx.delete(petType).where(custom).returning().get();
    });
    return removed ? c.body(null, 204) : c.json({ code: "not_found" as const }, 404);
  });
