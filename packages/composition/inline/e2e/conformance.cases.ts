/**
 * Inline's conformance cases — plain typed data, plus the component and
 * adapter the route rides on. Every case passes wrap: false explicitly:
 * the component's default (wrap: true) is CSS-only until phase 2 and the
 * adapter throws on it, loudly, so no case can pretend otherwise.
 *
 * This module is imported statically by playwright/harness/conformance.ts
 * (the one cross-library relative reach the boundary table names a
 * suppression for) and by the coverage-floor test in src/layout.test.ts.
 * It imports its own component and adapter intra-package, which is judged
 * clean under this package's own row. No Vue application code runs here:
 * the route mounts the component, this file only describes what to mount.
 */
import type { Component } from "vue";
import Inline from "../src/Inline.vue";
import { layout, inlineLayout, type ChildSpec } from "../src/layout";

/** The props the adapter accepts — the same shape the component takes. */
export type InlineCaseProps = Parameters<typeof inlineLayout>[0];

/** One conformance case. See ../src/layout.ts for the child and context shapes. */
export interface ConformanceCase {
  name: string;
  props: InlineCaseProps;
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
export const component: Component = Inline;

/** The adapter the route runs in-page beside the mounted component. */
export const adapter = inlineLayout;

/** The engine entry, reached through this package rather than past the e2e boundary. */
export { layout };

export const cases: readonly ConformanceCase[] = [
  {
    name: "gap-sm-narrow-and-wide",
    props: { gap: "sm", wrap: false },
    children: [
      { w: 120, h: 40 },
      { w: 80, h: 24 },
      { w: 200, h: 56 },
    ],
    viewports: [360, 800],
  },
  {
    name: "gap-md-narrow-and-wide",
    props: { gap: "md", wrap: false },
    children: [
      { w: 120, h: 40 },
      { w: 80, h: 24 },
      { w: 200, h: 56 },
    ],
    viewports: [360, 800],
  },
  {
    name: "gap-lg-narrow-and-wide",
    props: { gap: "lg", wrap: false },
    children: [
      { w: 120, h: 40 },
      { w: 80, h: 24 },
      { w: 200, h: 56 },
    ],
    viewports: [360, 800],
  },
  {
    name: "align-start",
    props: { align: "start", wrap: false },
    children: [
      { w: 120, h: 40 },
      { w: 200, h: 56 },
    ],
    viewports: [800],
  },
  {
    name: "align-center",
    props: { align: "center", wrap: false },
    children: [
      { w: 120, h: 40 },
      { w: 200, h: 56 },
    ],
    viewports: [800],
  },
  {
    name: "align-end",
    props: { align: "end", wrap: false },
    children: [
      { w: 120, h: 40 },
      { w: 200, h: 56 },
    ],
    viewports: [800],
  },
  {
    name: "align-stretch",
    props: { align: "stretch", wrap: false },
    children: [
      { w: 120, h: 40 },
      { w: 200, h: 56 },
    ],
    viewports: [800],
  },
  {
    // wrap: false alone — the component's defaults for everything else
    // (gap md, align stretch) against the browser, in both bands. The one
    // prop the case must state is the one the adapter throws without.
    name: "component-defaults-gap-md-align-stretch",
    props: { wrap: false },
    children: [
      { w: 140, h: 40 },
      { w: 90, h: 24 },
    ],
    viewports: [360, 800],
  },
  {
    // Small enough to fit below sm: the no-shrink path in the one band where
    // every other narrow case shrinks. Whether CSS leaves unshrunk items at
    // their stated widths is a different assertion from whether its shrink
    // arithmetic matches the engine's.
    name: "fits-without-shrinking-below-sm",
    props: { gap: "sm", wrap: false },
    children: [
      { w: 80, h: 20 },
      { w: 60, h: 32 },
    ],
    viewports: [360],
  },
];
