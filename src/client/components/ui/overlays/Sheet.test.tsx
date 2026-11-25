import { act, render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { Sheet } from "./Sheet.js";
import { reportInOpenSheet } from "./sheetErrors.js";

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

it("opens a form on its first field, and a sheet of actions as it was", () => {
  const { unmount } = render(
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
  expect(document.activeElement).toBe(screen.getByLabelText("Weight"));
  unmount();

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
