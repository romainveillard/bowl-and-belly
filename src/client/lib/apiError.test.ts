import fs from "node:fs";
import path from "node:path";
import i18next from "i18next";
import ICU from "i18next-icu";
import { expect, it } from "vitest";
import enGB from "../i18n/locales/en-GB.json" with { type: "json" };
import fr from "../i18n/locales/fr.json" with { type: "json" };
import { ApiError, failureReason } from "./apiError.js";

const i18n = i18next.createInstance();
await i18n.use(ICU).init({
  lng: "en-GB",
  resources: { "en-GB": { translation: enGB }, fr: { translation: fr } },
});

/** Every `code: "…"` the server source answers with. */
function serverCodes(): Set<string> {
  const codes = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".ts") && !entry.name.includes(".test.")) {
        for (const match of fs.readFileSync(full, "utf8").matchAll(/code: "([a-z_]+)"/g)) {
          codes.add(match[1] ?? "");
        }
      }
    }
  };
  walk(path.join(import.meta.dirname, "../../server"));
  return codes;
}

it("has a message in every language for every code the API answers with", () => {
  const codes = serverCodes();
  // A guard that the scan still finds the codes, wherever they move to.
  expect(codes.has("not_found")).toBe(true);
  for (const errors of [enGB.errors, fr.errors]) {
    const missing = [...codes].filter((code) => !(code in errors));
    expect(missing).toEqual([]);
  }
});

it("explains a refused save by its code, falling back when the code is unknown", () => {
  expect(failureReason(new ApiError("in_future"), i18n.t)).toBe(
    "The date and time can’t be in the future.",
  );
  expect(failureReason(new ApiError("brand_new_code"), i18n.t)).toBe(
    "Something went wrong. Try again.",
  );
  expect(failureReason(new ApiError(null), i18n.t)).toBe("Something went wrong. Try again.");
});

it("blames the connection when the server can't be reached", () => {
  expect(failureReason(new TypeError("Failed to fetch"), i18n.t)).toBe(
    "Check your connection and try again.",
  );
});

it("stays quiet for codes that have a notice of their own", () => {
  expect(failureReason(new ApiError("demo_limit"), i18n.t)).toBeNull();
  expect(failureReason(new ApiError("unauthorised"), i18n.t)).toBeNull();
});
