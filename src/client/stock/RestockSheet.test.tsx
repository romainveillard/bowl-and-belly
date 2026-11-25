import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { FoodSummary } from "./foods.js";
import { RestockSheet } from "./RestockSheet.js";

const kibbles: FoodSummary = {
  id: 4,
  name: "Salmon kibbles",
  brand: null,
  photoId: null,
  type: { id: 2, systemKey: "dry", name: null },
  kcalPerKg: 3650,
  portionName: null,
  portionG: null,
  stockUnit: "g",
  stockG: 1500,
};

afterEach(() => vi.unstubAllGlobals());

it("refuses an amount that rounds to 0 g, with Save still enabled", () => {
  const fetch = vi.fn<() => Promise<Response>>();
  vi.stubGlobal("fetch", fetch);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RestockSheet food={kibbles} onClose={() => undefined} />
    </QueryClientProvider>,
  );
  const field = screen.getByLabelText("Adding");

  fireEvent.change(field, { target: { value: "0.0001" } });
  fireEvent.click(screen.getByRole("button", { name: "Add to stock" }));

  expect(screen.getByText("Enter an amount above 0")).toBeTruthy();
  expect(document.activeElement).toBe(field);
  expect(fetch).not.toHaveBeenCalled();
});
