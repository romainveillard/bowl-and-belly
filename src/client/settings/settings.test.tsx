import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { bodyOf, useSaveSettings, type Settings } from "./settings.js";

const stored: Settings = {
  timeZone: "Europe/London",
  dayStartsAt: "05:00",
  backupEnabled: false,
  backupFrequency: "daily",
  backupWeekday: null,
  backupTime: "03:00",
  backupKeep: 7,
  lastBackupAt: null,
  nextBackupAt: null,
  backupError: null,
  backupFailedAt: null,
};

afterEach(() => vi.unstubAllGlobals());

/** The save hook over a cache already holding `stored`, with the PUT answered by `put`. */
function renderSave(put: () => Promise<Response>) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(["settings"], stored);
  vi.stubGlobal("fetch", vi.fn(put));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useSaveSettings(), { wrapper });
  return { save: result, cached: () => queryClient.getQueryData<Settings>(["settings"]) };
}

it("shows a change at once, then puts the stored settings back when the save fails", async () => {
  const put = Promise.withResolvers<Response>();
  const { save, cached } = renderSave(() => put.promise);

  act(() => save.current.mutate({ ...bodyOf(stored), timeZone: "America/New_York" }));
  await waitFor(() => expect(cached()?.timeZone).toBe("America/New_York"));

  put.resolve(new Response(null, { status: 500 }));
  await waitFor(() => expect(save.current.isError).toBe(true));
  expect(cached()).toEqual(stored);
});

it("keeps a change the server accepted", async () => {
  const { save, cached } = renderSave(() => Promise.resolve(new Response(null, { status: 200 })));

  act(() => save.current.mutate({ ...bodyOf(stored), dayStartsAt: "06:30" }));
  await waitFor(() => expect(save.current.isSuccess).toBe(true));
  expect(cached()?.dayStartsAt).toBe("06:30");
});
