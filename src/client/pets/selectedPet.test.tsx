import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { useSelectedPet } from "./selectedPet.js";

afterEach(() => vi.unstubAllGlobals());

const blocked = () => {
  throw new DOMException("Blocked", "SecurityError");
};

it("follows the chosen pet when the browser blocks storage", () => {
  vi.stubGlobal("localStorage", { getItem: blocked, setItem: blocked });
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  queryClient.setQueryData(["pets"], {
    today: "2026-11-25",
    pets: [{ id: 1 }, { id: 2 }],
    archivedCount: 0,
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useSelectedPet(), { wrapper });

  act(() => result.current.select(2));

  expect(result.current.pet?.id).toBe(2);
});
