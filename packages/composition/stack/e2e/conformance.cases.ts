/**
 * Stack's conformance cases — plain typed data, plus the component and
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
import Stack from "../src/Stack.vue";
import { layout, stackLayout, type ChildSpec } from "../src/layout";

/** The props the adapter accepts — the same shape the component takes. */
export type StackCaseProps = Parameters<typeof stackLayout>[0];

/** One conformance case. See ../src/layout.ts for the child and context shapes. */
export interface ConformanceCase {
  name: string;
  props: StackCaseProps;
  /** Fixed-px child boxes, in slot order. Text-free by construction. */
  children: readonly ChildSpec[];
  /**
   * Viewport widths (px) the case is meaningful at; the spec navigates the
   * route once per viewport. The three bands the slice's scales distinguish
   * are below `sm` (360), `sm`–`3xl` (800) and at/above `3xl` (2000).
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
export const component: Component = Stack;

/** The adapter the route runs in-page beside the mounted component. */
export const adapter = stackLayout;

/** The engine entry, reached through this package rather than past the e2e boundary. */
export { layout };

export const cases: readonly ConformanceCase[] = [
  {
    name: "gap-sm-narrow-and-wide",
    props: { gap: "sm" },
    children: [
      { w: 120, h: 40 },
      { w: 80, h: 24 },
      { w: 200, h: 56 },
    ],
    viewports: [360, 800],
  },
  {
    name: "gap-md-narrow-and-wide",
    props: { gap: "md" },
    children: [
      { w: 120, h: 40 },
      { w: 80, h: 24 },
      { w: 200, h: 56 },
    ],
    viewports: [360, 800],
  },
  {
    name: "gap-lg-narrow-and-wide",
    props: { gap: "lg" },
    children: [
      { w: 120, h: 40 },
      { w: 80, h: 24 },
      { w: 200, h: 56 },
    ],
    viewports: [360, 800],
  },
  {
    name: "align-start",
    props: { align: "start" },
    children: [
      { w: 120, h: 40 },
      { w: 200, h: 56 },
    ],
    viewports: [800],
  },
  {
    name: "align-center",
    props: { align: "center" },
    children: [
      { w: 120, h: 40 },
      { w: 200, h: 56 },
    ],
    viewports: [800],
  },
  {
    name: "align-end",
    props: { align: "end" },
    children: [
      { w: 120, h: 40 },
      { w: 200, h: 56 },
    ],
    viewports: [800],
  },
  {
    name: "align-stretch",
    props: { align: "stretch" },
    children: [
      { w: 120, h: 40 },
      { w: 200, h: 56 },
    ],
    viewports: [800],
  },
  {
    // No props at all: what a consumer renders by default. The adapter
    // applies the component's own defaults (gap md, align stretch), and this
    // case holds that applied default equal to the component's default
    // classes in both bands.
    name: "component-defaults-gap-md-align-stretch",
    props: {},
    children: [
      { w: 140, h: 40 },
      { w: 90, h: 24 },
    ],
    viewports: [360, 800],
  },
];
