/**
 * Split's conformance cases — plain typed data, plus the component and
 * adapter the route rides on.
 *
 * Every case stays on the modelled single line IN BOTH BANDS — on the
 * fitting side of the `staysOnOneLine` regime boundary (see ../src/layout.ts).
 * The route computes EVERY case's adapter at EVERY viewport the spec
 * navigates — one report per navigation, all cases eagerly — so a case is
 * only comparable if it is single-line everywhere, not merely at its own
 * declared viewports. The adapter is total (a context-conditional throw
 * would kill the whole page's report for comparisons nobody makes), so
 * nothing in the route stops a wrapped case from being compared against a
 * one-line tree the browser does not build — the coverage floor in
 * src/layout.test.ts is what holds every case to the fitting side, and
 * SPLIT_UNMODELLED records what the far side would have needed.
 *
 * The consequence is stated rather than hidden: the component's own default
 * `minSideWidth` (16rem) appears in no case, because a 16rem panel cannot
 * share a line with the content's 50% floor below ~552px — the default Split
 * in the narrow band IS a wrapped Split, the arrangement the engine does not
 * model. The adapter still applies that default (unit-pinned in
 * src/layout.test.ts), and the two defaultable props that survive the subset
 * — gap and side — are exercised by omission below. The collapse itself
 * keeps its browser evidence in the behavioural suite (split.e2e.ts); Phase
 * 4B's modelled-subset record owns it.
 *
 * This module is imported statically by playwright/harness/conformance.ts
 * (the one cross-library relative reach the boundary table names a
 * suppression for) and by the coverage-floor test in src/layout.test.ts.
 * It imports its own component and adapter intra-package, which is judged
 * clean under this package's own row. No Vue application code runs here:
 * the route mounts the component, this file only describes what to mount.
 */
import type { Component } from "vue";
import Split from "../src/Split.vue";
import { layout, splitLayout, type ChildSpec } from "../src/layout";

/** The props the adapter accepts — the same shape the component takes. */
export type SplitCaseProps = Parameters<typeof splitLayout>[0];

/** One conformance case. See ../src/layout.ts for the child and context shapes. */
export interface ConformanceCase {
  name: string;
  props: SplitCaseProps;
  /** Fixed-px child boxes, in slot order. Text-free by construction. */
  children: readonly ChildSpec[];
  /**
   * Viewport widths (px) the case is meaningful at; the spec navigates the
   * route once per viewport. The two bands the slice's scales distinguish
   * are below `sm` (360) and from `sm` up (800) — the responsive contract's
   * `narrow` and `mid` bands (packages/core/src/responsive-contract.ts owns
   * the numbers).
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
export const component: Component = Split;

/** The adapter the route runs in-page beside the mounted component. */
export const adapter = splitLayout;

/** The engine entry, reached through this package rather than past the e2e boundary. */
export { layout };

/** The children every case mounts: they land in the content area's block flow. */
const STACKED: readonly ChildSpec[] = [
  { w: 120, h: 40 },
  { w: 80, h: 24 },
  { w: 200, h: 56 },
];

/** 8rem: the widest panel that shares a line with the content floor in BOTH bands. */
const NARROW_PANEL = { minSideWidth: "8rem" } as const;

export const cases: readonly ConformanceCase[] = [
  {
    name: "split-gap-sm-narrow-and-wide",
    props: { gap: "sm", ...NARROW_PANEL },
    children: STACKED,
    viewports: [360, 800],
  },
  {
    name: "split-gap-md-narrow-and-wide",
    props: { gap: "md", ...NARROW_PANEL },
    children: STACKED,
    viewports: [360, 800],
  },
  {
    name: "split-gap-lg-narrow-and-wide",
    props: { gap: "lg", ...NARROW_PANEL },
    children: STACKED,
    viewports: [360, 800],
  },
  {
    // gap "none" ships no gap class at all, so the row's gap must be zero in
    // both bands — one band would leave the class's absence unpinned.
    name: "split-gap-none",
    props: { gap: "none", ...NARROW_PANEL },
    children: [
      { w: 140, h: 40 },
      { w: 90, h: 24 },
    ],
    viewports: [360, 800],
  },
  {
    // The mirrored document order: content first, panel second, so the row
    // puts the panel on the right and the wrapped stack — the part the
    // engine does not model — would read content-above-panel. In both bands,
    // because the wrap order is decided by document order wherever the
    // collapse eventually lands.
    name: "split-side-right-puts-the-panel-second",
    props: { side: "right", ...NARROW_PANEL },
    children: [
      { w: 140, h: 40 },
      { w: 90, h: 24 },
    ],
    viewports: [360, 800],
  },
  {
    // The component's defaultable props applied by omission — gap md, side
    // left — with only the panel narrowed to stay on the modelled single
    // line (see the module docblock for why the 16rem default cannot).
    name: "split-component-defaults-gap-md-side-left",
    props: { ...NARROW_PANEL },
    children: [
      { w: 140, h: 40 },
      { w: 90, h: 24 },
    ],
    viewports: [360, 800],
  },
];
