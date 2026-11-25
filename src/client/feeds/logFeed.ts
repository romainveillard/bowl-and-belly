import type { PickerFood } from "./feeds.js";
import { parsePositive } from "../lib/format.js";

export type AmountUnit = "g" | "portion";
type PortionFood = Pick<PickerFood, "stockUnit" | "portionG">;

export const countsInPortions = (food: PortionFood) =>
  food.stockUnit === "portion" && food.portionG !== null;

/**
 * What the amount starts at for a food: the last amount served to this pet,
 * in portions when it was a whole number of them, or one portion if a
 * portion-counted food was never fed.
 */
export function startingAmount(food: PortionFood & Pick<PickerFood, "lastServedG">): {
  amount: string;
  unit: AmountUnit;
} {
  if (countsInPortions(food) && food.portionG) {
    if (food.lastServedG === null) {
      return { amount: "1", unit: "portion" };
    }
    if (food.lastServedG % food.portionG === 0) {
      return { amount: String(food.lastServedG / food.portionG), unit: "portion" };
    }
  }
  return { amount: food.lastServedG === null ? "" : String(food.lastServedG), unit: "g" };
}

/** The whole grams an amount stands for, or null while it isn't a number. */
export function servedGrams(amount: string, unit: AmountUnit, food: PortionFood): number | null {
  const value = parsePositive(amount);
  if (value === null) {
    return null;
  }
  const inPortions = countsInPortions(food) && unit === "portion" && food.portionG;
  return Math.round(inPortions ? value * (food.portionG ?? 1) : value);
}

/** The same quantity counted in `unit`, for when the toggle switches. */
export function amountIn(grams: number | null, unit: AmountUnit, portionG: number | null): string {
  if (grams === null || !portionG) {
    return "";
  }
  return unit === "g" ? String(grams) : String(Math.round((grams / portionG) * 100) / 100);
}
