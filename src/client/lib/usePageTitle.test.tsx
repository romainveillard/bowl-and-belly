import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import { usePageTitle } from "./usePageTitle.js";

function Title({ title }: { title: string }) {
  usePageTitle(title);
  return null;
}

it("hands the title back to the page underneath when a nested one goes", () => {
  const { rerender } = render(
    <>
      <Title title="Pets" />
      <Title title="Miso" />
    </>,
  );
  expect(document.title).toBe("Miso · Bowl & Belly");

  rerender(<Title title="Pets" />);

  expect(document.title).toBe("Pets · Bowl & Belly");
});
