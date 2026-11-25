import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SnackbarProvider } from "../components/ui/feedback/Snackbar.js";
import type { PetDetail } from "./pets.js";
import { useWeightSheets, WeightSheetsProvider } from "./WeightSheetsProvider.js";

const reading: PetDetail["weights"][number] = {
  id: 5,
  measuredAt: "2026-11-24T09:00:00.000Z",
  weightG: 4100,
};

const deleted = { petId: 1, measuredAt: reading.measuredAt, weightG: 4100 };

afterEach(() => vi.unstubAllGlobals());

/** The server, deleting the weigh-in with `prompt` as the target question it raises. */
const fetchMock = (prompt: object | null) =>
  // Hono's client always passes a string URL and, for JSON, a string body.
  vi.fn<(input: string, init?: RequestInit) => Promise<Response>>(async (input, init) => {
    const path = new URL(input, "http://localhost").pathname;
    const route = `${init?.method ?? "GET"} ${path}`;
    if (route === "GET /api/pets/1") {
      return Response.json({ id: 1, name: "Miso", today: "2026-11-25", weights: [reading] });
    }
    if (route === "DELETE /api/weights/5") {
      return Response.json({ deleted, prompt });
    }
    if (route === "POST /api/weights/restore") {
      return Response.json({ id: 6 }, { status: 201 });
    }
    return Response.json({ code: "not_found" }, { status: 404 });
  });

function DeleteButton() {
  const sheets = useWeightSheets();
  return (
    <button type="button" onClick={() => sheets.remove(reading)}>
      Delete weigh-in
    </button>
  );
}

function renderProvider() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider>
        <WeightSheetsProvider petId={1}>
          <DeleteButton />
        </WeightSheetsProvider>
      </SnackbarProvider>
    </QueryClientProvider>,
  );
}

it("offers to undo a deleted weigh-in, which restores exactly what was deleted", async () => {
  const fetch = fetchMock(null);
  vi.stubGlobal("fetch", fetch);
  renderProvider();

  fireEvent.click(screen.getByRole("button", { name: "Delete weigh-in" }));
  fireEvent.click(await screen.findByRole("button", { name: "Undo" }));

  await vi.waitFor(() => {
    const restore = fetch.mock.calls.find(([input]) => input.endsWith("/weights/restore"));
    const body = restore?.[1]?.body;
    expect(typeof body === "string" && JSON.parse(body)).toEqual(deleted);
  });
  expect(screen.queryByRole("alertdialog")).toBeNull();
});

it("asks about the target when deleting a weigh-in changes the suggestion", async () => {
  vi.stubGlobal(
    "fetch",
    fetchMock({
      reason: "weight",
      currentKcal: 250,
      suggestedKcal: 262,
      weightG: 4300,
      previousWeightG: 4250,
    }),
  );
  renderProvider();

  fireEvent.click(screen.getByRole("button", { name: "Delete weigh-in" }));
  const question = await screen.findByRole("alertdialog", { name: "Update daily target?" });
  expect(question.textContent).toContain("Miso now weighs 4.3 kg (was 4.25 kg)");
});
