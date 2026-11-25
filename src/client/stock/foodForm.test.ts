import { describe, expect, it } from "vitest";
import {
  foodBodyOf,
  foodFormProblems,
  parseAmount,
  readFoodForm,
  stockGramsOf,
  stockText,
  type FoodFormState,
} from "./foodForm.js";

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

// Pouches of 85 g, 8 of them in stock.
const pouches: FoodFormState = {
  name: "Chicken in gravy",
  brand: "",
  photoId: null,
  foodTypeId: 1,
  petTypeId: null,
  kcal: "80",
  per: "100g",
  usePortion: true,
  portion: "pouch",
  otherPortion: "",
  portionG: "85",
  stock: "8",
  stockIn: "g",
  countIn: "portion",
};
const chosen = { foodTypeId: 1, petTypeId: null, portionName: "Pouch" };
const problemsOf = (form: FoodFormState, isDry = false) =>
  foodFormProblems(form, readFoodForm(form, isDry), "Pouch");

describe("foodFormProblems", () => {
  it("counts kcal or a portion weight that round to nothing as missing", () => {
    expect([...problemsOf({ ...pouches, kcal: "0,04", portionG: "0,4" }).keys()]).toEqual([
      "kcal",
      "portionG",
    ]);
  });

  it("ignores the portion fields for dry food, which has no portions", () => {
    expect(problemsOf({ ...pouches, portionG: "" }, true).size).toBe(0);
  });
});

describe("foodBodyOf", () => {
  it("counts stock in portions of the rounded portion weight", () => {
    const form = { ...pouches, portionG: "85,4" };

    expect(foodBodyOf(form, readFoodForm(form, false), chosen)).toMatchObject({
      kcalPerKg: 800,
      portionName: "Pouch",
      portionG: 85,
      stockUnit: "portion",
      stockG: 680,
    });
  });

  it("sends dry food in grams with no portion", () => {
    const form: FoodFormState = { ...pouches, stock: "1,5", stockIn: "kg" };

    expect(foodBodyOf(form, readFoodForm(form, true), chosen)).toMatchObject({
      portionName: null,
      portionG: null,
      stockUnit: "g",
      stockG: 1500,
    });
  });
});
