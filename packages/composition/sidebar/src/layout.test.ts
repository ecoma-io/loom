import { describe, expect, it } from "vitest";
import {
  SIDEBAR_GAP_BREAKPOINT,
  SIDEBAR_GAP_STEPS,
  SIDEBAR_UNMODELLED,
  sidebarCollapses,
  sidebarLayout,
} from "./layout";
import { cases } from "../e2e/conformance.cases";

// The mapping, the scale tables and the throw contract. What these tests
// pin is the ADAPTER; what holds the adapter equal to the component's
// rendered CSS is the conformance route, and what holds the algorithm the
// tree feeds is the engine's own suite. Every px value below is the value at
// the 16px root the route pins.

const ctx = (viewportWidth: number, availableWidth = viewportWidth) => ({
  viewportWidth,
  availableWidth,
});

describe("sidebarLayout", () => {
  it("maps the gap scale to its below-sm and at-sm px values", () => {
    expect(SIDEBAR_GAP_STEPS).toEqual([12, 16]);
    // The gap step is props-independent, but the component's own defaults
    // collapse at 360 — the boundary the case set never crosses — so the
    // narrow inputs the narrow-band case carries are the ones probed here.
    const narrow = { sideWidth: "6rem", contentMin: "10%" };
    expect(sidebarLayout(narrow, ctx(360), []).style.gap).toBe(12);
    expect(sidebarLayout(narrow, ctx(SIDEBAR_GAP_BREAKPOINT), []).style.gap).toBe(16);
  });

  it("omits the gap entirely when the prop turns it off — the absence, not a styled zero", () => {
    expect("gap" in sidebarLayout({ gap: false }, ctx(800), []).style).toBe(false);
  });

  it("applies the component's own defaults — side left, 16rem basis, 50% floor, gap on", () => {
    const tree = sidebarLayout({}, ctx(800), []);
    expect(tree.id).toBe("root");
    expect(tree.style).toEqual({ axis: "row", gap: 16 });
    const [side, content] = tree.children ?? [];
    // 16rem at the pinned root; the panel trio is the DOM's, verbatim.
    expect(side?.style).toEqual({
      axis: "column",
      flexBasis: 256,
      flexGrow: 0,
      flexShrink: 1,
    });
    expect(content?.style).toEqual({
      axis: "column",
      flexBasis: 0,
      flexGrow: 999,
      flexShrink: 1,
      minWidth: 400,
    });
  });

  it("resolves the contentMin percentage ADAPTER-SIDE, against the measured container", () => {
    // The IR carries no percent: 50% becomes 0.5 × availableWidth here. The
    // viewport stays 800 while the container varies, so a resolution against
    // the wrong quantity cannot pass either assertion; the narrower basis
    // keeps the 70% row on the fitting side of the collapse.
    expect(sidebarLayout({}, ctx(800, 600), []).children?.[1]?.style.minWidth).toBe(300);
    expect(
      sidebarLayout({ contentMin: "70%", sideWidth: "5rem" }, ctx(800, 600), []).children?.[1]
        ?.style.minWidth,
    ).toBe(420);
  });

  it("resolves sideWidth in rem at the pinned root, fractional values included", () => {
    expect(sidebarLayout({ sideWidth: "10rem" }, ctx(800), []).children?.[0]?.style.flexBasis).toBe(
      160,
    );
    expect(
      sidebarLayout({ sideWidth: "14.5rem" }, ctx(800), []).children?.[0]?.style.flexBasis,
    ).toBe(232);
  });

  it("orders the tree as the document orders it: content first for side 'right'", () => {
    for (const side of ["left", "right"] as const) {
      const tree = sidebarLayout({ side }, ctx(800), []);
      const first = tree.children?.[0]?.style.flexGrow;
      expect(first, `side ${side}: first child flexGrow`).toBe(side === "right" ? 999 : 0);
    }
  });

  it("carries the fixture boxes as the content panel's children, and the side panel as empty", () => {
    // The route mounts the default slot, so the fixtures are the content
    // panel's population; the side panel is the empty box its basis sizes.
    const tree = sidebarLayout({}, ctx(800), [
      { w: 120, h: 40 },
      { w: 80, h: 24 },
    ]);
    expect(tree.children?.[1]?.children).toEqual([
      { style: { axis: "row", width: 120, height: 40 } },
      { style: { axis: "row", width: 80, height: 24 } },
    ]);
    // No children key at all — the same shape a leaf carries, and what the
    // comparator's `?? []` reads when it walks the empty mounted panel.
    expect(tree.children?.[0]?.children).toBeUndefined();
  });

  it("throws on a sideWidth that is not a rem length", () => {
    for (const bad of ["224px", "wide", ""]) {
      expect(() => sidebarLayout({ sideWidth: bad }, ctx(800), [])).toThrow(/not modeled/);
    }
  });

  it("throws on a contentMin that is not a plain percentage", () => {
    for (const bad of ["10rem", "half", ""]) {
      expect(() => sidebarLayout({ contentMin: bad }, ctx(800), [])).toThrow(/not modeled/);
    }
  });
});

describe("the intrinsic collapse", () => {
  it("resolves the breakpoint adapter-side, exact at the boundary", () => {
    // The floor is a percentage of the container, so it moves with it: the
    // defaults collapse where gap + basis exhaust the other half —
    // 0.5W + 272 > W, at W = 544. A line that fits exactly does not break,
    // in the browser or here.
    expect(sidebarCollapses({}, ctx(800, 544))).toBe(false);
    expect(sidebarCollapses({}, ctx(800, 543))).toBe(true);
  });

  it("keeps the adapter total past the boundary — the regime is guarded, not thrown on", () => {
    // The route evaluates every case at every width the spec navigates, so a
    // context-conditional throw would kill a whole page for comparisons
    // nobody makes (measured: the 800-declared defaults case, evaluated in a
    // 360px page, took the route down before it could publish). The
    // defaults collapse below 544px of container, and past it the tree is
    // the single-line approximation the browser does not render — the
    // floor's next test is what keeps no case there.
    expect(() => sidebarLayout({}, ctx(360), [])).not.toThrow();
    expect(sidebarCollapses({}, ctx(360))).toBe(true);
    expect(sidebarCollapses({ sideWidth: "6rem", contentMin: "10%" }, ctx(360))).toBe(false);
  });
});

// The counted absences: behaviours with no honest mapping in the engine's
// modelled subset. The list is held truthful here rather than trusted — a
// blank field would read as a record while recording nothing, and a list
// that shrank silently would read as evidence where none landed.
describe("SIDEBAR_UNMODELLED", () => {
  it("counts at least one absence, every field mandatory and filled", () => {
    expect(SIDEBAR_UNMODELLED.length).toBeGreaterThanOrEqual(1);
    for (const absence of SIDEBAR_UNMODELLED) {
      for (const field of ["aspect", "reason", "owner", "removal"] as const) {
        expect(absence[field].trim().length, `${absence.aspect}: ${field}`).toBeGreaterThan(0);
      }
    }
  });

  it("names an owner the phase plan recognises", () => {
    for (const absence of SIDEBAR_UNMODELLED) {
      expect(absence.owner).toMatch(/Phase 4B|engine/);
    }
  });
});

// The coverage floor: every enumerated value of every modeled prop appears
// in at least one case, at a viewport inside each scale band the slice
// distinguishes, and on the fitting side of the collapse boundary. Asserted
// here rather than left to review because a case that sat in the collapsed
// regime would fail only as a geometry diff — the browser wraps, the engine
// shrinks — naming no boundary; naming it here turns that into a message
// about the regime instead of about pixels.
describe("case coverage floor", () => {
  it("covers every modeled side value at least once", () => {
    const uncovered = (["left", "right"] as const).filter(
      (side) => !cases.some((c) => (c.props.side ?? "left") === side),
    );
    expect(uncovered).toEqual([]);
  });

  it("covers both gap booleans", () => {
    // A case passing nothing renders the default (on), so absence covers it.
    const states = new Set(cases.map((c) => ((c.props.gap ?? true) ? "on" : "off")));
    expect([...states].sort()).toEqual(["off", "on"]);
  });

  it("covers both bands the gap scale distinguishes", () => {
    const viewports = cases.flatMap((c) => [...c.viewports]);
    expect(viewports.some((v) => v < SIDEBAR_GAP_BREAKPOINT)).toBe(true);
    expect(viewports.some((v) => v >= SIDEBAR_GAP_BREAKPOINT)).toBe(true);
  });

  it("keeps every case x viewport on the fitting side of the collapse", () => {
    const collapsed: string[] = [];
    for (const one of cases) {
      for (const viewport of one.viewports) {
        // The route measures the container; the viewport is the largest that
        // measurement can be, and every case keeps its full demand under it
        // with room for the scrollbar a real page adds.
        if (sidebarCollapses(one.props, ctx(viewport, viewport))) {
          collapsed.push(`${one.name}@${viewport.toString()}`);
        }
      }
    }
    expect(collapsed).toEqual([]);
  });
});
