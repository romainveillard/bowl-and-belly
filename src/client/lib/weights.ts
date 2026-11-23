import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";
import { api } from "../api.js";

const weights = api.api.weights;

export type WeighInPrompt = NonNullable<InferResponseType<typeof weights.$post, 201>["prompt"]>;
export type AgePrompt = NonNullable<
  InferResponseType<(typeof api.api.pets)[":id"]["age-prompt"]["$get"], 200>
>;
export type TargetPrompt = WeighInPrompt | AgePrompt;

const refresh = (queryClient: QueryClient) => queryClient.invalidateQueries({ queryKey: ["pets"] });

/** Logs a weigh-in, or edits one when `id` is given. Resolves to the target suggestion, if any. */
export function useSaveWeight(petId: number, id: number | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reading: { weightG: number; date: string }) => {
      if (id === undefined) {
        const response = await weights.$post({ json: { petId, ...reading } });
        if (!response.ok) {
          throw new Error("Could not log the weight");
        }
        return (await response.json()).prompt;
      }
      const response = await weights[":id"].$put({ param: { id: String(id) }, json: reading });
      if (!response.ok) {
        throw new Error("Could not edit the weigh-in");
      }
      return (await response.json()).prompt;
    },
    onSuccess: () => refresh(queryClient),
  });
}

export function useDeleteWeight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await weights[":id"].$delete({ param: { id: String(id) } });
      if (!response.ok) {
        throw new Error("Could not delete the weigh-in");
      }
      return response.json();
    },
    onSuccess: () => refresh(queryClient),
  });
}

export function useRestoreWeight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: InferRequestType<typeof weights.restore.$post>["json"]) => {
      const response = await weights.restore.$post({ json });
      if (!response.ok) {
        throw new Error("Could not restore the weigh-in");
      }
    },
    onSuccess: () => refresh(queryClient),
  });
}

/** The once-per-age-step question, when it is due for this pet. */
export function useAgePrompt(petId: number | undefined) {
  return useQuery({
    queryKey: ["pets", petId, "age-prompt"],
    enabled: petId !== undefined,
    queryFn: async () => {
      const response = await api.api.pets[":id"]["age-prompt"].$get({
        param: { id: String(petId) },
      });
      if (!response.ok) {
        throw new Error("Could not check the target");
      }
      return response.json();
    },
  });
}

export function useAnswerAgePrompt(petId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (answer: { months: number; update: boolean }) => {
      const response = await api.api.pets[":id"]["age-prompt"].$post({
        param: { id: String(petId) },
        json: answer,
      });
      if (!response.ok) {
        throw new Error("Could not answer the question");
      }
    },
    onSuccess: () => refresh(queryClient),
  });
}
