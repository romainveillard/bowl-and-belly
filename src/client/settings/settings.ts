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

/** The fields a save sends, taken from the settings as loaded. */
export function bodyOf(current: Settings): SettingsBody {
  return {
    timeZone: current.timeZone,
    dayStartsAt: current.dayStartsAt,
    backupEnabled: current.backupEnabled,
    backupFrequency: current.backupFrequency,
    backupWeekday: current.backupWeekday,
    backupTime: current.backupTime,
    backupKeep: current.backupKeep,
  };
}

/** Shows the change at once, and puts the stored settings back if the save fails. */
export function useSaveSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: SettingsBody) => {
      const response = await settings.$put({ json: body });
      if (!response.ok) {
        throw new Error("Could not save the settings");
      }
    },
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: ["settings"] });
      const previous = queryClient.getQueryData<Settings>(["settings"]);
      if (previous) {
        queryClient.setQueryData<Settings>(["settings"], { ...previous, ...body });
      }
      return { previous };
    },
    onError: (_error, _body, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["settings"], context.previous);
      }
      return queryClient.invalidateQueries({ queryKey: ["settings"] });
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
