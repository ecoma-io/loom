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
});
