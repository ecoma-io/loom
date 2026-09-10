/**
 * DashboardGrid's conformance cases — plain typed data, plus the component
 * and adapter the route rides on.
 *
 * This module is imported statically by playwright/harness/conformance.ts
 * (the one cross-library relative reach the boundary table names a
 * suppression for) and by the coverage-floor test in src/layout.test.ts.
 * It imports its own component and adapter intra-package, which is judged
 * clean under this package's own row. No Vue application code runs here
 * beyond mounting: the route mounts the component, this file only describes
 * what to mount.
 *
 * Every case is single-viewport, on purpose: a tile's fixture width IS its
 * spanned area at that container (see ../src/layout.ts), and two bands would
 * need two child tables where the case schema carries one. The bands the gap
 * scale distinguishes are covered across the set — the coverage floor in
 * src/layout.test.ts holds them to it.
 *
 * Single-viewport cases meet a route that computes all of them at every
 * width it navigates, so each case carries its width twice, once for each
 * reader: `viewports` for the route and spec, `at` on the props for the two
 * readers that need it per case at runtime — the route adapter, which
 * answers the out-of-scope computations with an empty line instead of
 * refusing the page (see ../src/layout.ts), and the wrapper below, which
 * hides the fixture at widths it is not published at so a fixture authored
 * for 944px cannot overflow a 360px page and pull in the scrollbar that
 * would shift every measured width. The coverage floor holds the two
 * spellings equal.
 */
import { cloneVNode, defineComponent, h, type Component, type PropType, type VNode } from "vue";
import DashboardGrid, { type DashboardGridGap } from "../src/DashboardGrid.vue";
// `dashboardGridLayout` is reached only as a type here (the case props
// shape); the route adapter is the value the route runs.
import {
  dashboardGridRouteAdapter,
  layout,
  type dashboardGridLayout,
  type ChildSpec,
} from "../src/layout";

/** The props the adapter accepts — the same shape the component takes, plus spans. */
export type DashboardGridCaseProps = Parameters<typeof dashboardGridLayout>[0];

/** One conformance case. See ../src/layout.ts for the child and context shapes. */
export interface ConformanceCase {
  name: string;
  props: DashboardGridCaseProps;
  /** Fixed-px child boxes, in slot order. Text-free by construction. */
  children: readonly ChildSpec[];
  /**
   * The viewport widths (px) this case is meaningful at — exactly one, the
   * width whose container the fixture widths are the area arithmetic of.
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

/**
 * DashboardGrid as the route mounts it, plus the one thing the generic
 * harness cannot express: the fixture children are plain px rectangles, so a
 * spanned tile's `col-span-*` — a call-site utility by the component's own
 * contract — has nowhere to land. This wrapper IS that call site: it applies
 * `props.spans[i]` to slot child i as the same utility a consumer would
 * author, and leaves DashboardGrid's own render path untouched.
 */
const ConformanceDashboardGrid = defineComponent({
  props: {
    minTileWidth: { type: String, required: false, default: undefined },
    gap: { type: String, required: false, default: undefined },
    spans: { type: Array as PropType<readonly number[]>, required: false, default: undefined },
    at: { type: Number, required: false, default: undefined },
  },
  setup(props, { slots }) {
    // The fixture renders only at the width its case is published at. The
    // route shows every case at every width it navigates, and a fixture
    // authored for 944px overflowing a 360px page would pull in the
    // scrollbar that shifts every measured width on the page — the defect
    // the grid twin avoids by keeping every fixture narrower than the
    // narrowest width, which a spanned fixture cannot, being wider than the
    // narrow band by definition. innerWidth is stable for a page's lifetime:
    // each viewport is its own load and nothing resizes mid-test.
    const active = props.at === undefined || props.at === window.innerWidth;
    return () =>
      h(
        DashboardGrid,
        {
          // Spread, not `minTileWidth: undefined`: an explicitly-undefined
          // prop is a type error under exactOptionalPropertyTypes, and an
          // absent one is what reaches the component's own defaults.
          ...(props.minTileWidth !== undefined ? { minTileWidth: props.minTileWidth } : {}),
          // The case data is the adapter's own prop shape; the Vue prop is a
          // plain string because the wrapper is fixture machinery, and the
          // cases only ever carry the component's own three steps.
          ...(props.gap !== undefined ? { gap: props.gap as DashboardGridGap } : {}),
          // The style falls through to DashboardGrid's root div and joins
          // its own style binding there; display:none removes the fixture
          // from layout entirely, so it contributes no geometry.
          ...(active ? {} : { style: { display: "none" } }),
        },
        {
          default: () =>
            (slots.default?.() ?? []).map((vnode: VNode, i: number) => {
              const span = props.spans?.[i] ?? 1;
              const utility = SPAN_UTILITIES[span];
              // cloneVNode, not mutation: a vnode's props are not this
              // module's to rewrite in place, and cloneVNode is Vue's own
              // merge path for exactly this.
              return utility === undefined ? vnode : cloneVNode(vnode, { class: utility });
            }),
        },
      );
  },
});

/**
 * The span utilities the cases author, spelled out as literals because
 * Tailwind generates utilities from the text it scans — a class only spelled
 * dynamically (`col-span-${span}`) is a rule silently missing from the
 * harness stylesheet, the defect class of #284. A span outside this table is
 * a case-authoring bug, and mounting it without the utility would compare a
 * one-track tile against a multi-track tree, so it stays a lookup miss.
 */
const SPAN_UTILITIES: Record<number, string> = { 2: "col-span-2", 3: "col-span-3" };

/** The component the route mounts for these cases. */
export const component: Component = ConformanceDashboardGrid;

/** The adapter the route runs in-page beside the mounted component. */
export const adapter = dashboardGridRouteAdapter;

/** The engine entry, reached through this package rather than past the e2e boundary. */
export { layout };

export const cases: readonly ConformanceCase[] = [
  // The narrow band, one tile at a time: below Tailwind's `sm` the gap scale
  // steps down, and a 360px container fits a single 14rem track — the one
  // line the modelled subset covers is the whole grid there.
  {
    name: "one-tile-narrow-band-gap-md",
    props: { minTileWidth: "14rem", gap: "md", at: 360 },
    children: [{ w: 360, h: 48 }],
    viewports: [360],
  },
  {
    name: "one-tile-narrow-band-gap-sm",
    props: { minTileWidth: "14rem", gap: "sm", at: 360 },
    children: [{ w: 360, h: 40 }],
    viewports: [360],
  },
  {
    name: "one-tile-narrow-band-gap-lg",
    props: { minTileWidth: "14rem", gap: "lg", at: 360 },
    children: [{ w: 360, h: 56 }],
    viewports: [360],
  },
  {
    // No props at all: what a consumer renders by default (16rem floor, md
    // gutter). At 360 the min(100%, …) floor keeps the single track at the
    // container width — a tile never forces horizontal overflow.
    name: "component-defaults-narrow-band",
    props: { at: 360 },
    children: [{ w: 360, h: 40 }],
    viewports: [360],
  },

  // The mid band, where the fitted count is three and the collapse shows:
  // two tiles on a three-track grid leave the third track empty, auto-fit
  // collapses it, and the survivors grow to share the whole width.
  {
    // At sm and up gap="sm" is 12px: (800 - 12) / 2 = 394 per track.
    name: "two-tiles-mid-band-gap-sm",
    props: { minTileWidth: "14rem", gap: "sm", at: 800 },
    children: [
      { w: 394, h: 40 },
      { w: 394, h: 56 },
    ],
    viewports: [800],
  },
  {
    // The demo's own number: (800 + 16) / (224 + 16) = 3.4 → three tracks,
    // three tiles, no collapse — each track exactly the min tile width
    // arithmetic allows.
    name: "three-tiles-mid-band-gap-md",
    props: { minTileWidth: "14rem", gap: "md", at: 800 },
    children: [
      { w: 256, h: 40 },
      { w: 256, h: 48 },
      { w: 256, h: 56 },
    ],
    viewports: [800],
  },
  {
    name: "two-tiles-mid-band-gap-lg",
    props: { minTileWidth: "14rem", gap: "lg", at: 800 },
    children: [
      { w: 388, h: 40 },
      { w: 388, h: 48 },
    ],
    viewports: [800],
  },
  {
    name: "component-defaults-mid-band",
    props: { at: 800 },
    children: [
      { w: 392, h: 40 },
      { w: 392, h: 48 },
    ],
    viewports: [800],
  },

  // The reflow boundary from both sides: at 704 the container fits exactly
  // three 224px tracks (3 × 224 + 2 × 16 = 704), so the track width IS the
  // declared minimum; two pixels narrower only two fit.
  {
    name: "column-count-boundary-exact-fit",
    props: { minTileWidth: "14rem", gap: "md", at: 704 },
    children: [
      { w: 224, h: 40 },
      { w: 224, h: 48 },
      { w: 224, h: 56 },
    ],
    viewports: [704],
  },
  {
    name: "column-count-just-below-the-boundary",
    props: { minTileWidth: "14rem", gap: "md", at: 702 },
    children: [
      { w: 343, h: 40 },
      { w: 343, h: 48 },
    ],
    viewports: [702],
  },

  // Spans. A spanned tile is authored at its area width — what a stretching
  // col-span panel renders — and its siblings flow at the span step.
  {
    // Three fitted tracks, used by a span-2 and a span-1: the wide panel
    // takes tracks 0–1, the tile lands on track 2.
    name: "span-two-then-one-mid-band",
    props: { minTileWidth: "14rem", gap: "md", spans: [2, 1], at: 800 },
    children: [
      { w: 528, h: 48 },
      { w: 256, h: 40 },
    ],
    viewports: [800],
  },
  {
    // One tile spanning all three fitted tracks: its area is the whole
    // container — the extreme of the collapse arithmetic.
    name: "span-three-fills-the-container",
    props: { minTileWidth: "14rem", gap: "md", spans: [3], at: 800 },
    children: [{ w: 800, h: 56 }],
    viewports: [800],
  },
  {
    // Four fitted tracks ((944 + 16) / 240 = 4.0 exactly), two span-2 panels
    // side by side: the same span at a higher track count.
    name: "span-two-pair-at-four-tracks",
    props: { minTileWidth: "14rem", gap: "md", spans: [2, 2], at: 944 },
    children: [
      { w: 464, h: 40 },
      { w: 464, h: 48 },
    ],
    viewports: [944],
  },
];
