import { eq } from "drizzle-orm";
import type { DbOrTx } from "../db/open.js";
import { image } from "../db/schema.js";

/** Deletes a pet's or food's photo once its form replaced or removed it: nothing else shows it. */
export function dropReplacedPhoto(
  db: DbOrTx,
  beforeId: number | null,
  afterId: number | null,
): void {
  if (beforeId !== null && beforeId !== afterId) {
    db.delete(image).where(eq(image.id, beforeId)).run();
  }
}
