import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Select } from "./Select.js";

it("closes on a tap on the field while open, rather than closing and opening again", async () => {
  render(
    <Select
      label="Language"
      value="en-GB"
      options={[
        { value: "en-GB", label: "English (UK)" },
        { value: "fr", label: "Français" },
      ]}
      onChange={() => undefined}
    />,
  );
  const field = screen.getByRole("combobox", { name: "Language" });
  // Radix opens on the click of a touch, after its pointerdown.
  fireEvent.pointerDown(field, { pointerType: "touch" });
  fireEvent.click(field);
  expect(screen.getByRole("listbox")).toBeTruthy();
  // Radix listens for presses outside a tick after opening.
  await new Promise((resolve) => setTimeout(resolve, 0));

  // While open the page ignores pointers, so the press lands outside the list
  // (here on the document, at the field's position) and the click on the field.
  fireEvent.pointerDown(document.body, { clientX: 0, clientY: 0 });
  fireEvent.click(field);

  expect(screen.queryByRole("listbox")).toBeNull();
});
