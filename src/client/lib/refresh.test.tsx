import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { useSetTarget } from "../pets/pets.js";
import { useSaveFood } from "../stock/foods.js";

afterEach(() => vi.unstubAllGlobals());

// Today's day and Log feed, cached as the app caches them, and the API saying yes.
function cachedScreens() {
  const queryClient = new QueryClient();
  const today = ["feeds", 1, "2026-11-25"];
  const logForm = ["log-form", 1];
  queryClient.setQueryData(today, { targetKcal: 238 });
  queryClient.setQueryData(logForm, { foods: [] });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))),
  );
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const stale = () => [today, logForm].map((key) => queryClient.getQueryState(key)?.isInvalidated);
  return { wrapper, stale };
}

it("refreshes Today and Log feed after a target change", async () => {
  const { wrapper, stale } = cachedScreens();
  const { result } = renderHook(() => useSetTarget(1), { wrapper });

  act(() => result.current.mutate(300));

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(stale()).toEqual([true, true]);
});

it("refreshes Today and Log feed after a food's kcal or stock changes", async () => {
  const { wrapper, stale } = cachedScreens();
  const { result } = renderHook(() => useSaveFood(1), { wrapper });

  act(() =>
    result.current.mutate({
      body: {
        name: "Salmon kibbles",
        brand: null,
        photoId: null,
        foodTypeId: 2,
        petTypeId: null,
        kcalPerKg: 3800,
        portionName: null,
        portionG: null,
        stockUnit: "g",
        stockG: 1000,
      },
      keepStock: false,
      kcalBackfill: { scope: "all" },
    }),
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(stale()).toEqual([true, true]);
});
