import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { staticFiles } from "./staticFiles.js";

const root = mkdtempSync(path.join(tmpdir(), "client-"));
mkdirSync(path.join(root, "assets"));
writeFileSync(path.join(root, "index.html"), "<!doctype html>");
writeFileSync(path.join(root, "assets", "app-a1b2c3.js"), "export {};");
const site = staticFiles(root);

const cacheControl = async (url: string) => (await site.request(url)).headers.get("Cache-Control");

it("keeps hashed assets for good, but always revalidates the page", async () => {
  expect(await cacheControl("/assets/app-a1b2c3.js")).toBe("public, max-age=31536000, immutable");
  expect(await cacheControl("/")).toBe("no-cache");
  expect(await cacheControl("/stock")).toBe("no-cache");
});

it("answers an asset from an earlier build with a 404 that isn't kept", async () => {
  const response = await site.request("/assets/app-old999.js");

  expect([response.status, response.headers.get("Cache-Control")]).toEqual([404, "no-cache"]);
});
