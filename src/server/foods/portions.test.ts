import { expect, it } from "vitest";
import { portionsFor } from "./portions.js";

const pouches = { portionName: "Pouch", portionG: 85, stockUnit: "portion" } as const;
const none = { portionName: null, portionG: null, stockUnit: "g" };

it("keeps portions on wet and custom food types, counted either way", () => {
  expect(portionsFor(pouches, "wet")).toEqual(pouches);
  expect(portionsFor(pouches, null)).toEqual(pouches);
  expect(portionsFor({ ...pouches, stockUnit: "g" }, "wet")).toEqual({
    ...pouches,
    stockUnit: "g",
  });
});

it("drops portions from dry food and counts it in grams", () => {
  expect(portionsFor(pouches, "dry")).toEqual(none);
});

it("does not count in portions without a complete portion", () => {
  expect(portionsFor({ ...pouches, portionG: null }, "wet")).toEqual(none);
  expect(portionsFor({ ...pouches, portionName: null }, "wet")).toEqual(none);
});
