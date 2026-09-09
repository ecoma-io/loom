/**
 * Grid's conformance cases — plain typed data, plus the component and
 * adapter the route rides on.
 *
 * Grid's browser-only fact is the reflow: `repeat(auto-fit, minmax(...))`
 * recomputes the track list from the container's own width, so the same
 * element renders a different number of columns as the space it sits in
 * narrows. These cases pin that arithmetic where it actually turns — the
 * container widths W where the repetition count flips — as engine-vs-browser
 * equality, with fixtures that FILL THEIR CELLS: the engine places children
 * at cursor sums of (size + gap) and a grid places items at track starts,
 * and the two agree to the pixel only when item == track (see
 * ../src/layout.ts). Each multi-item case is therefore pinned at exactly the
 * one viewport whose track arithmetic its fixture encodes; a case that
 * wanted two widths would need two fixture sets, and one case per boundary
 * is what names the boundary in the report.
 *
 * The set is also the page the route mounts, one document at every pinned
 * viewport: every fixture stays within the narrowest width in the set
 * (268px), so no case overflows the page at another case's viewport and
 * pulls in a scrollbar that would shift every measured width.
 *
 * This module is imported statically by playwright/harness/conformance.ts
 * (the one cross-library relative reach the boundary table names a
 * suppression for) and by the coverage-floor test in src/layout.test.ts.
 * It imports its own component and adapter intra-package, which is judged
 * clean under this package's own row. No Vue application code runs here:
 * the route mounts the component, this file only describes what to mount.
 */
import type { Component } from "vue";
import Grid from "../src/Grid.vue";
import { layout, gridLayout, type ChildSpec } from "../src/layout";

/** The props the adapter accepts — the same shape the component takes. */
export type GridCaseProps = Parameters<typeof gridLayout>[0];

/** One conformance case. See ../src/layout.ts for the child and context shapes. */
export interface ConformanceCase {
  name: string;
  props: GridCaseProps;
  /** Fixed-px child boxes, in slot order. Text-free by construction. */
  children: readonly ChildSpec[];
  /**
   * Viewport widths (px) the case is meaningful at. For a multi-item case
   * that is exactly the width its fixture's track arithmetic encodes; the
   * gap the arithmetic uses is the viewport's own scale band, because the
   * Tailwind `sm:` on the gap classes responds to the viewport while the
   * auto-fit count responds to the container.
   */
  viewports: readonly number[];
  /** A known divergence, rendered as a visible skip with the reason — never deleted. */
  knownDivergence?: { reason: string; owner: string };
  /**
   * Engines this case is known to diverge on; the spec skips it there and
   * only there. Chromium is normative — what every pull request gates on is
   * the definition the component ships under — and the case set is never
   * silently narrowed to the agreeing engines.
   */
  engines?: readonly string[];
}

/** The component the route mounts for these cases. */
export const component: Component = Grid;

/** The adapter the route runs in-page beside the mounted component. */
export const adapter = gridLayout;

/** The engine entry, reached through this package rather than past the e2e boundary. */
export { layout };

export const cases: readonly ConformanceCase[] = [
  {
    // The one shape that does not need the fill-the-cell convention: a lone
    // item sits at the track start whatever its width. n is 1 at 360 and 3
    // at 800, so this is also the empty-track collapse in both gap bands —
    // the used track count is 1 either way.
    name: "lone-item-narrow-and-mid",
    props: {},
    children: [{ w: 120, h: 40 }],
    viewports: [360, 800],
  },
  {
    // 524 = 2·(256 + 12) − 12: the exact width where the repetition count
    // flips 1→2 below `sm` (the md gap is 12px down here). Every track is
    // exactly its 256px floor at the boundary, and one pixel narrower
    // reflows the grid to the one-column band whose banding is the counted
    // exception below.
    name: "boundary-one-to-two-columns",
    props: {},
    children: [
      { w: 256, h: 40 },
      { w: 256, h: 40 },
    ],
    viewports: [524],
  },
  {
    // 800 = 3·(256 + 16) − 16: the flip 2→3 at the at-`sm` gap, on the
    // responsive contract's mid band. Three 256px tracks tile the
    // container exactly.
    name: "boundary-two-to-three-columns",
    props: {},
    children: [
      { w: 256, h: 40 },
      { w: 256, h: 40 },
      { w: 256, h: 40 },
    ],
    viewports: [800],
  },
  {
    // The sm gap step at its own boundary: 520 = 2·(256 + 8) − 8, the flip
    // 1→2 under the 8px narrow-band gutter.
    name: "gap-sm-boundary-below-sm",
    props: { gap: "sm" },
    children: [
      { w: 256, h: 20 },
      { w: 256, h: 20 },
    ],
    viewports: [520],
  },
  {
    // The sm gap step at the sm breakpoint itself — the at-`sm` 12px value,
    // with a 8rem floor so four 151px tracks fit inside the fixtures-stay-
    // under-268px page bound.
    name: "gap-sm-four-columns-at-sm",
    props: { gap: "sm", minColWidth: "8rem" },
    children: [
      { w: 151, h: 20 },
      { w: 151, h: 20 },
      { w: 151, h: 20 },
      { w: 151, h: 20 },
    ],
    viewports: [640],
  },
  {
    // The lg gap step at its own boundary: 528 = 2·(256 + 16) − 16.
    name: "gap-lg-boundary-below-sm",
    props: { gap: "lg" },
    children: [
      { w: 256, h: 56 },
      { w: 256, h: 56 },
    ],
    viewports: [528],
  },
  {
    // The lg gap step at/above `sm`: the 24px value, four 142px tracks at
    // the mid band.
    name: "gap-lg-four-columns-at-sm",
    props: { gap: "lg", minColWidth: "8rem" },
    children: [
      { w: 142, h: 56 },
      { w: 142, h: 56 },
      { w: 142, h: 56 },
      { w: 142, h: 56 },
    ],
    viewports: [640],
  },
  {
    // The minColWidth prop reaching the arithmetic through a rem value:
    // 332 = 2·(160 + 12) − 12 for a 10rem floor below `sm`.
    name: "min-col-width-rem-boundary-below-sm",
    props: { minColWidth: "10rem" },
    children: [
      { w: 160, h: 40 },
      { w: 160, h: 40 },
    ],
    viewports: [332],
  },
  {
    // The same prop through a px value, at the narrowest width the set
    // pins: 268 = 2·(128 + 12) − 12. This case is also the page-fit floor —
    // every fixture in the set is ≤ 268px wide, so the document this case
    // anchors never scrolls horizontally.
    name: "min-col-width-px-boundary-below-sm",
    props: { minColWidth: "128px" },
    children: [
      { w: 128, h: 24 },
      { w: 128, h: 24 },
    ],
    viewports: [268],
  },
  {
    // The auto-fit collapse itself: four 128px repetitions fit at 656 with
    // the at-`sm` md gap, so n is 4 while only three items exist — the
    // empty track collapses and its 1fr share redistributes, giving three
    // tracks of 208. If the empty track survived, the tracks would be four
    // lots of 152px and the items would sit 152px apart, not 224px.
    name: "auto-fit-collapses-empty-tracks",
    props: { gap: "md", minColWidth: "8rem" },
    children: [
      { w: 208, h: 40 },
      { w: 208, h: 40 },
      { w: 208, h: 40 },
    ],
    viewports: [656],
  },
  {
    // The counted exception: four items at a width that fits three columns
    // is two rows, and the engine's single-line IR cannot say row banding —
    // no row count, no per-row track starts, no row gaps. The adapter
    // returns the first row's projection and this case declines the
    // comparison rather than agreeing with nothing; it stays mounted so the
    // arrangement is visible in every report.
    name: "multi-row-band-beyond-the-modelled-subset",
    props: {},
    children: [
      { w: 100, h: 40 },
      { w: 100, h: 40 },
      { w: 100, h: 40 },
      { w: 100, h: 40 },
    ],
    viewports: [800],
    knownDivergence: {
      reason:
        "the engine's single-line IR cannot say the row banding a grid with more items than columns renders — row count, per-row track starts and row gaps are outside the modelled subset, so the adapter emits the first row's projection and this case is not compared. Removal: the pull request that brings line collection to the engine deletes this divergence and the case compares.",
      owner: "Phase 4B",
    },
  },
];
