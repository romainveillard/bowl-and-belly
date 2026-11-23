export interface Stock {
  stockG: number;
  /** Set when the food is counted in portions. */
  portionG: number | null;
}

/**
 * Stock as it is shown: whole portions plus what is left of an open one, or
 * plain grams. Stock can run below zero when feeds are logged against a stale
 * figure; that shows as empty.
 */
export function stockParts(stock: Stock): { portions: number; openG: number } | { grams: number } {
  const grams = Math.max(stock.stockG, 0);
  if (stock.portionG === null) {
    return { grams };
  }
  return { portions: Math.floor(grams / stock.portionG), openG: grams % stock.portionG };
}

/** Labels print kcal per 100 g or per kg; the app stores kcal per kg. */
export function kcalPerKg(value: number, per: "100g" | "kg"): number {
  return Math.round(per === "100g" ? value * 10 : value);
}
