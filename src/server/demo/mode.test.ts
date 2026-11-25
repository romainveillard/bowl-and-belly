import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { pet, petTarget, weightEntry } from "../db/schema.js";

// Read when the modules load, so set before importing them. The app opens its
// database on import, so it gets a folder of its own.
process.env.BOWL_DEMO = "true";
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "bowl-demo-"));
const { web } = await import("../web.js");
const { app } = await import("../app.js");
const { db } = await import("../db/client.js");
const { ADDS_NO_ROWS, ADDS_ROWS, DISABLED } = await import("./mode.js");

function send(method: string, url: string, body?: unknown) {
  return web.request(url, {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

// No reset has run, so every weigh-in counts against the demo's 200.
function petWithWeighIns(weighIns: number) {
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
  if (weighIns > 0) {
    db.insert(weightEntry)
      .values(
        Array.from({ length: weighIns }, (_, i) => ({
          petId: id,
          measuredAt: new Date(Date.UTC(2026, 0, 1 + i)),
          weightG: 4000,
        })),
      )
      .run();
  }
  return id;
}

beforeEach(() => {
  for (const table of [weightEntry, petTarget, pet]) {
    db.delete(table).run();
  }
});

describe("demoGuard", () => {
  it("refuses every disabled route, and a backup download asked for with HEAD", async () => {
    const answers = await Promise.all(
      [...DISABLED].map(async (route) => {
        const [method = "", url = ""] = route.split(" ");
        const response = await send(method, url, method === "GET" ? undefined : {});
        return [route, await response.json()];
      }),
    );

    expect(answers).toEqual([...DISABLED].map((route) => [route, { code: "demo_disabled" }]));
    expect((await send("HEAD", "/api/backups/download")).status).toBe(403);
  });

  it("refuses a write to a route the lists don't place", async () => {
    const response = await send("POST", "/api/nothing-here", {});

    expect(await response.json()).toEqual({ code: "demo_disabled" });
  });

  it("counts weigh-ins against the limit whichever route adds them", async () => {
    const petId = petWithWeighIns(200);

    for (const [method, url] of [
      ["POST", "/api/weights"],
      ["POST", "/api/weights/restore"],
      ["PUT", `/api/pets/${petId}`],
      ["POST", "/api/pets"],
    ] as const) {
      const response = await send(method, url, {});
      expect(await response.json(), `${method} ${url}`).toEqual({ code: "demo_limit" });
    }
  });

  it("leaves other tables open while one is full", async () => {
    const petId = petWithWeighIns(200);

    // Refused by validation, so the guard let it through.
    expect((await send("POST", "/api/feeds/restore", {})).status).toBe(400);
    expect((await send("POST", `/api/pets/${petId}/archive`)).status).toBe(204);
  });

  it("holds a place for requests still arriving, so parallel ones can't overshoot", async () => {
    const petId = petWithWeighIns(195);

    const statuses = await Promise.all(
      Array.from(
        { length: 10 },
        async () =>
          (
            await send("POST", "/api/weights/restore", {
              petId,
              measuredAt: new Date().toISOString(),
              weightG: 4000,
            })
          ).status,
      ),
    );

    expect(statuses.filter((status) => status === 201)).toHaveLength(5);
    expect(db.select().from(weightEntry).all()).toHaveLength(200);
  });

  it("frees the place of a request that fails", async () => {
    petWithWeighIns(199);

    await send("POST", "/api/weights/restore", {});

    expect((await send("POST", "/api/weights/restore", {})).status).toBe(400);
  });
});

describe("the demo's route lists", () => {
  it("place every route that writes in exactly one list, and only routes that exist", () => {
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
