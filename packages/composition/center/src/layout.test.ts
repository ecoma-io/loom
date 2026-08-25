import { describe, expect, it } from "vitest";
import { CENTER_GUTTER_STEPS, CENTER_MAX_WIDTH_PX, centerLayout } from "./layout";
import { cases } from "../e2e/conformance.cases";

// The mapping, the scale tables and the throw contract — see stack's
// layout.test.ts for how the tiers split. Center is the one component whose
// tree carries a synthetic node (the centering row), so the root marking is
// pinned here too.

const ctx = (viewportWidth: number, availableWidth = viewportWidth) => ({
  viewportWidth,
  availableWidth,
});

describe("centerLayout", () => {
  it("maps the max-width scale to px at the 16px root", () => {
    expect(CENTER_MAX_WIDTH_PX).toEqual({ sm: 384, md: 448, lg: 512, xl: 576 });
  });

  it("throws on maxWidth: prose, a font-relative unit the engine cannot express", () => {
    expect(() => centerLayout({ maxWidth: "prose" }, ctx(800), [])).toThrow(/prose.*CSS-only/);
  });

  it("steps the gutter at sm and 3xl: 16 below sm, 24 between, 32 at and above 3xl", () => {
    expect(CENTER_GUTTER_STEPS).toEqual([
      { minWidth: 1920, px: 32 },
      { minWidth: 640, px: 24 },
      { minWidth: 0, px: 16 },
    ]);
    const gutterOf = (viewport: number): number => {
      const root = centerLayout({}, ctx(viewport), []).children?.[0];
      return root?.style.padding && typeof root.style.padding === "object"
        ? (root.style.padding.x ?? 0)
        : 0;
    };
    expect(gutterOf(360)).toBe(16);
    expect(gutterOf(640)).toBe(24);
    expect(gutterOf(800)).toBe(24);
    expect(gutterOf(1919)).toBe(24);
    expect(gutterOf(1920)).toBe(32);
    expect(gutterOf(2000)).toBe(32);
  });

  it("omits the padding entirely when gutter is false", () => {
    expect(
      centerLayout({ gutter: false }, ctx(800), []).children?.[0]?.style.padding,
    ).toBeUndefined();
  });

  it("resolves the box to min(availableWidth, maxWidth) and marks it as the component root", () => {
    const wide = centerLayout({}, ctx(2000), []);
    expect(wide.children?.[0]?.id).toBe("root");
    expect(wide.children?.[0]?.style.width).toBe(512);
    const narrow = centerLayout({ maxWidth: "xl" }, ctx(360), []);
    expect(narrow.children?.[0]?.style.width).toBe(360);
    expect(narrow.children?.[0]?.style.maxWidth).toBe(576);
  });

  it("wraps the box in a full-width centering row — mx-auto as geometry", () => {
    expect(centerLayout({}, ctx(800), []).style).toEqual({
      axis: "row",
      justifyContent: "center",
    });
  });

  it("carries the fixture children as non-shrinking fixed boxes, the way block flow behaves", () => {
    const root = centerLayout({}, ctx(800), [{ w: 200, h: 64 }]);
    expect(root.children?.[0]?.children).toEqual([
      { style: { axis: "row", width: 200, height: 64, flexShrink: 0 } },
    ]);
  });
});

// See stack's layout.test.ts for what the coverage floor is and why it is
// band-aware. Center's gutter is the one scale in the slice that steps at
// `3xl`, so its bands are derived from the exported table rather than
// hardcoded — a new step in CENTER_GUTTER_STEPS reddens this floor until
// the cases follow it.
describe("case coverage floor", () => {
  it("covers every modeled max-width value at least once", () => {
    const uncovered = (["sm", "md", "lg", "xl"] as const).filter(
      (maxWidth) => !cases.some((c) => c.props.maxWidth === maxWidth),
    );
    expect(uncovered).toEqual([]);
  });

  it("covers gutter on in every band the gutter table distinguishes, and gutter off at least once", () => {
    const bounds = CENTER_GUTTER_STEPS.map((step) => step.minWidth).sort((a, b) => a - b);
    const bands = bounds.map((low, i) => [low, bounds[i + 1] ?? Number.POSITIVE_INFINITY] as const);
    const viewportsOn = cases
      .filter((c) => c.props.gutter === true)
      .flatMap((c) => [...c.viewports]);
    const uncoveredBands = bands
      .filter(([low, high]) => !viewportsOn.some((v) => v >= low && v < high))
      .map(
        ([low, high]) =>
          `[${String(low)}, ${high === Number.POSITIVE_INFINITY ? "inf" : String(high)})`,
      );
    expect(uncoveredBands).toEqual([]);
    expect(cases.some((c) => c.props.gutter === false)).toBe(true);
  });
});
