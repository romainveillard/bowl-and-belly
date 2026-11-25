import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { IntakeChart } from "./IntakeChart.js";

it("lists each day's intake as text, skipping the days still to come", () => {
  render(
    <IntakeChart
      label="Daily calories for 23–29 Nov"
      today="2026-11-25"
      days={[
        { day: "2026-11-23", eatenKcal: 248, targetKcal: 260, fed: true, byType: [] },
        { day: "2026-11-24", eatenKcal: 0, targetKcal: 260, fed: false, byType: [] },
        { day: "2026-11-25", eatenKcal: 120, targetKcal: 260, fed: true, byType: [] },
        { day: "2026-11-26", eatenKcal: 0, targetKcal: 260, fed: false, byType: [] },
      ]}
    />,
  );

  const table = screen.getByRole("table", { name: "Daily calories for 23–29 Nov" });
  const rows = within(table)
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.textContent);
  expect(rows).toEqual([
    "Monday 23 November248 kcal260 kcal",
    "Tuesday 24 NovemberNo feeds this day260 kcal",
    "Wednesday 25 November120 kcal260 kcal",
  ]);
  // The drawing is hidden from screen readers, which get the table instead.
  expect(screen.queryByRole("img")).toBeNull();
});
