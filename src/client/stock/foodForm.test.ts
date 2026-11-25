import { describe, expect, it } from "vitest";
import { parseAmount, stockGramsOf, stockText } from "./foodForm.js";

describe("stockText", () => {
  it("shows portion-counted stock in portions, to one decimal", () => {
    expect(stockText({ stockG: 725, stockUnit: "portion", portionG: 85 }, "en-GB")).toMatchObject({
      stock: "8.5",
    });
  });

  it("switches gram-counted stock to kg from 1,000 g", () => {
    expect(stockText({ stockG: 999, stockUnit: "g", portionG: null }, "en-GB")).toEqual({
      stock: "999",
      stockIn: "g",
    });
    expect(stockText({ stockG: 1450, stockUnit: "g", portionG: null }, "en-GB")).toEqual({
      stock: "1.45",
      stockIn: "kg",
    });
  });

  it("writes the decimal the way the language does", () => {
    expect(stockText({ stockG: 1450, stockUnit: "g", portionG: null }, "fr").stock).toBe("1,45");
  });

  it("shows stock that ran below zero as none", () => {
    expect(stockText({ stockG: -40, stockUnit: "g", portionG: null }, "en-GB")).toEqual({
      stock: "0",
      stockIn: "g",
    });
  });
});

describe("stockGramsOf", () => {
  it("turns portions, kg or g back into whole grams", () => {
    expect(stockGramsOf(8.5, "g", 85)).toBe(723);
    expect(stockGramsOf(1.45, "kg", null)).toBe(1450);
    expect(stockGramsOf(999, "g", null)).toBe(999);
  });
});

describe("parseAmount", () => {
  it("reads a comma as a decimal point and nothing as zero", () => {
    expect(["", "1,4", "12"].map(parseAmount)).toEqual([0, 1.4, 12]);
    expect(["-1", "a few"].map(parseAmount)).toEqual([null, null]);
  });
});
