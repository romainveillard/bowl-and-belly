import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { expect, it } from "vitest";
import { SubPageHeader } from "./PageHeader.js";

/** Settings and one of its pages, behind the screens they can be opened from. */
function openAt(entries: string[]) {
  render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <Routes>
        <Route path="/" element={<h1>Today</h1>} />
        <Route path="/pets" element={<h1>Pets</h1>} />
        <Route
          path="/settings"
          element={
            <SubPageHeader title="Settings" phoneLink={{ to: "/", label: "Back" }} returns />
          }
        />
        <Route
          path="/settings/pet-types"
          element={
            <SubPageHeader
              title="Pet types"
              phoneLink={{ to: "/settings", label: "Back to settings" }}
              returns
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

it("goes back to the screen Settings was opened from", () => {
  openAt(["/pets", "/settings"]);

  fireEvent.click(screen.getByRole("link", { name: "Back" }));

  expect(screen.getByRole("heading").textContent).toBe("Pets");
});

it("goes to Today when Settings was the first page opened", () => {
  openAt(["/settings"]);

  fireEvent.click(screen.getByRole("link", { name: "Back" }));

  expect(screen.getByRole("heading").textContent).toBe("Today");
});

it("leaves no extra Settings step behind a page of Settings", () => {
  openAt(["/pets", "/settings", "/settings/pet-types"]);

  fireEvent.click(screen.getByRole("link", { name: "Back to settings" }));
  fireEvent.click(screen.getByRole("link", { name: "Back" }));

  expect(screen.getByRole("heading").textContent).toBe("Pets");
});
