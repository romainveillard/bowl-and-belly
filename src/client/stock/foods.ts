import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { i18n as I18n, TFunction } from "i18next";
import type { InferRequestType, InferResponseType } from "hono/client";
import { stockParts } from "../../shared/stock.js";
import { api } from "../api.js";
import { apiError } from "../lib/apiError.js";
import { AFFECTED, refresh } from "../lib/refresh.js";

const foods = api.api.foods;

export type FoodSummary = InferResponseType<typeof foods.$get, 200>["foods"][number];
export type FoodDetail = InferResponseType<(typeof foods)[":id"]["$get"], 200>;
export type FoodBody = InferRequestType<typeof foods.$post>["json"];
export type KcalBackfill = InferRequestType<(typeof foods)[":id"]["$put"]>["json"]["kcalBackfill"];

export function useFoods() {
  return useQuery({
    queryKey: ["foods"],
    queryFn: async () => {
      const response = await foods.$get();
      if (!response.ok) {
        throw new Error("Could not load foods");
      }
      return response.json();
    },
  });
}

export function useFood(id: number | undefined) {
  return useQuery({
    queryKey: ["foods", id],
    enabled: id !== undefined,
    queryFn: async () => {
      const response = await foods[":id"].$get({ param: { id: String(id) } });
      if (!response.ok) {
        throw new Error("Could not load the food");
      }
      return response.json();
    },
  });
}

export function useArchivedFoods() {
  return useQuery({
    queryKey: ["foods", "archived"],
    queryFn: async () => {
      const response = await foods.archived.$get();
      if (!response.ok) {
        throw new Error("Could not load archived foods");
      }
      return response.json();
    },
  });
}

export function useFoodTypes() {
  return useQuery({
    queryKey: ["food-types"],
    queryFn: async () => {
      const response = await api.api["food-types"].$get();
      if (!response.ok) {
        throw new Error("Could not load food types");
      }
      return response.json();
    },
  });
}

/** Creates the food, or updates it when `id` is given. */
export function useSaveFood(id: number | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { failed: "food" },
    mutationFn: async ({
      body,
      keepStock,
      kcalBackfill,
    }: {
      body: FoodBody;
      /** Leaves an edited food's stock as the server has it, not as the form loaded it. */
      keepStock: boolean;
      kcalBackfill: KcalBackfill;
    }) => {
      const { stockG, ...rest } = body;
      const response =
        id === undefined
          ? await foods.$post({ json: body })
          : await foods[":id"].$put({
              param: { id: String(id) },
              json: keepStock ? { ...rest, kcalBackfill } : { ...rest, stockG, kcalBackfill },
            });
      if (!response.ok) {
        throw await apiError(response);
      }
    },
    onSuccess: () => refresh(queryClient, AFFECTED.food),
  });
}

export function useRestock(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { failed: "restock" },
    mutationFn: async (addG: number) => {
      const response = await foods[":id"].restock.$post({
        param: { id: String(id) },
        json: { addG },
      });
      if (!response.ok) {
        throw await apiError(response);
      }
    },
    onSuccess: () => refresh(queryClient, AFFECTED.food),
  });
}

/** Archives a food, or restores an archived one. */
export function useSetFoodArchived(action: "archive" | "restore") {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { failed: action === "archive" ? "archiveFood" : "restoreFood" },
    mutationFn: async (id: number) => {
      const response = await foods[":id"][action].$post({ param: { id: String(id) } });
      if (!response.ok) {
        throw await apiError(response);
      }
    },
    onSuccess: () => refresh(queryClient, AFFECTED.food),
  });
}

/** Whether a food is of the chosen type, if any, and has `search` in its name or brand. */
export function matchesFood(
  food: { name: string; brand: string | null; type: { id: number } },
  search: string,
  typeId: number | null,
  locale: string,
): boolean {
  const wanted = search.trim().toLocaleLowerCase(locale);
  return (
    (typeId === null || food.type.id === typeId) &&
    `${food.name} ${food.brand ?? ""}`.toLocaleLowerCase(locale).includes(wanted)
  );
}

export function foodTypeLabel(
  type: { systemKey: "wet" | "dry" | null; name: string | null },
  t: TFunction,
): string {
  return type.systemKey ? t(`foodType.${type.systemKey}`) : (type.name ?? "");
}

export const SUGGESTED_PORTIONS = ["pouch", "tin", "tray"] as const;
const LANGUAGES = ["en-GB", "fr"];

/**
 * A portion name is stored as the user chose or typed it. When it is one of
 * the suggested names, in any language the app ships, it can be counted and
 * translated properly.
 */
export function suggestedPortion(name: string, i18n: I18n) {
  return SUGGESTED_PORTIONS.find((key) =>
    LANGUAGES.some(
      (lng) => i18n.t(`portionName.${key}`, { lng }).toLowerCase() === name.toLowerCase(),
    ),
  );
}

/**
 * A typed name, as typed, with a plain "s" for more than one, which suits most
 * names in English and French. Never re-cased: German, for one, capitalises nouns.
 */
function typedPlural(name: string, count: number): string {
  return count === 1 || /[sxz]$/i.test(name) ? name : `${name}s`;
}

/** "8 pouches", "1 tin", "3 cartons". */
function countPortions(name: string, count: number, i18n: I18n): string {
  const suggested = suggestedPortion(name, i18n);
  return suggested
    ? i18n.t(`portion.${suggested}`, { count })
    : `${count} ${typedPlural(name, count)}`;
}

/** "Pouches", for a control that switches between grams and portions. */
export function portionPlural(name: string, i18n: I18n): string {
  const suggested = suggestedPortion(name, i18n);
  if (suggested) {
    return i18n.t(`portionPlural.${suggested}`);
  }
  return typedPlural(name, 2);
}

/**
 * The portions as a unit after a number, "pouches" or "sachets": its own key
 * rather than the label lower-cased, which not every language allows. A typed
 * name keeps its own casing, as everywhere.
 */
export function portionUnit(name: string, i18n: I18n): string {
  const suggested = suggestedPortion(name, i18n);
  return suggested ? i18n.t(`portionUnit.${suggested}`) : typedPlural(name, 2);
}

type Stocked = Pick<FoodSummary, "stockG" | "stockUnit" | "portionName" | "portionG">;

/** Feeds logged against a stale count can take stock below zero; it shows as out of stock. */
export function isOutOfStock(food: Stocked): boolean {
  return food.stockG <= 0;
}

/** Stock in the food's own unit: "1.4 kg", "650 g", "8 pouches + 45 g", "Out of stock". */
export function stockLabel(food: Stocked, i18n: I18n): string {
  if (isOutOfStock(food)) {
    return i18n.t("stock.out");
  }
  const counted = food.stockUnit === "portion" && food.portionName !== null;
  const parts = stockParts({ stockG: food.stockG, portionG: counted ? food.portionG : null });
  const grams = (value: number) => {
    const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 });
    return value >= 1000
      ? i18n.t("stock.kg", { value: number.format(value / 1000) })
      : i18n.t("stock.g", { value: number.format(value) });
  };
  if ("grams" in parts) {
    return grams(parts.grams);
  }
  // Less than one portion left reads better as plain grams than as "0 pouches + 45 g".
  if (parts.portions === 0) {
    return grams(parts.openG);
  }
  const portions = countPortions(food.portionName ?? "", parts.portions, i18n);
  return parts.openG > 0
    ? i18n.t("stock.withRemainder", { portions, grams: parts.openG })
    : portions;
}

/** "1.4 kg left", or "Out of stock" on its own. */
export function stockLeftLabel(food: Stocked, i18n: I18n): string {
  return isOutOfStock(food)
    ? i18n.t("stock.out")
    : i18n.t("stock.left", { stock: stockLabel(food, i18n) });
}

/** How many foods are in use; none means the first-run steps are not finished. */
export function useFoodCount() {
  return useQuery({
    queryKey: ["foods", "count"],
    queryFn: async () => {
      const response = await foods.count.$get();
      if (!response.ok) {
        throw new Error("Could not count foods");
      }
      return response.json();
    },
  });
}
