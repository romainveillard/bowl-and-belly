import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { parseTime, useTypedSetting } from "./useTypedSetting.js";

it("shows the stored value again once a save is rolled back", () => {
  const save = vi.fn<(value: string) => void>();
  const { result, rerender } = renderHook(
    ({ stored }) => useTypedSetting(stored, parseTime, save),
    { initialProps: { stored: "05:00" } },
  );

  act(() => result.current.setText("07:30"));
  act(() => result.current.onBlur());
  expect(save).toHaveBeenCalledWith("07:30");

  // The optimistic save, then its rollback.
  rerender({ stored: "07:30" });
  rerender({ stored: "05:00" });
  expect(result.current.text).toBe("05:00");
});

it("keeps half-typed text while the stored value stays the same", () => {
  const { result, rerender } = renderHook(
    ({ stored }) => useTypedSetting(stored, parseTime, vi.fn<(value: string) => void>()),
    { initialProps: { stored: "05:00" } },
  );

  act(() => result.current.setText("07:"));
  rerender({ stored: "05:00" });
  expect(result.current.text).toBe("07:");
});

it("saves on leaving only a valid change, and flags anything else", () => {
  const save = vi.fn<(value: string) => void>();
  const { result } = renderHook(() => useTypedSetting("05:00", parseTime, save));

  act(() => result.current.setText("25:00"));
  act(() => result.current.onBlur());
  expect(result.current.invalid).toBe(true);

  act(() => result.current.setText("05:00"));
  act(() => result.current.onBlur());
  expect(result.current.invalid).toBe(false);
  expect(save).not.toHaveBeenCalled();
});
