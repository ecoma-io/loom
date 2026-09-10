import { describe, expect, it } from "vitest";
import {
  SPLIT_GAP_BREAKPOINT,
  SPLIT_GAP_STEPS,
  SPLIT_UNMODELLED,
  SINGLE_LINE_MARGIN_PX,
  resolveMinSideWidth,
  splitLayout,
  staysOnOneLine,
} from "./layout";
import { cases } from "../e2e/conformance.cases";

// The mapping, the scale tables, the length resolution and the regime guard.
// What these tests pin is the ADAPTER; what holds the adapter equal to the
// component's rendered CSS is the conformance route, and what holds the
// algorithm the tree feeds is the engine's own suite. Every px value below
// is the scale at the 16px root the route pins.

const ctx = (viewportWidth: number, availableWidth = viewportWidth) => ({
  viewportWidth,
  availableWidth,
});

describe("splitLayout", () => {
  it("maps each gap step to its below-sm and at-sm px values", () => {
    expect(SPLIT_GAP_STEPS).toEqual({ sm: [8, 12], md: [12, 16], lg: [16, 24] });
    for (const gap of ["sm", "md", "lg"] as const) {
      const [below, at] = SPLIT_GAP_STEPS[gap];
      expect(splitLayout({ gap, minSideWidth: "8rem" }, ctx(360), []).style.gap).toBe(below);
      expect(
        splitLayout({ gap, minSideWidth: "8rem" }, ctx(SPLIT_GAP_BREAKPOINT), []).style.gap,
      ).toBe(at);
    }
  });

  it("maps gap none to zero in both bands — the prop ships no gap class at all", () => {
    expect(splitLayout({ gap: "none", minSideWidth: "8rem" }, ctx(360), []).style.gap).toBe(0);
    expect(splitLayout({ gap: "none", minSideWidth: "8rem" }, ctx(800), []).style.gap).toBe(0);
  });

  it("applies the component's own defaults — side left, minSideWidth 16rem, gap md", () => {
    const tree = splitLayout({}, ctx(800), [
      { w: 140, h: 40 },
      { w: 90, h: 24 },
    ]);
    expect(tree.id).toBe("root");
    expect(tree.style).toEqual({ axis: "row", gap: 16 });
    const [panel, content] = tree.children ?? [];
    // The panel: never moves — the exact declarations Split.vue ships.
    expect(panel?.style).toEqual({
      axis: "row",
      flexBasis: 256,
      flexGrow: 0,
      flexShrink: 0,
      minWidth: 256,
    });
    // The content: takes the rest — and the 50% floor resolved to px.
    expect(content?.style).toEqual({
      axis: "column",
      flexBasis: 0,
      flexGrow: 999,
      flexShrink: 1,
      minWidth: 400,
    });
  });

  it("resolves the content's 50% floor against availableWidth, never the viewport", () => {
    // The Phase 4A boundary decision in one assertion: percent never enters
    // the IR, and the quantity it resolves against is the measured content
    // box the route feeds — the same base the browser resolves it against.
    // 800 and 328 deliberately disagree so a viewport-based resolution
    // cannot pass by coincidence.
    const tree = splitLayout({ minSideWidth: "8rem" }, ctx(800, 328), []);
    const [, content] = tree.children ?? [];
    expect(content?.style.minWidth).toBe(164);
  });

  it("resolves minSideWidth at the pinned 16px root, px and rem both", () => {
    expect(resolveMinSideWidth("16rem")).toBe(256);
    expect(resolveMinSideWidth("0.5rem")).toBe(8);
    expect(resolveMinSideWidth("240px")).toBe(240);
    const tree = splitLayout({ minSideWidth: "240px" }, ctx(800), []);
    const [panel] = tree.children ?? [];
    expect(panel?.style).toEqual({
      axis: "row",
      flexBasis: 240,
      flexGrow: 0,
      flexShrink: 0,
      minWidth: 240,
    });
  });

  it("refuses lengths the conformance context cannot resolve honestly", () => {
    for (const length of ["14em", "50%", "calc(1rem + 2px)", "16", ""]) {
      expect(() => resolveMinSideWidth(length)).toThrow(/not a px or rem length/);
    }
  });

  it("follows the template's document order: panel first for side left, content first for side right", () => {
    // The comparator walks positionally, so the tree must carry the order
    // the browser lays out — which is also what puts the panel on the right.
    const left = splitLayout({ side: "left" }, ctx(800), []);
    const right = splitLayout({ side: "right" }, ctx(800), []);
    expect((left.children ?? [])[0]?.style.flexGrow).toBe(0);
    expect((left.children ?? [])[1]?.style.flexGrow).toBe(999);
    expect((right.children ?? [])[0]?.style.flexGrow).toBe(999);
    expect((right.children ?? [])[1]?.style.flexGrow).toBe(0);
  });

  it("lands the fixture children in the content block and leaves the panel childless", () => {
    // The route mounts only the default slot, and Split's default slot IS
    // the content area — so the modelled panel is the empty one (its basis
    // width and stretch height are still compared), and the content side is
    // a plain block: a column of stacked fixtures, no gap of its own.
    const tree = splitLayout({}, ctx(800), [
      { w: 140, h: 40 },
      { w: 90, h: 24 },
    ]);
    const [panel, content] = tree.children ?? [];
    expect(panel?.children).toBeUndefined();
    expect(content?.style.axis).toBe("column");
    expect(content?.style.gap).toBeUndefined();
    expect(content?.children).toEqual([
      { style: { axis: "row", width: 140, height: 40 } },
      { style: { axis: "row", width: 90, height: 24 } },
    ]);
  });

  it("crosses the regime the moment the browser would wrap — equality is still one line", () => {
    // The panel minimum alone exactly fills the content floor at 512px: the
    // row fits, so one line. One pixel narrower and the row is two lines in
    // the browser — the collapse is line collection, which the engine does
    // not model, and the guard (not a throw — see splitLayout) is what
    // keeps the case set on the fitting side of this boundary.
    const onTheLine = { minSideWidth: "16rem", gap: "none" } as const;
    expect(staysOnOneLine({ ...onTheLine }, ctx(800, 512))).toBe(true);
    expect(staysOnOneLine({ ...onTheLine }, ctx(800, 511))).toBe(false);
    // Total on the far side too: the adapter returns the one-line row for a
    // wrapped context, because the route evaluates every case at every width
    // the spec navigates and a context-conditional throw would kill a whole
    // page's report. The regime is never compared; SPLIT_UNMODELLED owns it.
    expect(() => splitLayout({ ...onTheLine }, ctx(800, 511), [])).not.toThrow();
  });

  it("counts the gap in the regime decision — a fitting panel wraps once the gap rides along", () => {
    // 256 + 12 against a 256 floor: neither number alone wraps, together
    // they do — the same arithmetic the browser's line breaker runs.
    expect(staysOnOneLine({ minSideWidth: "16rem", gap: "none" }, ctx(360, 512))).toBe(true);
    expect(staysOnOneLine({ minSideWidth: "16rem", gap: "md" }, ctx(360, 512))).toBe(false);
  });

  it("records the collapse as a counted absence, not a refusal", () => {
    // Sidebar's shape and sidebar's law: the fields are the exception-row
    // fields, mandatory, absences only.
    expect(SPLIT_UNMODELLED.length).toBeGreaterThanOrEqual(1);
    for (const absence of SPLIT_UNMODELLED) {
      expect(absence.aspect.trim()).not.toBe("");
      expect(absence.reason.trim()).not.toBe("");
      expect(absence.owner.trim()).not.toBe("");
      expect(absence.removal.trim()).not.toBe("");
    }
    expect(SPLIT_UNMODELLED.some((absence) => absence.aspect.includes("collapsed"))).toBe(true);
  });

  it("keeps the decision in staysOnOneLine — the one predicate, two readers", () => {
    expect(staysOnOneLine({ minSideWidth: "8rem", gap: "md" }, ctx(360))).toBe(true);
    expect(staysOnOneLine({ minSideWidth: "16rem", gap: "md" }, ctx(360))).toBe(false);
  });
});

// The coverage floor: every enumerated value of every modeled prop appears
// in at least one case, at a viewport inside each scale band that value's
// table distinguishes — see stack's layout.test.ts for why this is asserted
// rather than left to review. Split's floor adds the regime guard: every
// case must stay on the modelled single line at EVERY viewport the spec
// navigates, not merely the ones it declares — the route computes every
// case's adapter at every navigation, so a case on the far side of
// staysOnOneLine anywhere would be compared against a one-line tree for a
// two-line browser. The floor is what keeps the collapsed regime
// never-compared; SPLIT_UNMODELLED records what that regime would need.
describe("case coverage floor", () => {
  it("covers every gap value in both bands the gap scale distinguishes", () => {
    const uncovered = (["sm", "md", "lg"] as const).filter((gap) => {
      const viewports = cases
        .filter((c) => (c.props.gap ?? "md") === gap)
        .flatMap((c) => [...c.viewports]);
      return !(
        viewports.some((v) => v < SPLIT_GAP_BREAKPOINT) &&
        viewports.some((v) => v >= SPLIT_GAP_BREAKPOINT)
      );
    });
    expect(uncovered).toEqual([]);
  });

  it("covers gap none at least once — its table has no bands to distinguish", () => {
    expect(cases.some((c) => c.props.gap === "none")).toBe(true);
  });

  it("covers both side values — the default resolved, as the adapter resolves it", () => {
    const sides = new Set(cases.map((c) => c.props.side ?? "left"));
    expect([...sides].sort()).toEqual(["left", "right"]);
  });

  it("keeps every case on the modelled single line at every navigated viewport", () => {
    // Two pessimisms, both deliberate:
    // - the viewport set is the UNION of the cases' declared viewports — the
    //   spec's band list by construction — because the route computes every
    //   case at every navigation, and a wrapped case would be compared
    //   against a tree the browser does not build;
    // - the available width is the least the harness page can plausibly
    //   measure at that viewport (a classic scrollbar plus rounding,
    //   SINGLE_LINE_MARGIN_PX), since the route measures the real box and
    //   the floor has no browser. A case that only fits at the bare viewport
    //   width is a case waiting for a scrollbar.
    const navigated = [...new Set(cases.flatMap((c) => [...c.viewports]))];
    const crossed: string[] = [];
    for (const one of cases) {
      for (const viewport of navigated) {
        const ok = staysOnOneLine(one.props, {
          viewportWidth: viewport,
          availableWidth: viewport - SINGLE_LINE_MARGIN_PX,
        });
        if (!ok) crossed.push(`${one.name} @${String(viewport)}px`);
      }
    }
    expect(crossed).toEqual([]);
  });

  it("declares no known divergence — the collapse is guarded out, not skipped here", () => {
    // The unmapped behaviour stays OUT of the case set entirely; its record
    // is SPLIT_UNMODELLED and Phase 4B's modelled-subset record. A
    // divergence row here would read as evidence the case set never earned.
    expect(cases.every((c) => c.knownDivergence === undefined)).toBe(true);
  });
});
