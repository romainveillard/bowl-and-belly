import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";
import { api } from "../api.js";

const settings = api.api.settings;

export type Settings = InferResponseType<typeof settings.$get, 200>;
export type SettingsBody = InferRequestType<typeof settings.$put>["json"];

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await settings.$get();
      if (!response.ok) {
        throw new Error("Could not load the settings");
      }
      return response.json();
    },
  });
}

export function useSaveSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: SettingsBody) => {
      const response = await settings.$put({ json: body });
      if (!response.ok) {
        throw new Error("Could not save the settings");
      }
    },
    // The time zone and day start regroup every day the app shows.
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useBackUpNow() {
  const queryClient = useQueryClient();

  return useMutation({
    // A failed backup is recorded in the settings, which then show it.
    mutationFn: () => api.api.backups.$post(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
}
