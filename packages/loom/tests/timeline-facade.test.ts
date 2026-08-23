import { describe, expect, it } from "vitest";
// The facade re-exports the family through the package barrel; this pin is
// what keeps `TimelineItem` from ever silently resolving back to `Timeline`
// through a default-export mixup (the failure mode List caught first).
import * as facade from "../src/index";
import * as barrel from "@ecoma-io/loom-timeline";

describe("Facade wiring: Timeline family", () => {
  it("exports Timeline and TimelineItem as distinct components", () => {
    expect(facade.Timeline).toBeDefined();
    expect(facade.TimelineItem).toBeDefined();
    expect(facade.TimelineItem).not.toBe(facade.Timeline);
    expect(facade.TimelineItem).toBe(barrel.TimelineItem);
  });
});
