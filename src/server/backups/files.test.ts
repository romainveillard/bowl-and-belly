import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { openDatabase } from "../db/open.js";
import { food } from "../db/schema.js";
import { latestBackupAt, writeBackup } from "./files.js";

it("keeps the newest copies and leaves other files alone", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "backups-"));
  writeFileSync(path.join(dir, "before-upgrade.db"), "");
  const db = openDatabase(":memory:");

  writeBackup(db, dir, new Date("2026-11-21T03:30:00Z"), 2);
  writeBackup(db, dir, new Date("2026-11-22T03:30:00Z"), 2);
  writeBackup(db, dir, new Date("2026-11-23T03:30:00Z"), 2);

  expect(readdirSync(dir).toSorted()).toEqual([
    "before-upgrade.db",
    "bowl-and-belly-20261122T033000Z.db",
    "bowl-and-belly-20261123T033000Z.db",
  ]);
  expect(latestBackupAt(dir)).toEqual(new Date("2026-11-23T03:30:00Z"));
});

it("copies the data, not just the schema", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "backups-"));
  const db = openDatabase(":memory:");
  db.insert(food).values({ name: "Salmon kibbles", foodTypeId: 2, kcalPerKg: 3700 }).run();

  writeBackup(db, dir, new Date("2026-11-23T03:30:00Z"), 7);

  const copy = openDatabase(path.join(dir, "bowl-and-belly-20261123T033000Z.db"));
  expect(copy.select({ name: food.name }).from(food).all()).toEqual([{ name: "Salmon kibbles" }]);
});

it("keeps the first backup when a second one lands in the same second", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "backups-"));
  const db = openDatabase(":memory:");
  const at = new Date("2026-11-23T03:30:00Z");

  writeBackup(db, dir, at, 7);
  expect(() => writeBackup(db, dir, at, 7)).not.toThrow();

  expect(readdirSync(dir)).toEqual(["bowl-and-belly-20261123T033000Z.db"]);
});

it("never counts a copy cut short, and isn't blocked by one", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "backups-"));
  writeFileSync(path.join(dir, "bowl-and-belly-20261123T033000Z.db.partial"), "half a databa");
  const db = openDatabase(":memory:");

  expect(latestBackupAt(dir)).toBeNull();
  writeBackup(db, dir, new Date("2026-11-23T03:30:00Z"), 7);

  expect(readdirSync(dir)).toEqual(["bowl-and-belly-20261123T033000Z.db"]);
});

it("reports no backup when the folder does not exist yet", () => {
  expect(latestBackupAt(path.join(tmpdir(), "no-such-backups"))).toBeNull();
});
