import { PET_TYPE_KEYS } from "../../shared/enums.js";
import type { Db } from "./open.js";
import { foodType, petType, settings } from "./schema.js";

// Runs on every start-up, so it must only ever add what is missing: existing
// rows, the settings row above all, are left exactly as the user has them.
export function seed(db: Db): void {
  db.insert(petType)
    .values(PET_TYPE_KEYS.map((systemKey) => ({ systemKey })))
    .onConflictDoNothing()
    .run();

  db.insert(foodType)
    .values([
      { systemKey: "wet", leftoverReturnsToStock: false },
      { systemKey: "dry", leftoverReturnsToStock: true },
    ])
    .onConflictDoNothing()
    .run();

  db.insert(settings)
    .values({ id: 1, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })
    .onConflictDoNothing()
    .run();
}
