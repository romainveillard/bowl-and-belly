import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LoginScreen } from "./LoginScreen.js";

afterEach(() => vi.unstubAllGlobals());

it("moves focus back to the password when it is refused, so the error is read out", async () => {
  // accessAwareFetch tells a refused login from an expired session by the response's URL.
  const refusal = Response.json({ code: "wrong_password" }, { status: 401 });
  Object.defineProperty(refusal, "url", { value: "http://localhost/api/auth/login" });
  vi.stubGlobal(
    "fetch",
    vi.fn<() => Promise<Response>>(() => Promise.resolve(refusal)),
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LoginScreen />
    </QueryClientProvider>,
  );
  const password = screen.getByLabelText("Password");
  const submit = screen.getByRole("button", { name: "Log in" });

  fireEvent.change(password, { target: { value: "guess" } });
  submit.focus();
  fireEvent.click(submit);

  await screen.findByText("That password isn’t right.");
  expect(document.activeElement).toBe(password);
});
