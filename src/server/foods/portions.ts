import type { STOCK_UNITS } from "../../shared/enums.js";

interface PortionChoice {
  portionName: string | null;
  portionG: number | null;
  stockUnit: (typeof STOCK_UNITS)[number];
}

/**
 * Dry food is never counted in portions, whatever the request says, and a
 * portion needs both its name and its weight to exist at all.
 */
export function portionsFor(choice: PortionChoice, foodTypeKey: string | null): PortionChoice {
  if (foodTypeKey === "dry" || choice.portionName === null || choice.portionG === null) {
    return { portionName: null, portionG: null, stockUnit: "g" };
  }
  return choice;
}
