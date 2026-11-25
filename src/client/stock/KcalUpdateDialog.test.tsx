import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { KcalBackfill } from "./foods.js";
import { KcalUpdateDialog } from "./KcalUpdateDialog.js";

const today = "2026-11-25";

function renderDialog() {
  const onSave = vi.fn<(backfill: KcalBackfill) => void>();
  render(
    <KcalUpdateDialog description="" today={today} onSave={onSave} onCancel={() => undefined} />,
  );
  return { onSave, date: screen.getByLabelText("Update feeds since") };
}

it("refuses a typed date after today, which the picker alone doesn't stop", () => {
  const { onSave, date } = renderDialog();

  fireEvent.change(date, { target: { value: "2026-11-26" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(screen.getByText("Enter a date, today or earlier")).toBeTruthy();
  expect(document.activeElement).toBe(date);
  expect(onSave).not.toHaveBeenCalled();
});

it("saves feeds since a past date", () => {
  const { onSave, date } = renderDialog();

  fireEvent.change(date, { target: { value: "2026-11-01" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(onSave).toHaveBeenCalledWith({ scope: "since", day: "2026-11-01" });
});
