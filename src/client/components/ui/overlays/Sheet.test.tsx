import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Sheet } from "./Sheet.js";

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
