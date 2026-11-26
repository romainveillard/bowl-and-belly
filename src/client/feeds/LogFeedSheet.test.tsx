import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LogFeedSheet } from "./LogFeedSheet.js";

const cat = { id: 1, systemKey: "cat", name: null };
const pets = [
  { id: 1, name: "Miso", photoId: null, type: cat, targetKcal: 260, todayKcal: 120 },
  { id: 2, name: "Biscuit", photoId: null, type: cat, targetKcal: 300, todayKcal: 80 },
];
const logForm = {
  foods: [
    {
      id: 3,
      name: "Chicken pouch",
      brand: null,
      photoId: null,
      type: { id: 1, systemKey: "wet", name: null, leftoverReturnsToStock: false },
      kcalPerKg: 900,
      portionName: null,
      portionG: null,
      stockUnit: "g",
      stockG: 2000,
      lastServedG: null,
    },
  ],
  recentCount: 0,
  previous: null,
};

beforeEach(() => {
  // A phone, where the pet chip doesn't open a menu of its own.
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn<(input: string) => Promise<Response>>(async (input) => {
      const path = new URL(input, "http://localhost").pathname;
      if (path === "/api/pets") {
        return Response.json({ pets, archivedCount: 0 });
      }
      if (path === "/api/settings") {
        return Response.json({ timeZone: "Europe/London", dayStartsAt: "00:00" });
      }
      if (path === "/api/feeds/log-form") {
        return Response.json(logForm);
      }
      return Response.json({ code: "not_found" }, { status: 404 });
    }),
  );
  localStorage.setItem("selectedPetId", "1");
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

async function openWithAmount() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LogFeedSheet onClose={() => undefined} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  fireEvent.change(await screen.findByLabelText("Amount"), { target: { value: "50" } });
  fireEvent.click(screen.getByRole("button", { name: "Pet: Miso. Change pet" }));
  expect(screen.getByRole("heading", { name: "Switch pet" })).toBeTruthy();
  expect(screen.queryByRole("textbox", { name: "Amount" })).toBeNull();
}

it("shows the pets in the sheet's place, and Back returns to the form as it was", async () => {
  await openWithAmount();

  fireEvent.click(screen.getByRole("button", { name: "Back" }));

  expect(screen.getByRole("heading", { name: "Log a feed" })).toBeTruthy();
  expect(screen.getByLabelText<HTMLInputElement>("Amount").value).toBe("50");
});

it("starts a fresh form for another pet", async () => {
  await openWithAmount();

  fireEvent.click(screen.getByRole("button", { name: /^Biscuit/ }));

  expect(await screen.findByRole("button", { name: "Pet: Biscuit. Change pet" })).toBeTruthy();
  expect((await screen.findByLabelText<HTMLInputElement>("Amount")).value).toBe("");
});
