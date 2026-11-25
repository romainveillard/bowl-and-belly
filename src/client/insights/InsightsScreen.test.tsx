import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router";
import { SnackbarProvider } from "../components/ui/feedback/Snackbar.js";
import { InsightsScreen } from "./InsightsScreen.js";

afterEach(() => vi.unstubAllGlobals());

/** Where the app is, and the Back button. */
function Address() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output aria-label="Address">{`${location.pathname}${location.search}`}</output>
      <button type="button" onClick={() => void navigate(-1)}>
        Back
      </button>
    </>
  );
}

it("leaves Insights in one Back, however many periods were stepped through", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<(input: string) => Promise<Response>>(async (input) =>
      new URL(input, "http://localhost").pathname === "/api/pets"
        ? Response.json({
            today: "2026-11-25",
            archivedCount: 0,
            pets: [
              { id: 1, name: "Miso", photoId: null, type: { id: 1, systemKey: "cat", name: null } },
            ],
          })
        : Response.json({ code: "not_found" }, { status: 404 }),
    ),
  );
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <SnackbarProvider>
        <MemoryRouter initialEntries={["/", "/insights"]} initialIndex={1}>
          <Address />
          <Routes>
            <Route path="/" element={<p>Today</p>} />
            <Route path="insights" element={<InsightsScreen />} />
          </Routes>
        </MemoryRouter>
      </SnackbarProvider>
    </QueryClientProvider>,
  );

  fireEvent.click(await screen.findByRole("button", { name: "Previous week" }));
  fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
  fireEvent.click(screen.getByRole("button", { name: "Month" }));
  // The address follows, so a link or a reload shows the same view.
  expect(screen.getByRole("status", { name: "Address" }).textContent).toBe(
    "/insights?period=month&from=2026-11-09",
  );

  fireEvent.click(screen.getByRole("button", { name: "Back" }));

  expect(await screen.findByText("Today")).toBeTruthy();
});

it("keeps focus where it was when the period changes or reaches the latest", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<(input: string) => Promise<Response>>(async (input) =>
      new URL(input, "http://localhost").pathname === "/api/pets"
        ? Response.json({
            today: "2026-11-25",
            archivedCount: 0,
            pets: [
              { id: 1, name: "Miso", photoId: null, type: { id: 1, systemKey: "cat", name: null } },
            ],
          })
        : Response.json({ code: "not_found" }, { status: 404 }),
    ),
  );
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <SnackbarProvider>
        <MemoryRouter initialEntries={["/insights?period=week"]}>
          <Routes>
            <Route path="insights" element={<InsightsScreen />} />
          </Routes>
        </MemoryRouter>
      </SnackbarProvider>
    </QueryClientProvider>,
  );

  const month = await screen.findByRole("button", { name: "Month" });
  month.focus();
  fireEvent.click(month);
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Month" }));

  fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
  const next = screen.getByRole("button", { name: "Next month" });
  next.focus();
  fireEvent.click(next);
  expect(document.activeElement).toBe(next);
  expect(next.getAttribute("aria-disabled")).toBe("true");
});
