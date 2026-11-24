import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { openDatabase } from "../db/open.js";
import { pet, weightEntry } from "../db/schema.js";
import { demoGuard } from "./mode.js";

function demoWithWeighIns(weighIns: number) {
  const db = openDatabase(":memory:");
  const { id } = db
    .insert(pet)
    .values({
      name: "Miso",
      petTypeId: 1,
      birthDate: "2020-05-01",
      birthDatePrecision: "exact",
      neutered: true,
      activityLevel: "normal",
      goal: "maintain",
    })
    .returning({ id: pet.id })
    .get();
  db.insert(weightEntry)
    .values(
      Array.from({ length: weighIns }, (_, i) => ({
        petId: id,
        measuredAt: new Date(Date.UTC(2026, 0, 1 + i)),
        weightG: 4000,
      })),
    )
    .run();
  return { db, petId: id };
}

// A pet with the demo's 200 extra weigh-ins already logged.
function demoWithWeighInsFull() {
  const { db } = demoWithWeighIns(200);
  const app = new Hono()
    .use(demoGuard(db))
    .all("*", (c) => c.body(null, c.req.method === "POST" ? 201 : 204));
  return { db, app };
}

describe("demoGuard", () => {
  it("counts weigh-ins against the limit whichever route adds them", async () => {
    const { app } = demoWithWeighInsFull();

    for (const [method, path] of [
      ["POST", "/api/weights"],
      ["POST", "/api/weights/restore"],
      ["PUT", "/api/pets/1"],
      ["POST", "/api/pets"],
    ] as const) {
      const response = await app.request(path, { method });
      expect(await response.json(), `${method} ${path}`).toEqual({ code: "demo_limit" });
    }
  });

  it("leaves other tables open while one is full", async () => {
    const { app } = demoWithWeighInsFull();

    expect((await app.request("/api/feeds/restore", { method: "POST" })).status).toBe(201);
    expect((await app.request("/api/pets/1/archive", { method: "POST" })).status).toBe(201);
  });

  it("holds a place for requests still arriving, so parallel ones can't overshoot", async () => {
    const { db, petId } = demoWithWeighIns(195);
    const app = new Hono().use(demoGuard(db)).post("/api/weights", async (c) => {
      // Stands in for a body that takes a while to arrive.
      await new Promise((resolve) => setTimeout(resolve, 10));
      db.insert(weightEntry).values({ petId, measuredAt: new Date(), weightG: 4000 }).run();
      return c.body(null, 201);
    });

    const statuses = await Promise.all(
      Array.from(
        { length: 10 },
        async () => (await app.request("/api/weights", { method: "POST" })).status,
      ),
    );

    expect(statuses.filter((status) => status === 201)).toHaveLength(5);
    expect(db.select().from(weightEntry).all()).toHaveLength(200);
  });

  it("frees the place of a request that fails", async () => {
    const { db } = demoWithWeighIns(199);
    const app = new Hono()
      .use(demoGuard(db))
      .post("/api/weights", (c) => c.json({ code: "invalid_request" }, 400));

    await app.request("/api/weights", { method: "POST" });

    expect((await app.request("/api/weights", { method: "POST" })).status).toBe(400);
  });
});
