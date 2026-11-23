import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import type { InferRequestType } from "hono/client";
import { api } from "../api.js";

const foodTypes = api.api["food-types"];
const petTypes = api.api["pet-types"];

export type TypeKind = "pet" | "food";
export type FoodTypeBody = InferRequestType<typeof foodTypes.$post>["json"];

// Labels of types appear on foods and pets, so those reload too.
const affected = { food: ["food-types", "foods"], pet: ["pet-types", "pets", "foods"] };

function useInvalidate(kind: TypeKind) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(affected[kind].map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
}

/** Creates the type, or updates it when `id` is given. Resolves to "name_taken" when refused. */
export function useSaveFoodType(id: number | undefined) {
  const invalidate = useInvalidate("food");

  return useMutation({
    mutationFn: async (body: FoodTypeBody) => {
      const response =
        id === undefined
          ? await foodTypes.$post({ json: body })
          : await foodTypes[":id"].$put({ param: { id: String(id) }, json: body });
      if (response.status === 409) {
        return "name_taken" as const;
      }
      if (!response.ok) {
        throw new Error("Could not save the food type");
      }
      return null;
    },
    onSuccess: invalidate,
  });
}

/** Creates the type, or updates it when `id` is given. Resolves to "name_taken" when refused. */
export function useSavePetType(id: number | undefined) {
  const invalidate = useInvalidate("pet");

  return useMutation({
    mutationFn: async (name: string) => {
      const response =
        id === undefined
          ? await petTypes.$post({ json: { name } })
          : await petTypes[":id"].$put({ param: { id: String(id) }, json: { name } });
      if (response.status === 409) {
        return "name_taken" as const;
      }
      if (!response.ok) {
        throw new Error("Could not save the pet type");
      }
      return null;
    },
    onSuccess: invalidate,
  });
}

/** Archives a custom type, or restores one. Resolves to "name_taken" when a restore is refused. */
export function useSetTypeArchived(kind: TypeKind, action: "archive" | "restore") {
  const invalidate = useInvalidate(kind);

  return useMutation({
    mutationFn: async (id: number) => {
      const route = kind === "food" ? foodTypes : petTypes;
      const response = await route[":id"][action].$post({ param: { id: String(id) } });
      if (response.status === 409) {
        return "name_taken" as const;
      }
      if (!response.ok) {
        throw new Error(`Could not ${action} the type`);
      }
      return null;
    },
    onSuccess: invalidate,
  });
}

/** The types a picker offers: active ones, plus the archived one a record still uses. */
export function offeredTypes<Type extends { id: number; archived: boolean }>(
  types: readonly Type[],
  current: number | null | undefined,
): Type[] {
  return types.filter((type) => !type.archived || type.id === current);
}

/** "Raw (archived)" for an archived type a record still uses. */
export function optionLabel(label: string, type: { archived: boolean }, t: TFunction): string {
  return type.archived ? t("types.archivedOption", { name: label }) : label;
}
