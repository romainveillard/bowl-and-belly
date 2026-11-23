import { validate } from "../validate.js";
import { and, count, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { ACTIVITY_LEVELS, BIRTH_DATE_PRECISIONS, GOALS } from "../../shared/enums.js";
import { db } from "../db/client.js";
import { image, pet, petTarget, petType, weightEntry } from "../db/schema.js";
import { daySummaries } from "../feeds/days.js";
import { chooseTarget, latestWeightG, targetOn } from "../pets/targets.js";
import { today } from "../settings.js";

const idParam = z.object({ id: z.coerce.number().int() });

const petBody = z
  .object({
    name: z.string().trim().min(1).max(100),
    petTypeId: z.number().int(),
    photoId: z.number().int().nullable(),
    birthDate: z.iso.date(),
    birthDatePrecision: z.enum(BIRTH_DATE_PRECISIONS),
    neutered: z.boolean(),
    activityLevel: z.enum(ACTIVITY_LEVELS),
    goal: z.enum(GOALS),
    targetWeightG: z.number().int().positive().nullable(),
    /** Logged as a weigh-in when it differs from the latest one. */
    weightG: z.number().int().positive().nullable(),
    /** Null follows the calculated target. */
    manualTargetKcal: z.number().int().positive().nullable(),
  })
  .refine((body) => body.goal === "maintain" || body.targetWeightG !== null, {
    path: ["targetWeightG"],
  });

type PetBody = z.infer<typeof petBody>;

function profileOf(body: PetBody) {
  return {
    name: body.name,
    petTypeId: body.petTypeId,
    photoId: body.photoId,
    birthDate: body.birthDate,
    birthDatePrecision: body.birthDatePrecision,
    neutered: body.neutered,
    activityLevel: body.activityLevel,
    goal: body.goal,
    targetWeightG: body.goal === "maintain" ? null : body.targetWeightG,
  };
}

const petTypeLabel = { systemKey: petType.systemKey, name: petType.name };

export const petsRoutes = new Hono()
  .get("/", (c) => {
    const day = today(db);

    const pets = db
      .select({
        id: pet.id,
        name: pet.name,
        petTypeId: pet.petTypeId,
        type: petTypeLabel,
        birthDate: pet.birthDate,
        birthDatePrecision: pet.birthDatePrecision,
        photoId: pet.photoId,
      })
      .from(pet)
      .innerJoin(petType, eq(pet.petTypeId, petType.id))
      .where(isNull(pet.archivedAt))
      .orderBy(pet.id)
      .all()
      .map((row) => ({
        ...row,
        weightG: latestWeightG(db, row.id),
        todayKcal: daySummaries(db, row.id, day, day, day)[0]?.eatenKcal ?? 0,
        targetKcal: targetOn(db, row.id, day)?.kcalPerDay ?? null,
      }));

    const archived = db.select({ count: count() }).from(pet).where(isNotNull(pet.archivedAt)).get();

    return c.json({ today: day, pets, archivedCount: archived?.count ?? 0 });
  })
  .get("/archived", (c) =>
    c.json(
      db
        .select({
          id: pet.id,
          name: pet.name,
          type: petTypeLabel,
          photoId: pet.photoId,
          archivedAt: pet.archivedAt,
        })
        .from(pet)
        .innerJoin(petType, eq(pet.petTypeId, petType.id))
        .where(isNotNull(pet.archivedAt))
        .orderBy(desc(pet.archivedAt))
        .all(),
    ),
  )
  .get("/:id", validate("param", idParam), (c) => {
    const { id } = c.req.valid("param");
    const row = db
      .select({
        id: pet.id,
        name: pet.name,
        petTypeId: pet.petTypeId,
        type: petTypeLabel,
        photoId: pet.photoId,
        birthDate: pet.birthDate,
        birthDatePrecision: pet.birthDatePrecision,
        neutered: pet.neutered,
        activityLevel: pet.activityLevel,
        goal: pet.goal,
        targetWeightG: pet.targetWeightG,
      })
      .from(pet)
      .innerJoin(petType, eq(pet.petTypeId, petType.id))
      .where(eq(pet.id, id))
      .get();
    if (!row) {
      return c.json({ code: "not_found" as const }, 404);
    }

    const weights = db
      .select({ measuredAt: weightEntry.measuredAt, weightG: weightEntry.weightG })
      .from(weightEntry)
      .where(eq(weightEntry.petId, id))
      .orderBy(desc(weightEntry.measuredAt), desc(weightEntry.id))
      .limit(6)
      .all();
    const targets = db
      .select({
        effectiveFrom: petTarget.effectiveFrom,
        kcalPerDay: petTarget.kcalPerDay,
        source: petTarget.source,
      })
      .from(petTarget)
      .where(eq(petTarget.petId, id))
      .orderBy(desc(petTarget.effectiveFrom))
      .all();

    return c.json({ ...row, today: today(db), weights, targets });
  })
  .post("/", validate("json", petBody), (c) => {
    const body = c.req.valid("json");
    const id = db.transaction((tx) => {
      const created = tx.insert(pet).values(profileOf(body)).returning({ id: pet.id }).get();
      if (body.weightG !== null) {
        tx.insert(weightEntry)
          .values({ petId: created.id, measuredAt: new Date(), weightG: body.weightG })
          .run();
      }
      chooseTarget(tx, created.id, today(tx), body.manualTargetKcal);
      return created.id;
    });
    return c.json({ id }, 201);
  })
  .put("/:id", validate("param", idParam), validate("json", petBody), (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const result = db.transaction((tx) => {
      const before = tx.select({ photoId: pet.photoId }).from(pet).where(eq(pet.id, id)).get();
      if (!before) {
        return null;
      }
      tx.update(pet).set(profileOf(body)).where(eq(pet.id, id)).run();
      if (before.photoId !== null && before.photoId !== body.photoId) {
        tx.delete(image).where(eq(image.id, before.photoId)).run();
      }
      if (body.weightG !== null && body.weightG !== latestWeightG(tx, id)) {
        tx.insert(weightEntry)
          .values({ petId: id, measuredAt: new Date(), weightG: body.weightG })
          .run();
      }
      return { targetKcal: chooseTarget(tx, id, today(tx), body.manualTargetKcal) };
    });
    return result ? c.json(result) : c.json({ code: "not_found" as const }, 404);
  })
  .put(
    "/:id/target",
    validate("param", idParam),
    validate("json", z.object({ manualTargetKcal: z.number().int().positive().nullable() })),
    (c) => {
      const { id } = c.req.valid("param");
      const { manualTargetKcal } = c.req.valid("json");
      const exists = db.select({ id: pet.id }).from(pet).where(eq(pet.id, id)).get();
      if (!exists) {
        return c.json({ code: "not_found" as const }, 404);
      }
      db.transaction((tx) => chooseTarget(tx, id, today(tx), manualTargetKcal));
      return c.body(null, 204);
    },
  )
  .post("/:id/archive", validate("param", idParam), (c) => {
    const { id } = c.req.valid("param");
    const archived = db
      .update(pet)
      .set({ archivedAt: new Date() })
      .where(and(eq(pet.id, id), isNull(pet.archivedAt)))
      .returning({ id: pet.id })
      .get();
    return archived ? c.body(null, 204) : c.json({ code: "not_found" as const }, 404);
  })
  .post("/:id/restore", validate("param", idParam), (c) => {
    const { id } = c.req.valid("param");
    const restored = db
      .update(pet)
      .set({ archivedAt: null })
      .where(and(eq(pet.id, id), isNotNull(pet.archivedAt)))
      .returning({ id: pet.id })
      .get();
    return restored ? c.body(null, 204) : c.json({ code: "not_found" as const }, 404);
  });
