import { validate } from "../validate.js";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import sharp from "sharp";
import { z } from "zod";
import { db } from "../db/client.js";
import { image } from "../db/schema.js";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_SIDE_PX = 800;

export const imagesRoutes = new Hono()
  .post(
    "/",
    bodyLimit({
      maxSize: MAX_UPLOAD_BYTES,
      onError: (c) => c.json({ code: "image_too_large" as const }, 413),
    }),
    validate("form", z.object({ photo: z.instanceof(File) })),
    async (c) => {
      const { photo } = c.req.valid("form");
      let data: Buffer;
      try {
        data = await sharp(await photo.arrayBuffer())
          // Phone photos carry their orientation as metadata, which WebP output drops.
          .rotate()
          .resize({
            width: MAX_SIDE_PX,
            height: MAX_SIDE_PX,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 80 })
          .toBuffer();
      } catch {
        return c.json({ code: "invalid_image" as const }, 400);
      }
      const created = db.insert(image).values({ data }).returning({ id: image.id }).get();
      return c.json({ id: created.id }, 201);
    },
  )
  .get("/:id", validate("param", z.object({ id: z.coerce.number().int() })), (c) => {
    const { id } = c.req.valid("param");
    const row = db.select({ data: image.data }).from(image).where(eq(image.id, id)).get();
    if (!row) {
      return c.json({ code: "not_found" as const }, 404);
    }
    // An image row is never rewritten, and ids are not reused.
    return c.body(new Uint8Array(row.data), 200, {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=31536000, immutable",
    });
  });
