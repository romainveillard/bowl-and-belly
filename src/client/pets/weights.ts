import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";
import { api } from "../api.js";
import { apiError } from "../lib/apiError.js";

const weights = api.api.weights;

export type WeighInPrompt = NonNullable<InferResponseType<typeof weights.$post, 201>["prompt"]>;
export type AgePrompt = NonNullable<
  InferResponseType<(typeof api.api.pets)[":id"]["age-prompt"]["$get"], 200>
>;
export type TargetPrompt = WeighInPrompt | AgePrompt;

/** A reading this far from the one before is more likely a typo than a change. */
const BIG_CHANGE = 0.2;

/**
 * The reading a weigh-in dated `date` is a big change from, if it is one: the
 * latest reading on or before that day, else the latest of all. `others` is
 * newest first and leaves out the reading being edited.
 */
export function bigChangeFrom<Reading extends { weightG: number }>(
  weightG: number | null,
  date: string,
  others: readonly Reading[],
  dayOf: (reading: Reading) => string,
): Reading | undefined {
  const previous = others.find((reading) => dayOf(reading) <= date) ?? others[0];
  if (weightG === null || weightG <= 0 || previous === undefined) {
    return undefined;
  }
  return Math.abs(weightG - previous.weightG) > previous.weightG * BIG_CHANGE
    ? previous
    : undefined;
}

// Weigh-ins show on the pet and on the Insights weight chart, kept under "feeds".
const refresh = (queryClient: QueryClient) =>
  Promise.all(["pets", "feeds"].map((key) => queryClient.invalidateQueries({ queryKey: [key] })));

/** Logs a weigh-in, or edits one when `id` is given. Resolves to the target suggestion, if any. */
export function useSaveWeight(petId: number, id: number | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { failed: "weighIn" },
    mutationFn: async (reading: { weightG: number; date: string }) => {
      if (id === undefined) {
        const response = await weights.$post({ json: { petId, ...reading } });
        if (!response.ok) {
          throw await apiError(response);
        }
        return (await response.json()).prompt;
      }
      const response = await weights[":id"].$put({ param: { id: String(id) }, json: reading });
      if (!response.ok) {
        throw await apiError(response);
      }
      return (await response.json()).prompt;
    },
    onSuccess: () => refresh(queryClient),
  });
}

export function useDeleteWeight() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { failed: "deleteWeighIn" },
    mutationFn: async (id: number) => {
      const response = await weights[":id"].$delete({ param: { id: String(id) } });
      if (!response.ok) {
        throw await apiError(response);
      }
      return response.json();
    },
    onSuccess: () => refresh(queryClient),
  });
}

export function useRestoreWeight() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { failed: "restoreWeighIn" },
    mutationFn: async (json: InferRequestType<typeof weights.restore.$post>["json"]) => {
      const response = await weights.restore.$post({ json });
      if (!response.ok) {
        throw await apiError(response);
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
    meta: { failed: "answer" },
    mutationFn: async (answer: { months: number; update: boolean }) => {
      const response = await api.api.pets[":id"]["age-prompt"].$post({
        param: { id: String(petId) },
        json: answer,
      });
      if (!response.ok) {
        throw await apiError(response);
      }
    },
    onSuccess: () => refresh(queryClient),
  });
}
