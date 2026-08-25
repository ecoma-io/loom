import { describe, expect, it } from "vitest";
import { STACK_GAP_BREAKPOINT, STACK_GAP_STEPS, stackLayout } from "./layout";
import { cases } from "../e2e/conformance.cases";

// The mapping, the scale tables and the throw contract. What these tests
// pin is the ADAPTER; what holds the adapter equal to the component's
// rendered CSS is the conformance route, and what holds the algorithm the
// tree feeds is the engine's own suite. Every px value below is the scale
// at the 16px root the route pins.

const ctx = (viewportWidth: number, availableWidth = viewportWidth) => ({
  viewportWidth,
  availableWidth,
});

describe("stackLayout", () => {
  it("maps each gap step to its below-sm and at-sm px values", () => {
    expect(STACK_GAP_STEPS).toEqual({ sm: [8, 12], md: [12, 16], lg: [16, 24] });
    for (const gap of ["sm", "md", "lg"] as const) {
      const [below, at] = STACK_GAP_STEPS[gap];
      expect(stackLayout({ gap }, ctx(360), []).style.gap).toBe(below);
      expect(stackLayout({ gap }, ctx(STACK_GAP_BREAKPOINT), []).style.gap).toBe(at);
    }
  });

  it("applies the component's own defaults — gap md, align stretch — when nothing is passed", () => {
    expect(stackLayout({}, ctx(360), []).style).toEqual({
      axis: "column",
      gap: 12,
      alignItems: "stretch",
    });
    expect(stackLayout({}, ctx(800), []).style.gap).toBe(16);
  });

  it("maps align directly onto alignItems, all four values", () => {
    for (const align of ["start", "center", "end", "stretch"] as const) {
      expect(stackLayout({ align }, ctx(800), []).style.alignItems).toBe(align);
    }
  });

  it("carries the fixture children as fixed boxes and marks the component root", () => {
    const tree = stackLayout({}, ctx(800), [
      { w: 120, h: 40 },
      { w: 80, h: 24 },
    ]);
    expect(tree.id).toBe("root");
    expect(tree.children).toEqual([
      { style: { axis: "row", width: 120, height: 40 } },
      { style: { axis: "row", width: 80, height: 24 } },
    ]);
  });
});

// The coverage floor: every enumerated value of every modeled prop appears
// in at least one case, at a viewport inside each scale band that value's
// table distinguishes. Asserted here rather than left to review because a
// gap="md" case at 800 and 2000 exercises only the 16px step and never the
// 12px one — "at least two viewports" would certify reach it did not test.
// Prop interactions belong to the engine's fixtures and the property suite,
// which express them far more densely; the cases exist to prove the mapping
// and the scale tables against the browser.
describe("case coverage floor", () => {
  it("covers every gap value in both bands the gap scale distinguishes", () => {
    const uncovered = (["sm", "md", "lg"] as const).filter((gap) => {
      const viewports = cases.filter((c) => c.props.gap === gap).flatMap((c) => [...c.viewports]);
      return !(
        viewports.some((v) => v < STACK_GAP_BREAKPOINT) &&
        viewports.some((v) => v >= STACK_GAP_BREAKPOINT)
      );
    });
    expect(uncovered).toEqual([]);
  });

  it("covers every modeled align value at least once", () => {
    const uncovered = (["start", "center", "end", "stretch"] as const).filter(
      (align) => !cases.some((c) => c.props.align === align),
    );
    expect(uncovered).toEqual([]);
  });
});
