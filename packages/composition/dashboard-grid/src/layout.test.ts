import { describe, expect, it } from "vitest";
import {
  DASHBOARD_GRID_GAP_BREAKPOINT,
  DASHBOARD_GRID_GAP_STEPS,
  dashboardGridLayout,
  dashboardGridRouteAdapter,
  fittedTrackCount,
  minTileWidthToPx,
  layout,
} from "./layout";
import { cases, type ConformanceCase } from "../e2e/conformance.cases";
import type { DashboardGridGap } from "./DashboardGrid.vue";

// The mapping, the derived auto-fit arithmetic and the throw contract. What
// these tests pin is the ADAPTER; what holds the adapter equal to the
// component's rendered CSS is the conformance route, and what holds the
// algorithm the tree feeds is the engine's own suite. Every px value below
// is the scale at the 16px root the route pins.

const ctx = (viewportWidth: number, availableWidth = viewportWidth) => ({
  viewportWidth,
  availableWidth,
});

describe("dashboardGridLayout", () => {
  it("maps each gap step to its below-sm and at-sm px values", () => {
    expect(DASHBOARD_GRID_GAP_STEPS).toEqual({ sm: [8, 12], md: [12, 16], lg: [16, 24] });
    for (const gap of ["sm", "md", "lg"] as const) {
      const [below, at] = DASHBOARD_GRID_GAP_STEPS[gap];
      expect(dashboardGridLayout({ gap }, ctx(360), [{ w: 360, h: 40 }]).style.gap).toBe(below);
      expect(
        dashboardGridLayout({ gap }, ctx(DASHBOARD_GRID_GAP_BREAKPOINT), [{ w: 640, h: 40 }]).style
          .gap,
      ).toBe(at);
    }
  });

  it("applies the component's own defaults — a 16rem floor and the md gutter — when nothing is passed", () => {
    const tree = dashboardGridLayout({}, ctx(800), [
      { w: 392, h: 40 },
      { w: 392, h: 48 },
    ]);
    expect(tree.style.gap).toBe(16);
    // (800 + 16) / (256 + 16) = 3 tracks fit; two tiles collapse the third,
    // and the survivors share the whole width.
    expect(tree.children?.map((child) => child.style.width)).toEqual([392, 392]);
  });

  it("resolves px and rem tile floors and refuses every other unit", () => {
    expect(minTileWidthToPx("14rem")).toBe(224);
    expect(minTileWidthToPx("16rem")).toBe(256);
    expect(minTileWidthToPx("224px")).toBe(224);
    expect(() => minTileWidthToPx("50%")).toThrow(/not a px or rem length/);
    expect(() => minTileWidthToPx("14em")).toThrow(/not a px or rem length/);
  });

  it("derives the fitted track count the browser computes for repeat(auto-fit, minmax(M, 1fr))", () => {
    // The boundary the cases pin: three 224px tracks plus two 16px gaps
    // exactly fill 704px, and two pixels below only two fit.
    expect(fittedTrackCount(704, 224, 16)).toBe(3);
    expect(fittedTrackCount(702, 224, 16)).toBe(2);
    expect(fittedTrackCount(800, 224, 16)).toBe(3);
    expect(fittedTrackCount(944, 224, 16)).toBe(4);
    // Below the tile floor the count floors at one — the min(100%, …) wrap
    // in the component's own minmax keeps the track at the container width.
    expect(fittedTrackCount(360, 224, 12)).toBe(1);
    expect(fittedTrackCount(100, 224, 12)).toBe(1);
  });

  it("collapses the unfitted tracks: two tiles on a three-track grid share the whole width", () => {
    const tree = dashboardGridLayout({ minTileWidth: "14rem", gap: "md" }, ctx(800), [
      { w: 392, h: 40 },
      { w: 392, h: 48 },
    ]);
    expect(tree.children?.map((child) => child.style.width)).toEqual([392, 392]);
  });

  it("encodes a span as its area width, so the line's cursor reproduces the grid's track flow", () => {
    const tree = dashboardGridLayout(
      { minTileWidth: "14rem", gap: "md", spans: [2, 1] },
      ctx(800),
      [
        { w: 528, h: 48 },
        { w: 256, h: 40 },
      ],
    );
    // Three tracks of 256px: the span-2 area is 2 × 256 + 16.
    expect(tree.children?.map((child) => child.style.width)).toEqual([528, 256]);
    const computed = layout(tree, {
      width: { mode: "definite", size: 800 },
      height: { mode: "max-content" },
    });
    const tiles = computed.children ?? [];
    expect(tiles.map((tile) => tile.left)).toEqual([0, 528 + 16]);
    expect(tiles.map((tile) => tile.width)).toEqual([528, 256]);
    expect(tiles.map((tile) => tile.top)).toEqual([0, 0]);
    // The line is the row: the root is as wide as the container and as tall
    // as its tallest tile.
    expect(computed.width).toBe(800);
    expect(computed.height).toBe(48);
  });

  it("spans the whole container when one tile spans every fitted track", () => {
    const tree = dashboardGridLayout({ minTileWidth: "14rem", gap: "md", spans: [3] }, ctx(800), [
      { w: 800, h: 56 },
    ]);
    // 3 × 256 + 2 × 16 = 800: the area is the container.
    expect(tree.children?.[0]?.style.width).toBe(800);
  });

  it("lands the boundary track exactly on the declared minimum", () => {
    const tree = dashboardGridLayout({ minTileWidth: "14rem", gap: "md" }, ctx(704), [
      { w: 224, h: 40 },
      { w: 224, h: 48 },
      { w: 224, h: 56 },
    ]);
    expect(tree.children?.map((child) => child.style.width)).toEqual([224, 224, 224]);
  });

  it("refuses what the single line cannot model", () => {
    // More tiles than tracks: the browser would wrap onto a further row.
    expect(() =>
      dashboardGridLayout({ minTileWidth: "14rem", gap: "md", spans: [2, 1] }, ctx(360), [
        { w: 360, h: 40 },
        { w: 360, h: 40 },
      ]),
    ).toThrow(/outside the single-line subset/);
    // A span wider than the whole grid raises implicit tracks.
    expect(() =>
      dashboardGridLayout({ minTileWidth: "14rem", gap: "md", spans: [2] }, ctx(360), [
        { w: 360, h: 40 },
      ]),
    ).toThrow(/outside the single-line subset/);
    expect(() => dashboardGridLayout({}, ctx(800), [])).toThrow(/no line to model/);
    expect(() => dashboardGridLayout({ spans: [1, 1] }, ctx(800), [{ w: 392, h: 40 }])).toThrow(
      /more tiles than the case carries/,
    );
    expect(() => dashboardGridLayout({ spans: [0] }, ctx(800), [{ w: 392, h: 40 }])).toThrow(
      /whole number of tracks/,
    );
    // A tile off its area: an authored width override the cursor cannot place.
    expect(() =>
      dashboardGridLayout({ minTileWidth: "14rem", gap: "md" }, ctx(800), [{ w: 300, h: 40 }]),
    ).toThrow(/off its area/);
  });
});

// The coverage floor: the case set must reach every mapped behaviour at
// every band it distinguishes, and every case must still be honest — a case
// authored before an arithmetic edit would otherwise compare a stale width
// forever. Asserted here rather than left to review because the adapter
// refuses stale cases loudly only when someone runs it, and nothing else
// runs it over the whole set in the vitest tier.
describe("case coverage floor", () => {
  /** The gap a case's props resolve to at a viewport, in px. */
  const gapAt = (viewport: number, gap: DashboardGridGap | undefined): number => {
    const [below, at] = DASHBOARD_GRID_GAP_STEPS[gap ?? "md"];
    return viewport >= DASHBOARD_GRID_GAP_BREAKPOINT ? at : below;
  };

  /** The fitted count of a case's first (only) viewport. */
  const fittedFor = (one: ConformanceCase): number => {
    const viewport = one.viewports[0];
    if (viewport === undefined) throw new Error(`case ${one.name} declares no viewport`);
    return fittedTrackCount(
      viewport,
      minTileWidthToPx(one.props.minTileWidth ?? "16rem"),
      gapAt(viewport, one.props.gap),
    );
  };

  const spansOf = (one: ConformanceCase): number[] =>
    one.children.map((_, i) => one.props.spans?.[i] ?? 1);

  it("covers every gap value in both bands the gap scale distinguishes", () => {
    const uncovered = (["sm", "md", "lg"] as const).filter((gap) => {
      const viewports = cases
        .filter((c) => (c.props.gap ?? "md") === gap)
        .flatMap((c) => [...c.viewports]);
      return !(
        viewports.some((v) => v < DASHBOARD_GRID_GAP_BREAKPOINT) &&
        viewports.some((v) => v >= DASHBOARD_GRID_GAP_BREAKPOINT)
      );
    });
    expect(uncovered).toEqual([]);
  });

  it("covers spans at more than one fitted track count, and plain tiles at more than one too", () => {
    const spanned = cases.filter((c) => spansOf(c).some((span) => span > 1));
    expect(spanned.length, "at least one spanned case").toBeGreaterThan(0);
    const spannedFitted = new Set(spanned.map(fittedFor));
    expect(spannedFitted.size, "spanned cases at several track counts").toBeGreaterThan(1);
    const plainFitted = new Set(
      cases.filter((c) => spansOf(c).every((span) => span === 1)).map(fittedFor),
    );
    expect(plainFitted.size, "plain tiles at several track counts").toBeGreaterThan(1);
  });

  it("pins the reflow discontinuity from both sides", () => {
    // Two published widths within a couple of pixels whose fitted counts
    // differ — the exact-fit boundary and the width one step below it.
    const discontinuity = cases.some((smaller) =>
      cases.some((larger) => {
        const [v1, v2] = [smaller.viewports[0] ?? 0, larger.viewports[0] ?? 0];
        return v1 < v2 && v2 - v1 <= 2 && fittedFor(smaller) < fittedFor(larger);
      }),
    );
    expect(discontinuity, "a boundary pair whose track counts differ within 2px").toBe(true);
  });

  it("holds every case inside the modelled subset and honest at its area widths", () => {
    for (const one of cases) {
      const viewport = one.viewports[0];
      if (viewport === undefined) throw new Error(`case ${one.name} declares no viewport`);
      // The floor feeds the viewport width as the container width, which is
      // what the browser gives when the case sections stay inside the fold —
      // the assumption the spec's tall viewport and short cases keep.
      const tree = dashboardGridLayout(one.props, ctx(viewport), one.children);
      expect(tree.children?.length).toBe(one.children.length);
      for (const [i, child] of one.children.entries()) {
        expect(
          tree.children?.[i]?.style.width,
          `${one.name} child ${i.toString()} at its authored width`,
        ).toBe(child.w);
      }
    }
  });

  it("publishes each case at exactly the width its props name", () => {
    // `at` is the runtime reader of a width `viewports` already spells; two
    // free spellings of one number can drift apart silently, so the floor
    // holds them equal.
    for (const one of cases) {
      expect(one.props.at, `${one.name}: props.at against viewports`).toBe(one.viewports[0]);
    }
  });

  it("route adapter computes a case at its own width and answers elsewhere with an empty line", () => {
    for (const one of cases) {
      const viewport = one.viewports[0];
      if (viewport === undefined) throw new Error(`case ${one.name} declares no viewport`);
      const own = dashboardGridRouteAdapter(one.props, ctx(viewport), one.children);
      expect(own.children?.length, `${one.name} child count`).toBe(one.children.length);
      // The page computes every case at every width it navigates; the
      // out-of-scope answer is the empty line the spec never reads (its
      // viewports filter skips the case there), and it must NOT throw — a
      // refusal here would kill the page before the report published.
      const foreign = viewport === 360 ? 800 : 360;
      const skipped = dashboardGridRouteAdapter(one.props, ctx(foreign), one.children);
      expect(skipped.children, `${one.name} at ${String(foreign)}px`).toBeUndefined();
    }
  });
});
