import fs from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

const css = fs.readFileSync(path.join(import.meta.dirname, "styles.css"), "utf8");

function token(name: string): string {
  const match = new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6});`, "i").exec(css);
  if (!match?.[1]) {
    throw new Error(`No hex value for --color-${name}`);
  }
  return match[1];
}

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = (hex.slice(1).match(/../g) ?? []).map((pair) => {
    const value = Number.parseInt(pair, 16) / 255;
    return value <= 0.039_28 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(token(foreground)), luminance(token(background))].toSorted(
    (a, b) => b - a,
  );
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

// WCAG 1.4.3 asks 4.5:1 of text, 1.4.11 asks 3:1 of controls' edges and chart marks.
it.each([
  ["success", "success-soft", 4.5, "the On target badge"],
  ["muted-foreground", "card", 4.5, "hints and placeholders"],
  ["input-border", "card", 3, "an input's edge"],
  ["primary-strong", "card", 3, "the focus ring and chart bar outlines"],
])("keeps %s on %s at %s:1 for %s", (foreground, background, minimum) => {
  expect(contrast(foreground, background)).toBeGreaterThanOrEqual(minimum);
});
