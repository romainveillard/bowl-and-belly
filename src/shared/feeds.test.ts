import { expect, it } from "vitest";
import { leftoverFits } from "./feeds.js";

it("accepts a leftover from nothing up to the whole serving, in whole grams", () => {
  expect([0, 20].map((leftoverG) => leftoverFits(leftoverG, 20))).toEqual([true, true]);
  expect([-1, 21, 2.5].map((leftoverG) => leftoverFits(leftoverG, 20))).toEqual([
    false,
    false,
    false,
  ]);
});
