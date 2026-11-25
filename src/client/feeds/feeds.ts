import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";
import { addDays } from "../../shared/app-day.js";
import { api } from "../api.js";
import { apiError } from "../lib/apiError.js";

const feeds = api.api.feeds;

export type DaySummary = InferResponseType<typeof feeds.$get, 200>["days"][number];
export type FeedEntry = DaySummary["entries"][number];
export type LogForm = InferResponseType<(typeof feeds)["log-form"]["$get"], 200>;
export type PickerFood = LogForm["foods"][number];
type LogBody = InferRequestType<typeof feeds.$post>["json"];

/** History loads this many days at a time as the user scrolls back. */
const HISTORY_WINDOW_DAYS = 14;

/** Everything a logged, deleted or restored feed changes: totals, stock and recents. */
function refreshAfterFeed(queryClient: QueryClient) {
  return Promise.all(
    ["feeds", "pets", "foods", "log-form"].map((key) =>
      queryClient.invalidateQueries({ queryKey: [key] }),
    ),
  );
}

async function loadDays(petId: number, from: string, to: string) {
  const response = await feeds.$get({ query: { petId: String(petId), from, to } });
  if (!response.ok) {
    throw new Error("Could not load feeds");
  }
  return response.json();
}

export function useDay(petId: number | undefined, day: string | undefined) {
  return useQuery({
    queryKey: ["feeds", petId, day],
    enabled: petId !== undefined && day !== undefined,
    queryFn: async () => {
      const result = await loadDays(petId ?? 0, day ?? "", day ?? "");
      return result.days[0];
    },
  });
}

export function useHistory(petId: number | undefined, today: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["feeds", petId, "history", today],
    enabled: petId !== undefined && today !== undefined,
    initialPageParam: today ?? "",
    queryFn: ({ pageParam }) =>
      loadDays(petId ?? 0, addDays(pageParam, 1 - HISTORY_WINDOW_DAYS), pageParam),
    getNextPageParam: (page, _pages, to) =>
      page.hasEarlier ? addDays(to, -HISTORY_WINDOW_DAYS) : undefined,
  });
}

export function useLogForm(petId: number | undefined) {
  return useQuery({
    queryKey: ["log-form", petId],
    enabled: petId !== undefined,
    queryFn: async () => {
      const response = await feeds["log-form"].$get({ query: { petId: String(petId) } });
      if (!response.ok) {
        throw new Error("Could not load the foods");
      }
      return response.json();
    },
  });
}

/** Logs a feed and resolves to its id, so that it can be undone. */
export function useLogFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { failed: "feed" },
    mutationFn: async (json: LogBody) => {
      const response = await feeds.$post({ json });
      if (!response.ok) {
        throw await apiError(response);
      }
      return (await response.json()).id;
    },
    onSuccess: () => refreshAfterFeed(queryClient),
  });
}

/** Deletes a feed and resolves to what is needed to put it back. */
export function useDeleteFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { failed: "deleteFeed" },
    mutationFn: async (id: number) => {
      const response = await feeds[":id"].$delete({ param: { id: String(id) } });
      if (!response.ok) {
        throw await apiError(response);
      }
      return response.json();
    },
    onSuccess: () => refreshAfterFeed(queryClient),
  });
}

export function useEditFeed(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { failed: "feed" },
    mutationFn: async (json: InferRequestType<(typeof feeds)[":id"]["$put"]>["json"]) => {
      const response = await feeds[":id"].$put({ param: { id: String(id) }, json });
      if (!response.ok) {
        throw await apiError(response);
      }
    },
    onSuccess: () => refreshAfterFeed(queryClient),
  });
}

export function useAddLeftover(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { failed: "leftover" },
    mutationFn: async (
      json: InferRequestType<(typeof feeds)[":id"]["leftover"]["$put"]>["json"],
    ) => {
      const response = await feeds[":id"].leftover.$put({ param: { id: String(id) }, json });
      if (!response.ok) {
        throw await apiError(response);
      }
    },
    onSuccess: () => refreshAfterFeed(queryClient),
  });
}

export function useRestoreFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { failed: "restoreFeed" },
    mutationFn: async (json: InferRequestType<typeof feeds.restore.$post>["json"]) => {
      const response = await feeds.restore.$post({ json });
      if (!response.ok) {
        throw await apiError(response);
      }
    },
    onSuccess: () => refreshAfterFeed(queryClient),
  });
}
