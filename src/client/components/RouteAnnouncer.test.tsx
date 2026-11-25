import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Link, MemoryRouter, Outlet, Route, Routes } from "react-router";
import { usePageTitle } from "../lib/usePageTitle.js";
import { RouteAnnouncer } from "./RouteAnnouncer.js";

function Screen({ title }: { title: string }) {
  usePageTitle(title);
  return <h1>{title}</h1>;
}

/** The app's shape: navigation that stays, and the screen's content in main. */
function Shell() {
  return (
    <>
      <nav>
        <Link to="/stock">Stock</Link>
        <Link to="/pets/1">Miso</Link>
        <Link to="/pets/2">Biscuit</Link>
      </nav>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <RouteAnnouncer />
      <Routes>
        <Route element={<Shell />}>
          <Route path="stock" element={<Screen title="Stock" />} />
          <Route path="pets/:id" element={<Screen title="Pets" />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  return document.querySelector('[aria-live="polite"]');
}

it("leaves the first screen to the page load, then announces and focuses each new section", async () => {
  const announcer = renderAt("/stock");
  const link = screen.getByRole("link", { name: "Miso" });
  link.focus();
  // Title changes reach the announcer a tick later.
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(announcer?.textContent).toBe("");

  fireEvent.click(link);

  await screen.findByRole("heading", { name: "Pets" });
  await vi.waitFor(() => expect(announcer?.textContent).toBe("Pets · Bowl & Belly"));
  expect(document.activeElement).toBe(document.getElementById("main"));
});

it("keeps focus in a list that stays on screen when choosing within it", () => {
  renderAt("/pets/1");
  const link = screen.getByRole("link", { name: "Biscuit" });
  link.focus();

  fireEvent.click(link);

  expect(document.activeElement).toBe(link);
});
