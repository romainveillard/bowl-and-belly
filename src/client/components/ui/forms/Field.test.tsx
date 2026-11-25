import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Field } from "./Field.js";

/** What a screen reader reads after the field's name and value. */
function description(field: HTMLElement): string {
  return (field.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .map((id) => document.getElementById(id)?.textContent)
    .join(" · ");
}

it("reads out the hint and the unit with the field", () => {
  render(
    <Field label="Amount" value="85" onChange={() => undefined} suffix="g" hint="≈ 74 kcal" />,
  );

  expect(description(screen.getByLabelText("Amount"))).toBe("≈ 74 kcal · g");
});

it("adds a caller's own description to the error rather than replacing it", () => {
  render(
    <>
      <span id="weight-warning">That's 25% more than last time</span>
      <Field
        label="Weight"
        value="5.6"
        onChange={() => undefined}
        error="Enter a weight above 0 kg"
        aria-describedby="weight-warning"
      />
    </>,
  );

  expect(description(screen.getByLabelText("Weight"))).toBe(
    "Enter a weight above 0 kg · That's 25% more than last time",
  );
});
