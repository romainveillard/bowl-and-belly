import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { SnackbarProvider } from "../components/ui/feedback/Snackbar.js";
import { TargetPromptDialog } from "./TargetPromptDialog.js";

it("takes focus when it opens, on keeping the current target", async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SnackbarProvider>
        <TargetPromptDialog
          petId={1}
          petName="Miso"
          prompt={{
            reason: "weight",
            currentKcal: 250,
            suggestedKcal: 262,
            weightG: 4300,
            previousWeightG: 4250,
          }}
          onClose={() => undefined}
        />
      </SnackbarProvider>
    </QueryClientProvider>,
  );

  const keep = await screen.findByRole("button", { name: /^Keep/ });
  expect(document.activeElement).toBe(keep);
});
