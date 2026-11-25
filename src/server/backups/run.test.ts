import { chmodSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it, vi } from "vitest";
import { openDatabase } from "../db/open.js";
import { settings } from "../db/schema.js";
import { runBackup } from "./run.js";

it("records a failure until a backup succeeds", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const db = openDatabase(":memory:");
  const failure = () =>
    db.select({ at: settings.backupFailedAt, error: settings.backupError }).from(settings).get();
  const dir = mkdtempSync(path.join(tmpdir(), "backups-"));
  chmodSync(dir, 0o500);

  expect(runBackup(db, dir, new Date("2026-11-22T03:30:00Z"))).toBe("cannot_write");
  expect(failure()).toEqual({ at: new Date("2026-11-22T03:30:00Z"), error: "cannot_write" });

  chmodSync(dir, 0o700);
  expect(runBackup(db, dir, new Date("2026-11-23T03:30:00Z"))).toBeNull();
  expect(failure()).toEqual({ at: null, error: null });
});

it("doesn't call a double click within one second a failure", () => {
  const db = openDatabase(":memory:");
  const dir = mkdtempSync(path.join(tmpdir(), "backups-"));
  const at = new Date("2026-11-23T03:30:00Z");

  expect(runBackup(db, dir, at)).toBeNull();
  expect(runBackup(db, dir, at)).toBeNull();
});

it("reports a failure rather than throwing, since a throw from its timer ends the process", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const db = openDatabase(":memory:");
  // Even reading the settings, and recording the failure, now throw.
  db.$client.close();

  expect(runBackup(db, mkdtempSync(path.join(tmpdir(), "backups-")), new Date())).toBe("unknown");
});
