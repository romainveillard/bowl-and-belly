import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { openDatabase } from "../db/open.js";
import { food } from "../db/schema.js";

// The app opens its database on import, so it gets a folder of its own.
const dataDir = mkdtempSync(path.join(tmpdir(), "bowl-backups-"));
process.env.DATA_DIR = dataDir;
const { web } = await import("../web.js");
const { db } = await import("../db/client.js");

describe("GET /api/backups/download", () => {
  it("sends a working copy of the database and leaves nothing behind", async () => {
    db.insert(food).values({ name: "Salmon kibbles", foodTypeId: 2, kcalPerKg: 3700 }).run();
    const before = readdirSync(dataDir).toSorted();

    const response = await web.request("http://localhost/api/backups/download");
    const copy = path.join(mkdtempSync(path.join(tmpdir(), "bowl-download-")), "copy.db");
    writeFileSync(copy, new Uint8Array(await response.arrayBuffer()));

    expect(openDatabase(copy).select({ name: food.name }).from(food).all()).toEqual([
      { name: "Salmon kibbles" },
    ]);
    expect(readdirSync(dataDir).toSorted()).toEqual(before);
  });
});
