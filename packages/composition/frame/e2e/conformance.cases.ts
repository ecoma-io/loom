/**
 * Frame's conformance cases — plain typed data, plus the component and
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
import Frame from "../src/Frame.vue";
import { layout, frameLayout, type ChildSpec } from "../src/layout";

/** The props the adapter accepts — the same shape the component takes. */
export type FrameCaseProps = Parameters<typeof frameLayout>[0];

/** One conformance case. See ../src/layout.ts for the child and context shapes. */
export interface ConformanceCase {
  name: string;
  props: FrameCaseProps;
  /** Fixed-px child boxes, in slot order. Text-free by construction. */
  children: readonly ChildSpec[];
  /**
   * Viewport widths (px) the case is meaningful at; the spec navigates the
   * route once per viewport. The ratio arithmetic is band-independent, so
   * one viewport per case suffices.
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
export const component: Component = Frame;

/** The adapter the route runs in-page beside the mounted component. */
export const adapter = frameLayout;

/** The engine entry, reached through this package rather than past the e2e boundary. */
export { layout };

export const cases: readonly ConformanceCase[] = [
  {
    name: "ratio-16-9",
    props: { ratio: "16:9" },
    children: [{ w: 100, h: 50 }],
    viewports: [800],
  },
  {
    name: "ratio-4-3",
    props: { ratio: "4:3" },
    children: [{ w: 100, h: 50 }],
    viewports: [360],
  },
  {
    name: "ratio-1-1",
    props: { ratio: "1:1" },
    children: [{ w: 100, h: 50 }],
    viewports: [800],
  },
  {
    name: "ratio-3-4",
    props: { ratio: "3:4" },
    children: [{ w: 100, h: 50 }],
    viewports: [360],
  },
  {
    name: "ratio-parsed-free-form",
    props: { ratio: "21 / 9" },
    children: [{ w: 100, h: 50 }],
    viewports: [800],
  },
  {
    name: "overflow-tall-child",
    props: { ratio: "1:1" },
    // At 360 the frame is 360 tall; the 400px child overflows. The
    // component's overflow: hidden clips paint, not geometry — the browser's
    // rect still reports the layout box, which is what the no-clipping
    // contract is proven by.
    children: [{ w: 50, h: 400 }],
    viewports: [360],
  },
  {
    // A decimal "a / b" ratio: Frame.vue passes the raw CSS value through
    // and the engine divides it — the height is fractional (360 / 1.85),
    // which is exactly what the two-edge rounding comparator exists for.
    name: "ratio-parsed-decimal",
    props: { ratio: "1.85 / 1" },
    children: [{ w: 100, h: 50 }],
    viewports: [800],
  },
  {
    // The main-axis twin of overflow-tall-child: a child wider than the
    // 360px frame keeps its 500px layout box in the browser's rect.
    name: "overflow-wide-child",
    props: { ratio: "16:9" },
    children: [{ w: 500, h: 50 }],
    viewports: [360],
  },
];
