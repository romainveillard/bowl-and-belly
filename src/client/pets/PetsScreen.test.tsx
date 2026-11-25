import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { SnackbarProvider } from "../components/ui/feedback/Snackbar.js";
import { PetsScreen } from "./PetsScreen.js";

const pet = (id: number, name: string) => ({
  id,
  name,
  photoId: null,
  type: { id: 1, systemKey: "cat", name: null },
  birthDate: "2022-03-01",
  birthDatePrecision: "exact",
  weightG: 4200,
  todayKcal: 120,
  targetKcal: 260,
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

function renderPets() {
  vi.stubGlobal(
    "fetch",
    vi.fn<(input: string) => Promise<Response>>(async (input) =>
      new URL(input, "http://localhost").pathname === "/api/pets"
        ? Response.json({
            today: "2026-11-25",
            archivedCount: 0,
            pets: [pet(1, "Miso"), pet(2, "Biscuit")],
          })
        : Response.json({ code: "not_found" }, { status: 404 }),
    ),
  );
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <SnackbarProvider>
        <MemoryRouter initialEntries={["/pets"]}>
          <Routes>
            <Route path="pets" element={<PetsScreen />} />
            <Route path="pets/:petId" element={<PetsScreen />} />
          </Routes>
        </MemoryRouter>
      </SnackbarProvider>
    </QueryClientProvider>,
  );
}

it("opens on the pet the other screens follow, not the first one", async () => {
  localStorage.setItem("selectedPetId", "2");
  renderPets();

  const biscuit = await screen.findByRole("link", { name: /Biscuit/ });
  expect(biscuit.getAttribute("aria-current")).toBe("true");
  expect(screen.getByRole("link", { name: /Miso/ }).getAttribute("aria-current")).toBeNull();
});

it("makes the pet opened here the one the other screens follow", async () => {
  localStorage.setItem("selectedPetId", "2");
  renderPets();

  fireEvent.click(await screen.findByRole("link", { name: /Miso/ }));

  await vi.waitFor(() => expect(localStorage.getItem("selectedPetId")).toBe("1"));
});
