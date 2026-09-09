/**
 * Sidebar's conformance cases — plain typed data, plus the component and
 * adapter the route rides on. Every case keeps the row EXPANDED at every
 * viewport it names: the intrinsic collapse is flex-wrap line breaking,
 * outside the engine's single-line subset, so the coverage floor holds every
 * case × viewport to the fitting side of `sidebarCollapses` (see
 * SIDEBAR_UNMODELLED in ../src/layout.ts for what stays out and who owns
 * it). The route mounts the default slot, so the fixture boxes are the
 * content panel's population; the side panel models as the empty box its
 * basis sizes.
 *
 * This module is imported statically by playwright/harness/conformance.ts
 * (the one cross-library relative reach the boundary table names a
 * suppression for) and by the coverage-floor test in src/layout.test.ts.
 * It imports its own component and adapter intra-package, which is judged
 * clean under this package's own row. No Vue application code runs here:
 * the route mounts the component, this file only describes what to mount.
 */
import type { Component } from "vue";
import Sidebar from "../src/Sidebar.vue";
import { layout, sidebarLayout, type ChildSpec } from "../src/layout";

/** The props the adapter accepts — the same shape the component takes. */
export type SidebarCaseProps = Parameters<typeof sidebarLayout>[0];

/** One conformance case. See ../src/layout.ts for the child and context shapes. */
export interface ConformanceCase {
  name: string;
  props: SidebarCaseProps;
  /** Fixed-px child boxes, in slot order. Text-free by construction. */
  children: readonly ChildSpec[];
  /**
   * Viewport widths (px) the case is meaningful at; the spec navigates the
   * route once per viewport. The one band the slice's scale distinguishes is
   * Tailwind's `sm` (640px), so the set spans two bands: 360 below it and
   * 800 at or above it — the responsive contract's `narrow` and `mid` bands
   * (packages/core/src/responsive-contract.ts owns the numbers).
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
export const component: Component = Sidebar;

/** The adapter the route runs in-page beside the mounted component. */
export const adapter = sidebarLayout;

/** The engine entry, reached through this package rather than past the e2e boundary. */
export { layout };

export const cases: readonly ConformanceCase[] = [
  {
    // No props at all: what a consumer renders by default. The adapter
    // applies the component's own defaults (side left, 16rem basis, 50%
    // floor, gap on), and this case holds that applied default equal to the
    // component's default styles at a width where the default fits.
    name: "sidebar-expanded-defaults",
    props: {},
    children: [
      { w: 120, h: 40 },
      { w: 80, h: 24 },
    ],
    viewports: [800],
  },
  {
    // The tree's child order IS the document order: content first for
    // side="right" — the DOM-order fix that makes the collapsed stack agree
    // with the row, mirrored here as the order the comparator walks.
    name: "sidebar-side-right-content-first",
    props: { side: "right" },
    children: [
      { w: 120, h: 40 },
      { w: 80, h: 24 },
    ],
    viewports: [800],
  },
  {
    name: "sidebar-gap-off",
    props: { gap: false },
    children: [
      { w: 120, h: 40 },
      { w: 80, h: 24 },
    ],
    viewports: [800],
  },
  {
    // Below `sm`: the 12px gap step, and inputs chosen so the row still fits
    // a narrow container — the component's own defaults would collapse here,
    // which is the boundary this case set never crosses, so the band is
    // carried with a narrower basis and floor instead.
    name: "sidebar-narrow-band-fits",
    props: { sideWidth: "6rem", contentMin: "10%" },
    children: [
      { w: 120, h: 40 },
      { w: 80, h: 24 },
    ],
    viewports: [360],
  },
  {
    // A different floor percentage, resolved against the measured container:
    // the adapter-side arithmetic the IR cannot carry, at a value far enough
    // from the default's 50% to catch a hard-coded half.
    name: "sidebar-content-min-seventy",
    props: { contentMin: "70%", sideWidth: "10rem" },
    children: [
      { w: 120, h: 40 },
      { w: 80, h: 24 },
    ],
    viewports: [800],
  },
];
