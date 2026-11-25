import { fireEvent, render } from "@testing-library/react";
import { expect, it } from "vitest";
import { Sparkline } from "./Sparkline.js";

const readings = [
  { measuredAt: "2026-11-03T08:00:00.000Z", weightG: 23_670 },
  { measuredAt: "2026-11-10T08:00:00.000Z", weightG: 23_460 },
  { measuredAt: "2026-11-17T08:00:00.000Z", weightG: 23_300 },
];

function renderSparkline() {
  const { container } = render(
    <Sparkline
      readings={readings}
      label="Weight"
      daySettings={{ timeZone: "Europe/London", dayStartsAt: "00:00" }}
    />,
  );
  const dots = [...container.querySelectorAll("svg g")];
  const details = () => container.querySelector("[aria-hidden='true']")?.textContent ?? null;
  return { dots, details };
}

it("shows a reading's day and weight while the pointer is on its dot", () => {
  const { dots, details } = renderSparkline();

  fireEvent.mouseEnter(dots[2] ?? document.body);
  expect(details()).toBe("Tue 17 Nov23.3 kg");

  fireEvent.mouseLeave(dots[2] ?? document.body);
  expect(details()).toBeNull();
});

it("opens on a tap and closes on a tap anywhere else", () => {
  const { dots, details } = renderSparkline();

  fireEvent.click(dots[0] ?? document.body);
  expect(details()).toBe("Tue 3 Nov23.67 kg");

  fireEvent.pointerDown(document.body);
  expect(details()).toBeNull();
});
