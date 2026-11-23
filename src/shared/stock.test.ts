import { describe, expect, it } from "vitest";
import { kcalPerKg, stockParts } from "./stock.js";

describe("stockParts", () => {
  it("splits portion-counted stock into whole portions and an open one", () => {
    expect(stockParts({ stockG: 725, portionG: 85 })).toEqual({ portions: 8, openG: 45 });
    expect(stockParts({ stockG: 680, portionG: 85 })).toEqual({ portions: 8, openG: 0 });
    expect(stockParts({ stockG: 60, portionG: 85 })).toEqual({ portions: 0, openG: 60 });
  });

  it("leaves gram-counted stock in grams", () => {
    expect(stockParts({ stockG: 1400, portionG: null })).toEqual({ grams: 1400 });
  });

  it("shows stock that ran below zero as empty", () => {
    expect(stockParts({ stockG: -40, portionG: null })).toEqual({ grams: 0 });
    expect(stockParts({ stockG: -40, portionG: 85 })).toEqual({ portions: 0, openG: 0 });
  });
});

describe("kcalPerKg", () => {
  it("converts a per-100 g label value and keeps a per-kg one", () => {
    expect(kcalPerKg(80, "100g")).toBe(800);
    expect(kcalPerKg(372.5, "100g")).toBe(3725);
    expect(kcalPerKg(3700, "kg")).toBe(3700);
  });
});
