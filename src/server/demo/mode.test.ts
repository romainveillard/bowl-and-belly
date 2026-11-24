import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Hono, type Context } from "hono";
import { describe, expect, it } from "vitest";
import { openDatabase } from "../db/open.js";
import { pet, weightEntry } from "../db/schema.js";
import { ADDS_NO_ROWS, ADDS_ROWS, DISABLED, demoGuard } from "./mode.js";

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

const created = (c: Context) => c.body(null, 201);

// A pet with the demo's 200 extra weigh-ins already logged, behind routes
// registered with the app's own patterns.
function demoWithWeighInsFull() {
  const { db } = demoWithWeighIns(200);
  const app = new Hono()
    .use(demoGuard(db))
    .post("/api/pets", created)
    .put("/api/pets/:id", created)
    .post("/api/pets/:id/archive", created)
    .post("/api/weights", created)
    .post("/api/weights/restore", created)
    .post("/api/feeds/restore", created)
    .get("/api/backups/download", created);
  return { db, app };
}

describe("demoGuard", () => {
  it("counts weigh-ins against the limit whichever route adds them", async () => {
    const { app } = demoWithWeighInsFull();

    for (const [method, url] of [
      ["POST", "/api/weights"],
      ["POST", "/api/weights/restore"],
      ["PUT", "/api/pets/1"],
      ["POST", "/api/pets"],
    ] as const) {
      const response = await app.request(url, { method });
      expect(await response.json(), `${method} ${url}`).toEqual({ code: "demo_limit" });
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

  it("refuses a backup download asked for with HEAD as well as GET", async () => {
    const { app } = demoWithWeighInsFull();

    const statuses = await Promise.all(
      ["GET", "HEAD"].map(
        async (method) => (await app.request("/api/backups/download", { method })).status,
      ),
    );

    expect(statuses).toEqual([403, 403]);
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

describe("the demo's route lists", () => {
  it("place every route that writes in exactly one list, and only routes that exist", async () => {
    // The app opens its database on import, so it gets a folder of its own.
    process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "bowl-demo-routes-"));
    const { app } = await import("../app.js");
    const writes = new Set(
      app.routes
        .filter((route) => ["POST", "PUT", "PATCH"].includes(route.method))
        .map((route) => `${route.method} ${route.path}`),
    );
    const listed = [...DISABLED, ...ADDS_ROWS.keys(), ...ADDS_NO_ROWS];

    expect([...writes].filter((route) => !listed.includes(route))).toEqual([]);
    expect(listed.filter((route, i) => listed.indexOf(route) !== i)).toEqual([]);
    expect(
      listed.filter((route) => !writes.has(route) && route !== "GET /api/backups/download"),
    ).toEqual([]);
  });
});
