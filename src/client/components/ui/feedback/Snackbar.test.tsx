import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Sheet } from "../overlays/Sheet.js";
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
      <button
        type="button"
        onClick={() =>
          show({ message: "Feed deleted", action: { label: "Undo", onClick: () => undefined } })
        }
      >
        Delete
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

it("gives Undo about 10 s, then makes the delete final", () => {
  renderButtons();
  // Focus stays out of the snackbar, which would otherwise hold it for that reason alone.
  const deleteButton = screen.getByRole("button", { name: "Delete" });
  deleteButton.focus();

  fireEvent.click(deleteButton);
  act(() => {
    vi.advanceTimersByTime(9000);
  });
  expect(screen.getByRole("status").textContent).toContain("Feed deleted");

  act(() => {
    vi.advanceTimersByTime(1000);
  });
  expect(screen.getByRole("status").textContent).toBe("");
});

it("holds Undo for as long as it has focus", () => {
  renderButtons();

  // A delete takes the focused row with it, so focus moves to Undo.
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Undo" }));
  act(() => {
    vi.advanceTimersByTime(60_000);
  });
  expect(screen.getByRole("status").textContent).toContain("Feed deleted");

  fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
  expect(screen.getByRole("status").textContent).toBe("");
});

it("holds a confirmation while the pointer is over it", () => {
  renderButtons();

  fireEvent.click(screen.getByRole("button", { name: "Info" }));
  const snackbar = screen.getByRole("status").parentElement;
  if (!snackbar) {
    throw new Error("No snackbar");
  }
  fireEvent.pointerEnter(snackbar);
  act(() => {
    vi.advanceTimersByTime(10_000);
  });
  expect(screen.getByRole("status").textContent).toBe("Feed logged");

  fireEvent.pointerLeave(snackbar);
  act(() => {
    vi.advanceTimersByTime(5000);
  });
  expect(screen.getByRole("status").textContent).toBe("");
});

it("takes focus to Undo when the deleted row took focus with it, and only then", () => {
  renderButtons();
  const deleteButton = screen.getByRole("button", { name: "Delete" });

  deleteButton.focus();
  fireEvent.click(deleteButton);
  expect(document.activeElement).toBe(deleteButton);

  fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
  deleteButton.blur();
  fireEvent.click(deleteButton);
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Undo" }));
});

it("stays announced while a sheet hides the rest of the page", () => {
  vi.useRealTimers();
  render(
    <SnackbarProvider>
      <Sheet open title="Edit feed" onOpenChange={() => undefined}>
        <span />
      </Sheet>
    </SnackbarProvider>,
  );

  expect(screen.getByRole("dialog")).toBeTruthy();
  for (const region of [screen.getByRole("status"), screen.getByRole("alert")]) {
    expect(region.closest('[aria-hidden="true"]')).toBeNull();
  }
});
