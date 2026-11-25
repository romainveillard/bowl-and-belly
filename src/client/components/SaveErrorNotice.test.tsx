import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ApiError } from "../lib/apiError.js";
import { SaveErrorNotice } from "./SaveErrorNotice.js";
import { SnackbarProvider } from "./ui/feedback/Snackbar.js";

function Saves() {
  const named = useMutation({
    meta: { failed: "feed" },
    mutationFn: () => Promise.reject(new ApiError("invalid_leftover")),
  });
  const unnamed = useMutation({
    mutationFn: () => Promise.reject(new ApiError("invalid_leftover")),
  });
  return (
    <>
      <button type="button" onClick={() => named.mutate()}>
        Named
      </button>
      <button type="button" onClick={() => unnamed.mutate()}>
        Unnamed
      </button>
    </>
  );
}

function renderSaves() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SnackbarProvider>
        <SaveErrorNotice />
        <Saves />
      </SnackbarProvider>
    </QueryClientProvider>,
  );
}

it("says what failed and why when a save that names itself fails", async () => {
  renderSaves();

  fireEvent.click(screen.getByRole("button", { name: "Named" }));
  await screen.findByText("Couldn’t save the feed");
  expect(screen.getByRole("alert").textContent).toContain(
    "The leftover can’t be more than was served.",
  );
});

it("leaves a save without a name to report its own errors", async () => {
  renderSaves();

  fireEvent.click(screen.getByRole("button", { name: "Unnamed" }));
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(screen.getByRole("alert").textContent).toBe("");
});
