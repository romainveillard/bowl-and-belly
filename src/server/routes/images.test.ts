import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

// The app opens its database on import, so it gets a folder of its own.
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "bowl-images-"));
const { web } = await import("../web.js");

async function upload(bytes: Uint8Array, name: string) {
  const form = new FormData();
  form.append("photo", new File([bytes], name));
  const response = await web.request("http://localhost/api/images", {
    method: "POST",
    headers: { origin: "http://localhost" },
    body: form,
  });
  return [response.status, await response.json()];
}

const square = sharp({
  create: { width: 4, height: 4, channels: 3, background: "#f08a4b" },
});

describe("POST /api/images", () => {
  it("takes photo formats", async () => {
    const [status] = await upload(await square.clone().png().toBuffer(), "photo.png");

    expect(status).toBe(201);
  });

  it("refuses images sharp can read that aren't photos", async () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4"/></svg>',
    );

    expect(await upload(svg, "photo.svg")).toEqual([400, { code: "invalid_image" }]);
  });
});
