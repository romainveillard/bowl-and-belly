import i18next from "i18next";
import ICU from "i18next-icu";
import { expect, it } from "vitest";
import enGB from "./locales/en-GB.json" with { type: "json" };
import fr from "./locales/fr.json" with { type: "json" };

function strings(node: unknown, path = ""): [string, string][] {
  if (typeof node === "string") {
    return [[path, node]];
  }
  if (typeof node !== "object" || node === null) {
    return [];
  }
  return Object.entries(node).flatMap(([key, value]) =>
    strings(value, path ? `${path}.${key}` : key),
  );
}

const argumentsOf = (text: string) =>
  [...new Set([...text.matchAll(/\{\s*(\w+)\s*[,}]/g)].map(([, name]) => name ?? ""))].toSorted(
    (a, b) => a.localeCompare(b),
  );
const signatures = (locale: unknown) =>
  Object.fromEntries(strings(locale).map(([key, text]) => [key, argumentsOf(text)]));

// Only en-GB is type-checked, and French has no English to fall back on.
it("has the same keys in both languages, each taking the same arguments", () => {
  expect(signatures(fr)).toEqual(signatures(enGB));
});

// French puts a space before these marks; an ordinary one lets the mark wrap onto a line alone.
it("keeps French punctuation on the line of the word before it", () => {
  const breakable = strings(fr).filter(([, text]) => / [?!;:%»]|« /.test(text));
  expect(breakable).toEqual([]);
});

// i18next-icu formats an argument only when the message says so.
it("formats the numbers in messages, which no plain argument would", () => {
  const plain = [enGB, fr].flatMap((locale) =>
    strings(locale).filter(([, text]) =>
      /\{(kcal|served|grams|target|eaten|resting|left|percent|count)\}/.test(text),
    ),
  );
  expect(plain).toEqual([]);
});

it("groups thousands as each language does", async () => {
  const i18n = i18next.createInstance();
  await i18n.use(ICU).init({
    lng: "en-GB",
    resources: { "en-GB": { translation: enGB }, fr: { translation: fr } },
  });

  expect(i18n.t("target.kcal", { kcal: 1500 })).toBe("1,500 kcal");
  // French groups with a narrow no-break space.
  expect(i18n.t("target.kcal", { kcal: 1500, lng: "fr" })).toBe("1\u202F500 kcal");
});
