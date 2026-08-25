import { describe, expect, it } from "vitest";
import { INLINE_GAP_BREAKPOINT, INLINE_GAP_STEPS, inlineLayout } from "./layout";
import { cases } from "../e2e/conformance.cases";

// The mapping, the scale tables and the throw contract — see stack's
// layout.test.ts for how the tiers split. Inline's throw set is the widest
// because the component's own DEFAULT (wrap: true) is outside the engine:
// a future case author who omits wrap must get a loud error, never a
// confident single-line tree for a wrapping component.

const ctx = (viewportWidth: number, availableWidth = viewportWidth) => ({
  viewportWidth,
  availableWidth,
});

describe("inlineLayout", () => {
  it("maps each gap step to its below-sm and at-sm px values", () => {
    expect(INLINE_GAP_STEPS).toEqual({ sm: [8, 12], md: [12, 16], lg: [16, 24] });
    for (const gap of ["sm", "md", "lg"] as const) {
      const [below, at] = INLINE_GAP_STEPS[gap];
      expect(inlineLayout({ gap, wrap: false }, ctx(360), []).style.gap).toBe(below);
      expect(inlineLayout({ gap, wrap: false }, ctx(INLINE_GAP_BREAKPOINT), []).style.gap).toBe(at);
    }
  });

  it("applies the component's defaults — gap md, align stretch — for the props it models", () => {
    expect(inlineLayout({ wrap: false }, ctx(800), []).style).toEqual({
      axis: "row",
      gap: 16,
      alignItems: "stretch",
    });
  });

  it("maps align onto alignItems for the four modeled values", () => {
    for (const align of ["start", "center", "end", "stretch"] as const) {
      expect(inlineLayout({ align, wrap: false }, ctx(800), []).style.alignItems).toBe(align);
    }
  });

  it("throws on wrap: true — including the unset default — because line collection is phase 2", () => {
    expect(() => inlineLayout({ wrap: true }, ctx(800), [])).toThrow(/wrap: true is CSS-only/);
    expect(() => inlineLayout({}, ctx(800), [])).toThrow(/unset \(the component default is true\)/);
  });

  it("throws on align: baseline, which needs text metrics the engine does not have", () => {
    expect(() => inlineLayout({ wrap: false, align: "baseline" }, ctx(800), [])).toThrow(
      /baseline.*CSS-only/,
    );
  });
});

// See stack's layout.test.ts for what the coverage floor is and why it is
// band-aware. Inline's floor adds the wrap demand: every case must state
// wrap: false explicitly, because the component's default is the one value
// the adapter throws on.
describe("case coverage floor", () => {
  it("covers every gap value in both bands the gap scale distinguishes", () => {
    const uncovered = (["sm", "md", "lg"] as const).filter((gap) => {
      const viewports = cases.filter((c) => c.props.gap === gap).flatMap((c) => [...c.viewports]);
      return !(
        viewports.some((v) => v < INLINE_GAP_BREAKPOINT) &&
        viewports.some((v) => v >= INLINE_GAP_BREAKPOINT)
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

  it("states wrap: false on every case — the default is CSS-only and throws", () => {
    expect(cases.length).toBeGreaterThan(0);
    expect(cases.every((c) => c.props.wrap === false)).toBe(true);
  });
});
