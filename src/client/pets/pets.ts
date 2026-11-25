import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";
import { explainTarget } from "../../shared/target.js";
import { api } from "../api.js";

const pets = api.api.pets;

export type PetSummary = InferResponseType<typeof pets.$get, 200>["pets"][number];
export type PetDetail = InferResponseType<(typeof pets)[":id"]["$get"], 200>;
export type PetBody = InferRequestType<typeof pets.$post>["json"];

export function usePets() {
  return useQuery({
    queryKey: ["pets"],
    queryFn: async () => {
      const response = await pets.$get();
      if (!response.ok) {
        throw new Error("Could not load pets");
      }
      return response.json();
    },
  });
}

export function usePet(id: number | undefined) {
  return useQuery({
    queryKey: ["pets", id],
    enabled: id !== undefined,
    queryFn: async () => {
      const response = await pets[":id"].$get({ param: { id: String(id) } });
      if (!response.ok) {
        throw new Error("Could not load the pet");
      }
      return response.json();
    },
  });
}

export function usePetTypes() {
  return useQuery({
    queryKey: ["pet-types"],
    queryFn: async () => {
      const response = await api.api["pet-types"].$get();
      if (!response.ok) {
        throw new Error("Could not load pet types");
      }
      return response.json();
    },
  });
}

/**
 * Creates the pet, or updates it when `id` is given. Resolves to the pet's id
 * and, after an update, to the new daily target if the edit changed it.
 */
export function useSavePet(id: number | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: PetBody) => {
      if (id === undefined) {
        const response = await pets.$post({ json });
        if (!response.ok) {
          throw new Error("Could not create the pet");
        }
        return { id: (await response.json()).id, targetKcal: null };
      }
      const response = await pets[":id"].$put({ param: { id: String(id) }, json });
      if (!response.ok) {
        throw new Error("Could not update the pet");
      }
      return { id, targetKcal: (await response.json()).targetKcal };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pets"] }),
  });
}

export function useArchivedPets() {
  return useQuery({
    queryKey: ["pets", "archived"],
    queryFn: async () => {
      const response = await pets.archived.$get();
      if (!response.ok) {
        throw new Error("Could not load archived pets");
      }
      return response.json();
    },
  });
}

/** Archives a pet, or restores an archived one. */
export function useSetArchived(action: "archive" | "restore") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await pets[":id"][action].$post({ param: { id: String(id) } });
      if (!response.ok) {
        throw new Error(`Could not ${action} the pet`);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pets"] }),
  });
}

/** Sets the user's own target, or goes back to the calculated one with null. */
export function useSetTarget(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (manualTargetKcal: number | null) => {
      const response = await pets[":id"].target.$put({
        param: { id: String(id) },
        json: { manualTargetKcal },
      });
      if (!response.ok) {
        throw new Error("Could not set the target");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pets"] }),
  });
}

export async function uploadPhoto(photo: File): Promise<number> {
  const response = await api.api.images.$post({ form: { photo } });
  if (!response.ok) {
    throw new Error("Could not upload the photo");
  }
  return (await response.json()).id;
}

/** How many foods are in use; none means the first-run steps are not finished. */
export function useFoodCount() {
  return useQuery({
    queryKey: ["foods", "count"],
    queryFn: async () => {
      const response = await api.api.foods.count.$get();
      if (!response.ok) {
        throw new Error("Could not count foods");
      }
      return response.json();
    },
  });
}

/** What the target formula reads from a pet. */
type FormulaPet = Pick<
  PetDetail,
  | "type"
  | "birthDate"
  | "today"
  | "neutered"
  | "activityLevel"
  | "goal"
  | "targetWeightG"
  | "weights"
>;

/** What the formula gives for the pet as it is today, and how; null for custom types. */
export function suggestionFor(pet: FormulaPet) {
  if (!pet.type.systemKey) {
    return null;
  }
  return explainTarget({
    petType: pet.type.systemKey,
    birthDate: pet.birthDate,
    today: pet.today,
    neutered: pet.neutered,
    activityLevel: pet.activityLevel,
    goal: pet.goal,
    targetWeightG: pet.targetWeightG,
    weightG: pet.weights[0]?.weightG ?? null,
  });
}

/** The target in force on `day`. */
export function targetOn(pet: Pick<PetDetail, "targets">, day: string) {
  return pet.targets.find((target) => target.effectiveFrom <= day);
}

/**
 * How a target came about: the user's own, a calculation the pet's profile
 * no longer gives (it has changed since), or what the formula gives today,
 * with the row of the factor table behind it.
 */
export function targetBasis(
  pet: FormulaPet,
  target: { kcalPerDay: number; source: "calculated" | "manual" },
) {
  if (target.source === "manual") {
    return { kind: "manual" as const };
  }
  const suggestion = suggestionFor(pet);
  if (!suggestion || suggestion.kcalPerDay !== target.kcalPerDay) {
    return { kind: "calculated" as const };
  }
  const neutered = pet.neutered ? "Neutered" : "Intact";
  const activity = pet.activityLevel === "active" ? "Active" : "Normal";
  const row =
    suggestion.basis === "adult" ? (`adult${neutered}${activity}` as const) : suggestion.basis;
  return { kind: "formula" as const, suggestion, row };
}
