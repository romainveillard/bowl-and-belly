import { expect, it } from "vitest";
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

// French puts a space before these marks; an ordinary one lets the mark wrap onto a line alone.
it("keeps French punctuation on the line of the word before it", () => {
  const breakable = strings(fr).filter(([, text]) => / [?!;:%»]|« /.test(text));
  expect(breakable).toEqual([]);
});
