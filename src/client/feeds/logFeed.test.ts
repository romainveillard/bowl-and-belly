import { describe, expect, it } from "vitest";
import { amountIn, servedGrams, startingAmount } from "./logFeed.js";

const pouches = { stockUnit: "portion", portionG: 85 } as const;
const kibbles = { stockUnit: "g", portionG: null } as const;

describe("startingAmount", () => {
  it("starts a portion-counted food at one portion until it has been fed", () => {
    expect(startingAmount({ ...pouches, lastServedG: null })).toEqual({
      amount: "1",
      unit: "portion",
    });
  });

  it("repeats the last amount, in portions only when it was a whole number of them", () => {
    expect(startingAmount({ ...pouches, lastServedG: 170 })).toEqual({
      amount: "2",
      unit: "portion",
    });
    expect(startingAmount({ ...pouches, lastServedG: 60 })).toEqual({ amount: "60", unit: "g" });
    expect(startingAmount({ ...kibbles, lastServedG: 20 })).toEqual({ amount: "20", unit: "g" });
  });
});

describe("servedGrams", () => {
  it("counts portions by the food's portion weight, to the nearest gram", () => {
    expect(servedGrams("1.5", "portion", pouches)).toBe(128);
    expect(servedGrams("1.5", "g", pouches)).toBe(2);
    expect(servedGrams("", "portion", pouches)).toBeNull();
  });
});

describe("amountIn", () => {
  it("keeps the same quantity when switching between grams and portions", () => {
    expect(amountIn(170, "portion", 85, "en-GB")).toBe("2");
    expect(amountIn(100, "portion", 85, "en-GB")).toBe("1.18");
    expect(amountIn(100, "g", 85, "en-GB")).toBe("100");
    expect(amountIn(100, "portion", 85, "fr")).toBe("1,18");
  });
});
