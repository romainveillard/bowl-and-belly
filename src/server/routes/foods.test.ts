import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The app opens its database on import, so it gets a folder of its own.
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "bowl-foods-"));
const { web } = await import("../web.js");

function send(method: string, url: string, body: unknown) {
  return web.request(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const kibbles = {
  name: "Salmon kibbles",
  brand: null,
  photoId: null,
  foodTypeId: 2,
  petTypeId: null,
  kcalPerKg: 3700,
  portionName: null,
  portionG: null,
  stockUnit: "g",
  stockG: 1000,
};

describe("food types sent in a food's body", () => {
  it("answers invalid_reference for one that doesn't exist, after the food in the URL", async () => {
    const created = await send("POST", "/api/foods", { ...kibbles, foodTypeId: 999 });
    const missingFood = await send("PUT", "/api/foods/999", {
      ...kibbles,
      foodTypeId: 999,
      kcalBackfill: { scope: "none" },
    });

    expect([created.status, await created.json()]).toEqual([400, { code: "invalid_reference" }]);
    expect([missingFood.status, await missingFood.json()]).toEqual([404, { code: "not_found" }]);
  });
});
