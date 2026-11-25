import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Field } from "../components/ui/forms/Field.js";
import { useFormErrors } from "./useFormErrors.js";

function NameForm() {
  const errors = useFormErrors(new Map([["name", "Enter a name"]]), ["name"], "test");
  return (
    <>
      <Field
        id={errors.idOf("name")}
        label="Name"
        value=""
        onChange={() => undefined}
        error={errors.problemOf("name")}
      />
      <button type="button" onClick={() => errors.reject()}>
        Save
      </button>
    </>
  );
}

it("marks the field invalid before Save moves focus to it", () => {
  render(<NameForm />);
  const input = screen.getByLabelText("Name");
  let invalidOnFocus: string | null = null;
  input.addEventListener("focus", () => {
    invalidOnFocus = input.getAttribute("aria-invalid");
  });

  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(invalidOnFocus).toBe("true");
});
