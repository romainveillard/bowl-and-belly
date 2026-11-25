import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PhotoPicker } from "./PhotoPicker.js";
import { SaveErrorNotice } from "./SaveErrorNotice.js";
import { SnackbarProvider } from "./ui/feedback/Snackbar.js";

afterEach(() => vi.unstubAllGlobals());

it("says why a photo was refused, and lets the same file be picked again", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<() => Promise<Response>>(() =>
      Promise.resolve(Response.json({ code: "image_too_large" }, { status: 413 })),
    ),
  );
  const onChange = vi.fn<(photoId: number | null) => void>();
  const { container } = render(
    <QueryClientProvider client={new QueryClient()}>
      <SnackbarProvider>
        <SaveErrorNotice />
        <PhotoPicker
          shape="round"
          photoId={null}
          onChange={onChange}
          label="Add"
          changeLabel="Change"
          alt=""
          hint=""
        />
      </SnackbarProvider>
    </QueryClientProvider>,
  );
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) {
    throw new Error("No file input");
  }
  const photo = new File(["x"], "huge.jpg", { type: "image/jpeg" });
  Object.defineProperty(input, "files", { value: [photo], configurable: true });
  // What a browser reports once a file is picked; happy-dom leaves it empty.
  let value = "C:\\fakepath\\huge.jpg";
  Object.defineProperty(input, "value", {
    get: () => value,
    set: (next: string) => {
      value = next;
    },
    configurable: true,
  });

  fireEvent.change(input);
  await screen.findByText("Couldn’t upload the photo");

  expect(screen.getByRole("alert").textContent).toContain("It’s larger than 20 MB.");
  expect(input.value).toBe("");
  expect(onChange).not.toHaveBeenCalled();
});
