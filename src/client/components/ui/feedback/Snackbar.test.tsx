import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SnackbarProvider, useSnackbar } from "./Snackbar.js";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function Buttons() {
  const show = useSnackbar();
  return (
    <>
      <button type="button" onClick={() => show("Feed logged")}>
        Info
      </button>
      <button
        type="button"
        onClick={() => show({ tone: "error", message: "Couldn’t save the feed" })}
      >
        Error
      </button>
    </>
  );
}

function renderButtons() {
  render(
    <SnackbarProvider>
      <Buttons />
    </SnackbarProvider>,
  );
}

it("keeps an error until it is dismissed, unlike a confirmation", () => {
  renderButtons();

  fireEvent.click(screen.getByRole("button", { name: "Info" }));
  act(() => {
    vi.advanceTimersByTime(5000);
  });
  expect(screen.getByRole("status").textContent).toBe("");

  fireEvent.click(screen.getByRole("button", { name: "Error" }));
  act(() => {
    vi.advanceTimersByTime(60_000);
  });
  expect(screen.getByRole("alert").textContent).toContain("Couldn’t save the feed");

  fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
  expect(screen.getByRole("alert").textContent).toBe("");
});

it("lets an error replace a confirmation, never the other way round", () => {
  renderButtons();

  fireEvent.click(screen.getByRole("button", { name: "Info" }));
  fireEvent.click(screen.getByRole("button", { name: "Error" }));
  expect(screen.getByRole("status").textContent).toBe("");
  expect(screen.getByRole("alert").textContent).toContain("Couldn’t save the feed");

  fireEvent.click(screen.getByRole("button", { name: "Info" }));
  expect(screen.getByRole("status").textContent).toBe("");
  expect(screen.getByRole("alert").textContent).toContain("Couldn’t save the feed");
});
