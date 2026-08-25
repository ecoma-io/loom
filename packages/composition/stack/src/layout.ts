/**
 * Stack's semantic adapter — the component's props as engine geometry.
 *
 * The class records in Stack.vue are one expression of Stack's layout; this
 * module is the same semantics as typed data, and the conformance route is
 * what holds the two equal. Stack.vue's render path never imports this and
 * the package barrel does not re-export it, so no consumer import path
 * reaches the engine — the component keeps rendering pure CSS, and the
 * published build carries zero engine bytes.
 */
import { layout, type LayoutNode } from "@ecoma-io/loom-layout-engine";
import type { StackAlign, StackGap } from "./Stack.vue";

// The engine's entry point, re-exported so the conformance route reaches it
// through this package's own module rather than importing it past the
// e2e layer's boundary — the route's only cross-library reaches are the
// four case files, and everything else arrives transitively through
// this judged edge.
export { layout };

/**
 * What every adapter is told about the host it is mapping for.
 *
 * Two inputs, deliberately: the viewport resolves the responsive scale band
 * — Tailwind's `sm:` responds to the viewport — while `availableWidth` is
 * the geometric constraint and must be the measured content-box width of the
 * container the component renders in, never the raw viewport size: a classic
 * scrollbar consumes 15-17px of layout width at 360px in some engines, and
 * feeding the unmeasured viewport would compare the engine's input against a
 * different quantity than the browser's output.
 */
export interface LayoutContext {
  viewportWidth: number;
  availableWidth: number;
}

/**
 * A fixture child: a fixed px box. Conformance fixtures are text-free by
 * construction — text metrics are the one input a geometry oracle cannot
 * make deterministic, so the fixtures do not contain any.
 */
export interface ChildSpec {
  w: number;
  h: number;
}

/**
 * The gap scale in px at the 16px root every conformance run pins: the value
 * each step names applies from `sm` (640px) up, and drops one notch below
 * it. Derived from the Tailwind records in Stack.vue — conformance holds
 * this table equal to what those classes render.
 */
export const STACK_GAP_STEPS: Record<StackGap, readonly [number, number]> = {
  sm: [8, 12],
  md: [12, 16],
  lg: [16, 24],
};

/** Tailwind's `sm`, in px — the one breakpoint the gap scale steps at. */
export const STACK_GAP_BREAKPOINT = 640;

/**
 * Map Stack's props onto a layout tree. Pure: same props and context, same
 * tree, every time. The component's own defaults (gap "md", align
 * "stretch") are applied here so a case that passes nothing models what a
 * consumer actually renders.
 */
export function stackLayout(
  props: { gap?: StackGap; align?: StackAlign },
  ctx: LayoutContext,
  children: readonly ChildSpec[],
): LayoutNode {
  const [belowSm, atSm] = STACK_GAP_STEPS[props.gap ?? "md"];
  return {
    id: "root",
    style: {
      axis: "column",
      gap: ctx.viewportWidth >= STACK_GAP_BREAKPOINT ? atSm : belowSm,
      alignItems: props.align ?? "stretch",
    },
    // A leaf's axis is inert; the engine only reads width and height here.
    children: children.map((child) => ({
      style: { axis: "row", width: child.w, height: child.h },
    })),
  };
}
