import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { WeightChart } from "./WeightChart.js";

it("puts a reading taken before the day starts on the day before", () => {
  render(
    <WeightChart
      label="Weight in November"
      from="2026-11-01"
      to="2026-11-30"
      tickEvery={7}
      daySettings={{ timeZone: "Europe/London", dayStartsAt: "05:00" }}
      readings={[
        // 03:00 on 1 November is still 31 October's app day, so it falls outside the month.
        { at: Date.parse("2026-11-01T03:00:00Z"), weightG: 4300 },
        { at: Date.parse("2026-11-15T09:00:00Z"), weightG: 4250 },
        // 03:00 on 1 December is still 30 November's.
        { at: Date.parse("2026-12-01T03:00:00Z"), weightG: 4200 },
      ]}
    />,
  );

  const table = screen.getByRole("table", { name: "Weight in November" });
  const days = within(table)
    .getAllByRole("rowheader")
    .map((cell) => cell.textContent);
  expect(days).toEqual(["15 November", "30 November"]);
});
