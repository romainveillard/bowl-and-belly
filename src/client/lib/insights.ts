import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { api } from "../api.js";

export type Insights = InferResponseType<typeof api.api.insights.$get, 200>;

export function useInsights(
  petId: number | undefined,
  from: string,
  to: string,
  weightsFrom?: string,
) {
  return useQuery({
    // Under "feeds", so that logging or editing a feed refreshes the charts too.
    queryKey: ["feeds", petId, "insights", from, to, weightsFrom],
    enabled: petId !== undefined && from !== "",
    queryFn: async () => {
      const response = await api.api.insights.$get({
        query: { petId: String(petId), from, to, ...(weightsFrom ? { weightsFrom } : {}) },
      });
      if (!response.ok) {
        throw new Error("Could not load insights");
      }
      return response.json();
    },
  });
}
