/** kcal in `grams` of a food, unrounded so that totals are rounded once. */
export function kcalIn(grams: number, kcalPerKg: number): number {
  return (grams * kcalPerKg) / 1000;
}

/** A leftover is whole grams, from nothing at all up to what was served. */
export function leftoverFits(leftoverG: number, servedG: number): boolean {
  return Number.isInteger(leftoverG) && leftoverG >= 0 && leftoverG <= servedG;
}
