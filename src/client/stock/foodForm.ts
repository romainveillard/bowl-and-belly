import { kcalPerKg } from "../../shared/stock.js";
import { formatInputNumber, parsePositive } from "../lib/format.js";
import type { FoodBody, FoodDetail, SUGGESTED_PORTIONS } from "./foods.js";

export type PortionChoice = (typeof SUGGESTED_PORTIONS)[number] | "other";

export interface PortionValues {
  usePortion: boolean;
  portion: PortionChoice;
  otherPortion: string;
  portionG: string;
}

export interface StockValues {
  stock: string;
  stockIn: "g" | "kg";
  countIn: "g" | "portion";
}

export interface FoodFormState extends PortionValues, StockValues {
  name: string;
  brand: string;
  photoId: number | null;
  foodTypeId: number | null;
  /** Null suits any pet; undefined is "not chosen yet", which takes the default. */
  petTypeId: number | null | undefined;
  kcal: string;
  per: "100g" | "kg";
}

export type FoodFieldName = "name" | "kcal" | "portionName" | "portionG" | "stock";
/** Top to bottom on the form: the first invalid one takes focus. */
export const FOOD_FIELD_ORDER: FoodFieldName[] = [
  "name",
  "kcal",
  "portionName",
  "portionG",
  "stock",
];

/** The form's fields as numbers: null where one doesn't parse. Dry food has no portions. */
export function readFoodForm(form: FoodFormState, isDry: boolean) {
  const kcal = parsePositive(form.kcal);
  const usePortion = form.usePortion && !isDry;
  return {
    kcal,
    kcalStored: kcal === null ? null : kcalPerKg(kcal, form.per),
    usePortion,
    portionG: parsePositive(form.portionG),
    counted: usePortion && form.countIn === "portion",
    stockAmount: parseAmount(form.stock),
  };
}

type FoodFormValues = ReturnType<typeof readFoodForm>;

/** What keeps the form from saving, by field. Values that round to nothing count as missing. */
export function foodFormProblems(
  form: FoodFormState,
  values: FoodFormValues,
  portionName: string,
): Map<FoodFieldName, FoodFieldName> {
  const problems = new Map<FoodFieldName, FoodFieldName>();
  if (form.name.trim() === "") {
    problems.set("name", "name");
  }
  if (values.kcalStored === null || values.kcalStored === 0) {
    problems.set("kcal", "kcal");
  }
  if (values.usePortion && portionName === "") {
    problems.set("portionName", "portionName");
  }
  if (values.usePortion && (values.portionG === null || Math.round(values.portionG) === 0)) {
    problems.set("portionG", "portionG");
  }
  if (values.stockAmount === null) {
    problems.set("stock", "stock");
  }
  return problems;
}

/** The food to save, or null while the type, kcal or stock is missing. */
export function foodBodyOf(
  form: FoodFormState,
  values: FoodFormValues,
  chosen: { foodTypeId: number | null; petTypeId: number | null; portionName: string },
): FoodBody | null {
  if (chosen.foodTypeId === null || values.kcalStored === null || values.stockAmount === null) {
    return null;
  }
  const grams = values.usePortion && values.portionG !== null ? Math.round(values.portionG) : null;
  return {
    name: form.name,
    brand: form.brand.trim() || null,
    photoId: form.photoId,
    foodTypeId: chosen.foodTypeId,
    petTypeId: chosen.petTypeId,
    kcalPerKg: values.kcalStored,
    portionName: values.usePortion ? chosen.portionName : null,
    portionG: grams,
    stockUnit: values.counted ? "portion" : "g",
    stockG: stockGramsOf(values.stockAmount, form.stockIn, values.counted ? grams : null),
  };
}

/** A non-negative number from "12" or "1,4", nothing as 0; null when it is something else. */
export function parseAmount(text: string): number | null {
  if (text.trim() === "") {
    return 0;
  }
  const value = Number(text.trim().replace(",", "."));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Current stock as the form shows it: in portions for a portion-counted food,
 * otherwise in kg from 1,000 g. Stock that has run below zero shows as none.
 */
export function stockText(
  food: Pick<FoodDetail, "stockG" | "stockUnit" | "portionG">,
  locale: string,
): {
  stock: string;
  stockIn: "g" | "kg";
} {
  const stockG = Math.max(food.stockG, 0);
  const stockIn = stockG >= 1000 ? "kg" : "g";
  if (food.stockUnit === "portion" && food.portionG) {
    return { stock: formatInputNumber(stockG / food.portionG, locale, 1), stockIn };
  }
  return { stock: formatInputNumber(stockIn === "kg" ? stockG / 1000 : stockG, locale), stockIn };
}

/** The whole grams a stock figure stands for: in portions when `portionG` is set, else g or kg. */
export function stockGramsOf(amount: number, stockIn: "g" | "kg", portionG: number | null): number {
  return Math.round(amount * (portionG ?? (stockIn === "kg" ? 1000 : 1)));
}
