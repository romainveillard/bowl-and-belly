import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SnackbarProvider } from "../components/ui/feedback/Snackbar.js";
import { FeedSheetsProvider, useFeedSheets } from "./FeedSheetsProvider.js";
import type { FeedEntry } from "./feeds.js";

const today = "2026-11-25";

const entry: FeedEntry = {
  id: 7,
  fedAt: "2026-11-20T08:15:00.000Z",
  servedG: 85,
  leftoverG: null,
  leftoverReturnedToStock: false,
  kcalPerKg: 900,
  kcal: 77,
  food: { id: 3, name: "Chicken pouch", brand: null, photoId: null },
  type: { id: 1, systemKey: "wet", name: null, leftoverReturnsToStock: false },
};

const deleted = {
  petId: 1,
  foodId: 3,
  fedAt: entry.fedAt,
  servedG: 85,
  leftoverG: null,
  leftoverReturnedToStock: false,
  kcalPerKg: 900,
};

afterEach(() => vi.unstubAllGlobals());

const fetchMock = () =>
  // Hono's client always passes a string URL and, for JSON, a string body.
  vi.fn<(input: string, init?: RequestInit) => Promise<Response>>(async (input, init) => {
    const path = new URL(input, "http://localhost").pathname;
    const route = `${init?.method ?? "GET"} ${path}`;
    if (route === "GET /api/settings") {
      return Response.json({ timeZone: "Europe/London", dayStartsAt: "05:00" });
    }
    if (route === "DELETE /api/feeds/7") {
      return Response.json(deleted);
    }
    if (route === "POST /api/feeds/restore") {
      return Response.json({ id: 8 }, { status: 201 });
    }
    return Response.json({ code: "not_found" }, { status: 404 });
  });

/** A feed row as the screens use it: it opens and deletes through the provider. */
function Row({ day }: { day: string }) {
  const sheets = useFeedSheets();
  return (
    <>
      <button type="button" onClick={() => sheets.open(entry, day)}>
        Open row
      </button>
      <button type="button" onClick={() => sheets.remove(entry)}>
        Delete row
      </button>
    </>
  );
}

function renderRow(day: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider>
        <FeedSheetsProvider petId={1} today={today}>
          <Row day={day} />
        </FeedSheetsProvider>
      </SnackbarProvider>
    </QueryClientProvider>,
  );
}

it("works on the day the row came from, not today, through to editing", async () => {
  vi.stubGlobal("fetch", fetchMock());
  renderRow("2026-11-20");

  fireEvent.click(screen.getByRole("button", { name: "Open row" }));
  const actions = await screen.findByRole("dialog", { name: "Chicken pouch" });
  expect(within(actions).getByText(/^20 Nov /)).toBeTruthy();

  fireEvent.click(within(actions).getByRole("button", { name: /^Edit/ }));
  const edit = await screen.findByRole("dialog", { name: "Edit feed" });
  expect(within(edit).getByText(/^20 Nov · /)).toBeTruthy();
});

it("offers to undo a delete, which restores exactly what was deleted", async () => {
  const fetch = fetchMock();
  vi.stubGlobal("fetch", fetch);
  renderRow(today);

  fireEvent.click(screen.getByRole("button", { name: "Delete row" }));
  fireEvent.click(await screen.findByRole("button", { name: "Undo" }));

  await vi.waitFor(() => {
    const restore = fetch.mock.calls.find(([input]) => input.endsWith("/feeds/restore"));
    const body = restore?.[1]?.body;
    expect(typeof body === "string" && JSON.parse(body)).toEqual(deleted);
  });
});

it("gives focus back to the row once the edit sheet it led to closes", async () => {
  vi.stubGlobal("fetch", fetchMock());
  renderRow(today);
  const row = screen.getByRole("button", { name: "Open row" });

  row.focus();
  fireEvent.click(row);
  const actions = await screen.findByRole("dialog", { name: "Chicken pouch" });
  fireEvent.click(within(actions).getByRole("button", { name: /^Edit/ }));
  const edit = await screen.findByRole("dialog", { name: "Edit feed" });
  fireEvent.click(within(edit).getByRole("button", { name: "Close" }));

  await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await vi.waitFor(() => expect(document.activeElement).toBe(row));
});
