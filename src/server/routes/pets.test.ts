import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";

// The app opens its database on import, so it gets a folder of its own.
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "bowl-pets-"));
const { web } = await import("../web.js");

function send(method: string, url: string, body?: unknown) {
  return web.request(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const created = z.object({ id: z.number() });

// A cat with no weigh-in, so the formula has nothing to suggest.
const miso = {
  name: "Miso",
  petTypeId: 1,
  photoId: null,
  birthDate: "2020-05-01",
  birthDatePrecision: "exact",
  neutered: true,
  activityLevel: "normal",
  goal: "maintain",
  targetWeightG: null,
  weightG: null,
  manualTargetKcal: 300,
};

describe("PUT /api/pets/:id", () => {
  it("refuses going back to a formula with nothing to suggest, keeping the whole form unsaved", async () => {
    const { id } = created.parse(await (await send("POST", "/api/pets", miso)).json());

    const response = await send("PUT", `/api/pets/${id}`, {
      ...miso,
      name: "Misou",
      manualTargetKcal: null,
    });
    const after = await (await send("GET", `/api/pets/${id}`)).json();

    expect([response.status, await response.json()]).toEqual([409, { code: "no_suggestion" }]);
    expect(after).toMatchObject({ name: "Miso", targets: [{ kcalPerDay: 300, source: "manual" }] });
  });

  it("refuses a birth date still to come", async () => {
    const { id } = created.parse(await (await send("POST", "/api/pets", miso)).json());

    const response = await send("PUT", `/api/pets/${id}`, { ...miso, birthDate: "2999-01-01" });

    expect(await response.json()).toEqual({ code: "in_future" });
  });
});
