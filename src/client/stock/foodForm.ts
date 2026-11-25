import type { FoodDetail } from "./foods.js";

/** A figure for an input: rounded, with no trailing zeros. */
export const plain = (value: number, decimals = 2) =>
  String(Math.round(value * 10 ** decimals) / 10 ** decimals);

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
export function stockText(food: Pick<FoodDetail, "stockG" | "stockUnit" | "portionG">): {
  stock: string;
  stockIn: "g" | "kg";
} {
  const stockG = Math.max(food.stockG, 0);
  const stockIn = stockG >= 1000 ? "kg" : "g";
  if (food.stockUnit === "portion" && food.portionG) {
    return { stock: plain(stockG / food.portionG, 1), stockIn };
  }
  return { stock: plain(stockIn === "kg" ? stockG / 1000 : stockG), stockIn };
}

/** The whole grams a stock figure stands for: in portions when `portionG` is set, else g or kg. */
export function stockGramsOf(amount: number, stockIn: "g" | "kg", portionG: number | null): number {
  return Math.round(amount * (portionG ?? (stockIn === "kg" ? 1000 : 1)));
}
