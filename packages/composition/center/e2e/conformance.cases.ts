/**
 * Center's conformance cases — plain typed data, plus the component and
 * adapter the route rides on.
 *
 * This module is imported statically by playwright/harness/conformance.ts
 * (the one cross-library relative reach the boundary table names a
 * suppression for) and by the coverage-floor test in src/layout.test.ts.
 * It imports its own component and adapter intra-package, which is judged
 * clean under this package's own row. No Vue application code runs here:
 * the route mounts the component, this file only describes what to mount.
 */
import type { Component } from "vue";
import Center from "../src/Center.vue";
import { layout, centerLayout, type ChildSpec } from "../src/layout";

/** The props the adapter accepts — the same shape the component takes. */
export type CenterCaseProps = Parameters<typeof centerLayout>[0];

/** One conformance case. See ../src/layout.ts for the child and context shapes. */
export interface ConformanceCase {
  name: string;
  props: CenterCaseProps;
  /** Fixed-px child boxes, in slot order. Text-free by construction. */
  children: readonly ChildSpec[];
  /**
   * Viewport widths (px) the case is meaningful at; the spec navigates the
   * route once per viewport. Center's gutter is the one scale that steps at
   * `3xl`, so its cases carry all three bands: 360, 800 and 2000.
   */
  viewports: readonly number[];
  /** A known divergence, rendered as a visible skip with the reason — never deleted. */
  knownDivergence?: { reason: string; owner: string };
  /**
   * Engines this case is known to diverge on; the spec skips it there and
   * only there. Chromium is normative, and the case set is never silently
   * narrowed to the agreeing engines.
   */
  engines?: readonly string[];
}

/** The component the route mounts for these cases. */
export const component: Component = Center;

/** The adapter the route runs in-page beside the mounted component. */
export const adapter = centerLayout;

/** The engine entry, reached through this package rather than past the e2e boundary. */
export { layout };

export const cases: readonly ConformanceCase[] = [
  {
    name: "max-width-sm-with-overflowing-child",
    props: { maxWidth: "sm" },
    // Wider than the 384px−gutters content box: the child keeps its layout
    // box and the overflow is recorded — overflow: visible clips nothing.
    children: [{ w: 600, h: 64 }],
    viewports: [800],
  },
  {
    name: "max-width-md",
    props: { maxWidth: "md" },
    children: [{ w: 200, h: 64 }],
    viewports: [800],
  },
  {
    name: "max-width-xl",
    props: { maxWidth: "xl" },
    children: [{ w: 200, h: 64 }],
    viewports: [800],
  },
  {
    name: "gutter-on-across-all-three-bands",
    props: { maxWidth: "lg", gutter: true },
    children: [{ w: 200, h: 64 }],
    viewports: [360, 800, 2000],
  },
  {
    name: "gutter-off-across-all-three-bands",
    props: { maxWidth: "md", gutter: false },
    children: [{ w: 200, h: 64 }],
    viewports: [360, 800, 2000],
  },
  {
    // Two children: Center's children are block flow, not flex items, so
    // stacking is plain vertical flow — the container's height is the sum,
    // with no gap, and this case holds that equal in the browser.
    name: "stacks-multiple-children-block-flow",
    props: { maxWidth: "md" },
    children: [
      { w: 200, h: 64 },
      { w: 120, h: 32 },
    ],
    viewports: [800],
  },
];
