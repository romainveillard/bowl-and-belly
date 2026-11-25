import { expect, it } from "vitest";
import { dragCloses } from "./sheetDrag.js";

// A 600 px sheet closes when dragged more than 150 px.
it("closes a sheet dragged past a quarter of its height, however slowly", () => {
  expect(dragCloses(151, 2000, 600)).toBe(true);
  expect(dragCloses(149, 2000, 600)).toBe(false);
});

it("closes on a quick flick well short of that", () => {
  expect(dragCloses(60, 80, 600)).toBe(true);
});

it("ignores a fast twitch too short to be a flick", () => {
  expect(dragCloses(20, 10, 600)).toBe(false);
});
