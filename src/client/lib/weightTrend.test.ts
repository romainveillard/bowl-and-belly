import { expect, it } from "vitest";
import { weightTrend } from "./weightTrend.js";

it("calls a change steady below 1% of the weight", () => {
  expect(weightTrend([20_000, 20_190])).toEqual({ direction: "steady" });
  expect(weightTrend([20_000, 20_200])).toEqual({ direction: "up", changeG: 200 });
});

it("calls a change steady below 50 g for a light pet, so it never reads as 0.0 kg", () => {
  expect(weightTrend([2_000, 1_960])).toEqual({ direction: "steady" });
  expect(weightTrend([2_000, 1_950])).toEqual({ direction: "down", changeG: 50 });
});

it("has nothing to say about a single reading", () => {
  expect(weightTrend([4_500])).toBeNull();
});
