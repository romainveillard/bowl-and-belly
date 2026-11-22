import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";
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

/** Creates the pet, or updates it when `id` is given. Resolves to the pet's id. */
export function useSavePet(id: number | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: PetBody) => {
      if (id === undefined) {
        const response = await pets.$post({ json });
        if (!response.ok) {
          throw new Error("Could not create the pet");
        }
        return (await response.json()).id;
      }
      const response = await pets[":id"].$put({ param: { id: String(id) }, json });
      if (!response.ok) {
        throw new Error("Could not update the pet");
      }
      return id;
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
