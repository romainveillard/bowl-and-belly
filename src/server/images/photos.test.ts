import { describe, expect, it } from "vitest";
import { openDatabase } from "../db/open.js";
import { image } from "../db/schema.js";
import { dropReplacedPhoto } from "./photos.js";

describe("dropReplacedPhoto", () => {
  it("deletes a photo the form replaced or removed, and keeps one it kept", () => {
    const db = openDatabase(":memory:");
    const [replaced, removed, kept, added] = db
      .insert(image)
      .values(Array.from({ length: 4 }, () => ({ data: Buffer.from("webp") })))
      .returning({ id: image.id })
      .all()
      .map((row) => row.id);

    dropReplacedPhoto(db, replaced ?? 0, added ?? 0);
    dropReplacedPhoto(db, removed ?? 0, null);
    dropReplacedPhoto(db, kept ?? 0, kept ?? 0);

    expect(
      db
        .select({ id: image.id })
        .from(image)
        .all()
        .map((row) => row.id),
    ).toEqual([kept, added]);
  });
});
