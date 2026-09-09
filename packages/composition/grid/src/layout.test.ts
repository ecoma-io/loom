import { describe, expect, it } from "vitest";
import {
  autoFitColumns,
  GRID_GAP_BREAKPOINT,
  GRID_GAP_STEPS,
  gridLayout,
  parseMinColWidth,
  trackWidth,
} from "./layout";
import { cases } from "../e2e/conformance.cases";

// The mapping, the scale tables, the derived auto-fit arithmetic and the
// throw contract. What these tests pin is the ADAPTER; what holds the
// adapter equal to the component's rendered CSS is the conformance route,
// and what holds the algorithm the tree feeds is the engine's own suite.
// Every px value below is the scale at the 16px root the route pins.

const ctx = (viewportWidth: number, availableWidth = viewportWidth) => ({
  viewportWidth,
  availableWidth,
});

describe("gridLayout", () => {
  it("maps each gap step to its below-sm and at-sm px values", () => {
    expect(GRID_GAP_STEPS).toEqual({ sm: [8, 12], md: [12, 16], lg: [16, 24] });
    for (const gap of ["sm", "md", "lg"] as const) {
      const [below, at] = GRID_GAP_STEPS[gap];
      expect(gridLayout({ gap }, ctx(360), []).style.gap).toBe(below);
      expect(gridLayout({ gap }, ctx(GRID_GAP_BREAKPOINT), []).style.gap).toBe(at);
    }
  });

  it("applies the component's own defaults — a 16rem floor and the md gap — when nothing is passed", () => {
    expect(gridLayout({}, ctx(360), []).style).toEqual({ axis: "row", gap: 12 });
    expect(gridLayout({}, ctx(800), []).style.gap).toBe(16);
  });

  it("parses the track floor through px and rem at the pinned root, and throws on the rest", () => {
    expect(parseMinColWidth("16rem")).toBe(256);
    expect(parseMinColWidth("0.5rem")).toBe(8);
    expect(parseMinColWidth("128px")).toBe(128);
    for (const value of ["50%", "2em", "10ch", "10vw", "16", "-4px", "auto", ""]) {
      expect(() => parseMinColWidth(value)).toThrow(/outside the modelled subset/);
    }
  });

  it("derives the auto-fit repetition count: k tracks fit while k·MIN + (k−1)·G ≤ W", () => {
    // The flip points themselves — the widths the boundary cases pin.
    expect(autoFitColumns(523, 256, 12)).toBe(1);
    expect(autoFitColumns(524, 256, 12)).toBe(2);
    expect(autoFitColumns(799, 256, 16)).toBe(2);
    expect(autoFitColumns(800, 256, 16)).toBe(3);
    expect(autoFitColumns(267, 128, 12)).toBe(1);
    expect(autoFitColumns(268, 128, 12)).toBe(2);
    // Below the track floor the min(100%, MIN) guard keeps one column.
    expect(autoFitColumns(120, 256, 12)).toBe(1);
  });

  it("computes each used track as the container shared out across the survivors", () => {
    expect(trackWidth(524, 2, 12)).toBe(256);
    expect(trackWidth(800, 3, 16)).toBe(256);
    expect(trackWidth(656, 3, 16)).toBe(208);
  });

  it("carries the fixture children as fixed, non-shrinking boxes under the gap line", () => {
    const tree = gridLayout({ gap: "sm" }, ctx(520), [
      { w: 256, h: 20 },
      { w: 256, h: 48 },
    ]);
    expect(tree.id).toBe("root");
    expect(tree.style).toEqual({ axis: "row", gap: 8 });
    expect(tree.children).toEqual([
      { style: { axis: "row", width: 256, height: 20, flexShrink: 0 } },
      { style: { axis: "row", width: 256, height: 48, flexShrink: 0 } },
    ]);
  });

  it("throws on a fixture that does not fill its cell — the cursor line only matches track starts then", () => {
    expect(() =>
      gridLayout({}, ctx(524), [
        { w: 200, h: 40 },
        { w: 200, h: 40 },
      ]),
    ).toThrow(/fill their cells exactly/);
  });

  it("exempts the lone item, whose left is the track start whatever its width", () => {
    const tree = gridLayout({}, ctx(360), [{ w: 120, h: 40 }]);
    expect(tree.children?.[0]?.style.width).toBe(120);
  });

  it("projects the first row for more items than columns — the shape a knownDivergence case must carry", () => {
    // Four items at 800 fit three 256px columns: two real rows, so the tree
    // is the first row's projection and nothing may compare it.
    const tree = gridLayout({}, ctx(800), [
      { w: 100, h: 40 },
      { w: 100, h: 40 },
      { w: 100, h: 40 },
      { w: 100, h: 40 },
    ]);
    expect(tree.children).toHaveLength(3);
    expect(tree.children?.every((leaf) => leaf.style.width === 100)).toBe(true);
  });
});

// The coverage floor: every enumerated value of every modeled prop appears
// in at least one case, at a viewport inside each scale band that value's
// table distinguishes; the boundary cases pin real flip points; and the
// modelled subset's one absence — row banding — stays a counted exception
// rather than a silent one. Asserted here rather than left to review because
// none of it is reachable without a browser: this is the local tier where a
// case-file mistake costs a vitest run instead of a CI failure.
describe("case coverage floor", () => {
  const bandOf = (viewport: number): "below-sm" | "at-sm" =>
    viewport < GRID_GAP_BREAKPOINT ? "below-sm" : "at-sm";

  const gapOf = (props: { gap?: "sm" | "md" | "lg" }): string => props.gap ?? "md";

  it("covers every gap value in both bands the gap scale distinguishes", () => {
    const uncovered = (["sm", "md", "lg"] as const).filter((gap) => {
      const bands = cases
        .filter((c) => gapOf(c.props) === gap)
        .flatMap((c) => [...c.viewports])
        .map(bandOf);
      return !(bands.includes("below-sm") && bands.includes("at-sm"));
    });
    expect(uncovered).toEqual([]);
  });

  it("covers the track floor through both a rem and a px value, and the component default", () => {
    const parsed = cases.map((c) => parseMinColWidth(c.props.minColWidth ?? "16rem"));
    expect(parsed).toContain(256); // the component's own 16rem default
    expect(cases.some((c) => (c.props.minColWidth ?? "16rem").endsWith("rem"))).toBe(true);
    expect(cases.some((c) => c.props.minColWidth?.endsWith("px"))).toBe(true);
  });

  it("pins only real flip points as boundaries — each boundary case sits exactly on k·(MIN+G) − G", () => {
    for (const c of cases) {
      if (!c.name.startsWith("boundary-")) continue;
      const minTrackPx = parseMinColWidth(c.props.minColWidth ?? "16rem");
      const [below, at] = GRID_GAP_STEPS[gapOf(c.props) as "sm" | "md" | "lg"];
      for (const viewport of c.viewports) {
        const gap = bandOf(viewport) === "below-sm" ? below : at;
        expect(
          autoFitColumns(viewport - 1, minTrackPx, gap),
          `${c.name} @${String(viewport)}: the width one pixel below must flip down`,
        ).toBeLessThan(autoFitColumns(viewport, minTrackPx, gap));
        expect(trackWidth(viewport, c.children.length, gap)).toBe(minTrackPx);
      }
    }
    expect(cases.filter((c) => c.name.startsWith("boundary-")).length).toBeGreaterThanOrEqual(2);
  });

  it("keeps every compared case on one row with fixtures that fill their cells", () => {
    // Collected, not asserted in the loop: one read of every fault in the
    // set beats the first one, and an expect inside a conditional hides the
    // cases the condition skipped.
    const uncounted: string[] = [];
    const dusted: string[] = [];
    const unfilled: string[] = [];
    for (const c of cases) {
      const minTrackPx = parseMinColWidth(c.props.minColWidth ?? "16rem");
      const [below, at] = GRID_GAP_STEPS[gapOf(c.props) as "sm" | "md" | "lg"];
      for (const viewport of c.viewports) {
        const gap = bandOf(viewport) === "below-sm" ? below : at;
        const columns = autoFitColumns(viewport, minTrackPx, gap);
        const singleRow = c.children.length <= columns;
        if (singleRow && c.knownDivergence !== undefined) {
          uncounted.push(`${c.name} @${String(viewport)}: carries a divergence but is one row`);
          continue;
        }
        if (!singleRow && c.knownDivergence === undefined) {
          uncounted.push(
            `${c.name} @${String(viewport)}: asks for row banding without a knownDivergence`,
          );
          continue;
        }
        if (!singleRow || c.children.length < 2) continue; // a lone item may be any width
        const track = trackWidth(viewport, c.children.length, gap);
        if (!Number.isInteger(track)) {
          dusted.push(
            `${c.name} @${String(viewport)}: track ${String(track)} is not integral — two-edge rounding would read it with dust`,
          );
        }
        for (const [i, child] of c.children.entries()) {
          if (child.w !== track) {
            unfilled.push(
              `${c.name} @${String(viewport)}: fixture ${String(i)} does not fill its ${String(
                track,
              )}px cell`,
            );
          }
        }
      }
    }
    expect(uncounted).toEqual([]);
    expect(dusted).toEqual([]);
    expect(unfilled).toEqual([]);
  });

  it("counts the row-banding absence: at least one case carries it, named and owned", () => {
    const counted = cases.filter((c) => c.knownDivergence !== undefined);
    expect(counted.length).toBeGreaterThanOrEqual(1);
    for (const c of counted) {
      expect(c.knownDivergence?.owner).toBe("Phase 4B");
      expect(c.knownDivergence?.reason).toMatch(/row banding/);
      expect(c.knownDivergence?.reason).toMatch(/Removal:/);
    }
  });

  it("keeps every fixture inside the narrowest pinned viewport — the route mounts one page", () => {
    const narrowest = Math.min(...cases.flatMap((c) => [...c.viewports]));
    const widest = Math.max(...cases.flatMap((c) => c.children.map((child) => child.w)));
    expect(widest).toBeLessThanOrEqual(narrowest);
  });
});
