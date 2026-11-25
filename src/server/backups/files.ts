import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import type { Db } from "../db/open.js";

// Compact UTC stamps sort by name in time order, and the pattern keeps
// retention away from anything else an operator drops in the folder.
const BACKUP_NAME = /^bowl-and-belly-(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z\.db$/;

function nameAt(at: Date): string {
  const stamp = at.toISOString().slice(0, 19).replaceAll(/[-:]/g, "");
  return `bowl-and-belly-${stamp}Z.db`;
}

function backupNames(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((name) => BACKUP_NAME.test(name))
    .toSorted();
}

/** Writes a consistent copy of the live database; a plain file copy of it is not safe. */
export function copyDatabase(db: Db, file: string): void {
  db.$client.prepare("VACUUM INTO ?").run(file);
}

/** Writes a backup into `dir`, then keeps only the newest `keep` backups there. */
export function writeBackup(db: Db, dir: string, at: Date, keep: number): void {
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, nameAt(at));
  // Names go to the second and VACUUM INTO refuses an existing file, so a
  // second backup within the same second, such as a double click, keeps the first.
  if (!existsSync(file)) {
    // Written aside, then renamed in one step, so a copy cut short by a
    // stopped container or a full disk never passes for a backup. One left
    // by an earlier run would make VACUUM INTO refuse.
    const partial = `${file}.partial`;
    rmSync(partial, { force: true });
    try {
      copyDatabase(db, partial);
    } catch (error) {
      rmSync(partial, { force: true });
      throw error;
    }
    renameSync(partial, file);
  }
  const names = backupNames(dir);
  for (const name of names.slice(0, Math.max(0, names.length - keep))) {
    rmSync(path.join(dir, name));
  }
}

export function latestBackupAt(dir: string): Date | null {
  const match = BACKUP_NAME.exec(backupNames(dir).at(-1) ?? "");
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second] = match;
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
}
