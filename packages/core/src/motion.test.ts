import { describe, expect, it } from "vitest";
import { LIST_STAGGER_CAP, LIST_STAGGER_STEP_MS, listStaggerDelay } from "./motion";

describe("listStaggerDelay", () => {
  it("delays each revealed row one step after the previous", () => {
    expect(listStaggerDelay(0)).toBe("0ms");
    expect(listStaggerDelay(1)).toBe(`${String(LIST_STAGGER_STEP_MS)}ms`);
    expect(listStaggerDelay(2)).toBe(`${String(2 * LIST_STAGGER_STEP_MS)}ms`);
  });

  it("caps the delay so a long list does not tail off indefinitely", () => {
    expect(listStaggerDelay(LIST_STAGGER_CAP + 40)).toBe(listStaggerDelay(LIST_STAGGER_CAP));
  });

  // Both cases above express the expected value in terms of the very constants
  // the function reads, so they hold for any pair of numbers — measured: 24→25
  // and cap 5→6 both stayed green. The stagger vocabulary is a design decision
  // three templates already drifted on once; these two literals are what makes
  // moving it a deliberate edit rather than a silent one.
  it("staggers at 24ms a row and stops compounding after the sixth", () => {
    expect(listStaggerDelay(1)).toBe("24ms");
    expect(listStaggerDelay(5)).toBe("120ms");
    expect(listStaggerDelay(6)).toBe("120ms");
  });
});
