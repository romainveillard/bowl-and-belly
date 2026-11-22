import { sql } from "drizzle-orm";
import type { Db } from "./open.js";
import { food, image, pet } from "./schema.js";

/**
 * Deletes photos nothing points at. A photo is uploaded before its form is
 * saved, so an abandoned form leaves one behind. Only safe at start-up, when
 * no form can be between its upload and its save.
 */
export function removeUnusedImages(db: Db): void {
  db.delete(image)
    .where(
      sql`${image.id} NOT IN (
        SELECT ${pet.photoId} FROM ${pet} WHERE ${pet.photoId} IS NOT NULL
        UNION SELECT ${food.photoId} FROM ${food} WHERE ${food.photoId} IS NOT NULL
      )`,
    )
    .run();
}
