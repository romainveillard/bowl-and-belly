import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Sheet } from "./Sheet.js";
import { reportInOpenSheet } from "./sheetErrors.js";

afterEach(() => vi.unstubAllGlobals());

it("is described by its subtitle", () => {
  render(
    <Sheet
      open
      title="Set my own target"
      subtitle="Miso · suggested 260 kcal / day"
      onOpenChange={() => undefined}
    >
      <span />
    </Sheet>,
  );

  const describedBy = screen.getByRole("dialog").getAttribute("aria-describedby");
  expect(describedBy && document.getElementById(describedBy)?.textContent).toBe(
    "Miso · suggested 260 kcal / day",
  );
});

/** A form sheet opened on a device whose main pointer is, or isn't, fine. */
function openForm(finePointer: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(pointer: fine)" && finePointer,
  }));
  return render(
    <Sheet
      open
      title="Log weight"
      onOpenChange={() => undefined}
      footer={<button type="button">Save</button>}
    >
      <label>
        Weight
        <input />
      </label>
    </Sheet>,
  );
}

it("opens a form on its first field with a mouse and keyboard", () => {
  openForm(true);

  expect(document.activeElement).toBe(screen.getByLabelText("Weight"));
});

it("opens a form on its title on a touch screen, so no keyboard comes up", () => {
  openForm(false);

  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Log weight" }));
});

it("opens a sheet of actions as Radix does", () => {
  render(
    <Sheet open title="Miso’s feed" onOpenChange={() => undefined} flush>
      <label>
        Search
        <input />
      </label>
    </Sheet>,
  );
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));
});

it("shows a failed save in the open sheet, where it can be read, instead of behind it", () => {
  render(
    <Sheet open title="Log weight" onOpenChange={() => undefined}>
      <span />
    </Sheet>,
  );

  let shownInSheet = false;
  act(() => {
    shownInSheet = reportInOpenSheet({
      message: "Couldn’t save the weigh-in",
      detail: "Try again.",
    });
  });

  expect(shownInSheet).toBe(true);
  expect(within(screen.getByRole("dialog")).getByRole("alert").textContent).toBe(
    "Couldn’t save the weigh-in Try again.",
  );
});

it("leaves a failed save to the snackbar when no sheet is open", () => {
  expect(reportInOpenSheet({ message: "Couldn’t save the pet", detail: "Try again." })).toBe(false);
});

// Parents mostly drop a sheet as soon as they hear it closed, so the sheet
// shuts itself first and only tells them once its content has gone.
it("tells its parent it closed once its content has gone", () => {
  const onOpenChange = vi.fn<(open: boolean) => void>();
  render(
    <Sheet open title="Miso’s feed" onOpenChange={onOpenChange}>
      <span />
    </Sheet>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Close" }));

  expect(screen.queryByRole("dialog")).toBeNull();
  expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
});

const switcher = (open: boolean) => (
  <Sheet open={open} title="Switch pet" onOpenChange={() => undefined}>
    <span />
  </Sheet>
);

it("opens again for a parent that keeps it", () => {
  const { rerender } = render(switcher(true));
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  rerender(switcher(false));

  rerender(switcher(true));

  expect(screen.getByRole("dialog")).toBeTruthy();
});
