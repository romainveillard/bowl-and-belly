import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ManualTargetSheet } from "./ManualTargetSheet.js";

afterEach(() => vi.unstubAllGlobals());

it("refuses a target that rounds to 0 kcal, with Save still enabled", () => {
  const fetch = vi.fn<() => Promise<Response>>();
  vi.stubGlobal("fetch", fetch);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ManualTargetSheet
        petId={1}
        petName="Miso"
        currentKcal={null}
        suggestedKcal={260}
        onClose={() => undefined}
      />
    </QueryClientProvider>,
  );
  const field = screen.getByLabelText("Daily target");

  fireEvent.change(field, { target: { value: "0.3" } });
  fireEvent.click(screen.getByRole("button", { name: "Save target" }));

  expect(screen.getByText("Enter a target of at least 1 kcal")).toBeTruthy();
  expect(document.activeElement).toBe(field);
  expect(fetch).not.toHaveBeenCalled();
});
