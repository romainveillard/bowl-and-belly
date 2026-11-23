import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { i18n as I18n, TFunction } from "i18next";
import type { InferRequestType, InferResponseType } from "hono/client";
import { stockParts } from "../../shared/stock.js";
import { api } from "../api.js";

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
    mutationFn: async ({ body, kcalBackfill }: { body: FoodBody; kcalBackfill: KcalBackfill }) => {
      const response =
        id === undefined
          ? await foods.$post({ json: body })
          : await foods[":id"].$put({
              param: { id: String(id) },
              json: { ...body, kcalBackfill },
            });
      if (!response.ok) {
        throw new Error("Could not save the food");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["foods"] }),
  });
}

export function useRestock(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (addG: number) => {
      const response = await foods[":id"].restock.$post({
        param: { id: String(id) },
        json: { addG },
      });
      if (!response.ok) {
        throw new Error("Could not restock the food");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["foods"] }),
  });
}

/** Archives a food, or restores an archived one. */
export function useSetFoodArchived(action: "archive" | "restore") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await foods[":id"][action].$post({ param: { id: String(id) } });
      if (!response.ok) {
        throw new Error(`Could not ${action} the food`);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["foods"] }),
  });
}

export function foodTypeLabel(
  type: { systemKey: "wet" | "dry" | null; name: string | null },
  t: TFunction,
): string {
  return type.systemKey ? t(`foodType.${type.systemKey}`) : (type.name ?? "");
}

const SUGGESTED_PORTIONS = ["pouch", "tin", "tray"] as const;
const LANGUAGES = ["en-GB", "fr"];

/**
 * A portion name is stored as the user chose or typed it. When it is one of
 * the suggested names, in any language the app ships, it can be counted and
 * translated properly.
 */
function suggestedPortion(name: string, i18n: I18n) {
  return SUGGESTED_PORTIONS.find((key) =>
    LANGUAGES.some(
      (lng) => i18n.t(`portionName.${key}`, { lng }).toLowerCase() === name.toLowerCase(),
    ),
  );
}

/** A typed name gets a plain "s", which suits most names in English and French. */
function typedPlural(name: string, count: number): string {
  const lower = name.toLowerCase();
  return count === 1 || /[sxz]$/.test(lower) ? lower : `${lower}s`;
}

/** "8 pouches", "1 tin", "3 cartons". */
export function countPortions(name: string, count: number, i18n: I18n): string {
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
  const plural = typedPlural(name, 2);
  return plural.charAt(0).toUpperCase() + plural.slice(1);
}

type Stocked = Pick<FoodSummary, "stockG" | "stockUnit" | "portionName" | "portionG">;

/** Stock in the food's own unit: "1.4 kg", "650 g", "8 pouches + 45 g open". */
export function stockLabel(food: Stocked, i18n: I18n): string {
  const counted = food.stockUnit === "portion" && food.portionName !== null;
  const parts = stockParts({ stockG: food.stockG, portionG: counted ? food.portionG : null });
  if ("grams" in parts) {
    const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 });
    return parts.grams >= 1000
      ? i18n.t("stock.kg", { value: number.format(parts.grams / 1000) })
      : i18n.t("stock.g", { value: number.format(parts.grams) });
  }
  const portions = countPortions(food.portionName ?? "", parts.portions, i18n);
  return parts.openG > 0 ? i18n.t("stock.withOpen", { portions, grams: parts.openG }) : portions;
}
