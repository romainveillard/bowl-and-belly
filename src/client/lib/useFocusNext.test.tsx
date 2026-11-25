import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { expect, it } from "vitest";
import { useFocusNext } from "./useFocusNext.js";

// "Show all" goes away when pressed; the first row it showed takes focus.
function Readings() {
  const [all, setAll] = useState(false);
  const focusNext = useFocusNext();
  return (
    <>
      <button type="button" onClick={() => focusNext(() => document.getElementById("first"))}>
        First
      </button>
      {all ? (
        <button id="more" type="button">
          4 November
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setAll(true);
            focusNext(() => document.getElementById("more"));
          }}
        >
          Show all
        </button>
      )}
      <button id="first" type="button">
        25 November
      </button>
    </>
  );
}

it("focuses what the next render shows, or what is already there", () => {
  render(<Readings />);

  fireEvent.click(screen.getByRole("button", { name: "Show all" }));
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "4 November" }));

  fireEvent.click(screen.getByRole("button", { name: "First" }));
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "25 November" }));
});
