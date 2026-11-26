import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TimeZonePicker } from "./TimeZonePicker.js";

beforeEach(() => {
  // Desktop, where the list opens under the field.
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(width >= 860px)",
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...new Intl.DateTimeFormat().resolvedOptions(),
    timeZone: "Europe/London",
  });
  Element.prototype.scrollIntoView = () => undefined;
  // Offsets are as of opening the list, and Paris is GMT+1 only in winter.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function openPicker(value: string) {
  const onChange = vi.fn<(zone: string) => void>();
  render(<TimeZonePicker id="tz" value={value} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: `Time zone ${value}` }));
  return { onChange, search: screen.getByRole("combobox", { name: "Search time zones" }) };
}

it("suggests the device's zone, then the one set, before every zone", () => {
  openPicker("Europe/Paris");

  const suggested = screen.getByRole("group", { name: "Suggested" });
  expect(
    within(suggested)
      .getAllByRole("option")
      .map((option) => option.textContent),
  ).toEqual(["Europe/LondonGMT+0 · this device", "Europe/ParisGMT+1"]);
  expect(screen.getByRole("group", { name: "All time zones" })).toBeTruthy();
});

it("chooses a search result with the keyboard alone", () => {
  const { onChange, search } = openPicker("Europe/London");

  fireEvent.change(search, { target: { value: "par" } });
  fireEvent.keyDown(search, { key: "ArrowDown" });
  fireEvent.keyDown(search, { key: "ArrowDown" });
  expect(search.getAttribute("aria-activedescendant")).toBe(
    screen.getByRole("option", { name: /Europe\/Paris/ }).id,
  );
  fireEvent.keyDown(search, { key: "Enter" });

  expect(onChange).toHaveBeenCalledExactlyOnceWith("Europe/Paris");
});

it("goes round from the first result to the last", () => {
  const { search } = openPicker("Europe/London");

  fireEvent.change(search, { target: { value: "par" } });
  fireEvent.keyDown(search, { key: "ArrowUp" });

  expect(search.getAttribute("aria-activedescendant")).toBe(
    screen.getByRole("option", { name: /Europe\/Paris/ }).id,
  );
});
