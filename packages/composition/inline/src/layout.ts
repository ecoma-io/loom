/**
 * Inline's semantic adapter — the component's props as engine geometry.
 *
 * The class records in Inline.vue are one expression of Inline's layout;
 * this module is the same semantics as typed data, and the conformance
 * route is what holds the two equal. Inline.vue's render path never
 * imports this and the package barrel does not re-export it, so no consumer
 * import path reaches the engine.
 */
import { layout, type LayoutNode } from "@ecoma-io/loom-layout-engine";
import type { InlineAlign, InlineGap } from "./Inline.vue";

// The engine's entry point, re-exported so the conformance route reaches it
// through this package's own module rather than importing it past the
// e2e layer's boundary — the route's only cross-library reaches are the
// four case files, and everything else arrives transitively through
// this judged edge.
export { layout };

/** See stack's layout.ts — the two inputs and why there are two. */
export interface LayoutContext {
  viewportWidth: number;
  availableWidth: number;
}

/** A fixture child: a fixed px box. Conformance fixtures are text-free. */
export interface ChildSpec {
  w: number;
  h: number;
}

/**
 * The gap scale in px at the 16px root — identical to Stack's, which is the
 * documented intent ("the gap steps mirror Stack's"), held here rather than
 * imported so each component's semantics stay in one file.
 */
export const INLINE_GAP_STEPS: Record<InlineGap, readonly [number, number]> = {
  sm: [8, 12],
  md: [12, 16],
  lg: [16, 24],
};

/** Tailwind's `sm`, in px — the one breakpoint the gap scale steps at. */
export const INLINE_GAP_BREAKPOINT = 640;

/**
 * Map Inline's props onto a layout tree. Two of the component's values are
 * CSS-only in this slice and THROW rather than fall back: the engine has no
 * line collection and no text metrics, and a silently wrong single-line
 * tree for a wrapping Inline would be worse than a loud error.
 */
export function inlineLayout(
  props: { gap?: InlineGap; align?: InlineAlign; wrap?: boolean },
  ctx: LayoutContext,
  children: readonly ChildSpec[],
): LayoutNode {
  if (props.wrap !== false) {
    throw new Error(
      `inlineLayout: wrap: ${props.wrap === undefined ? "unset (the component default is true)" : String(props.wrap)} is CSS-only in this slice — the browser renders wrapping today, and the engine models line collection in phase 2. Pass wrap: false.`,
    );
  }
  if (props.align === "baseline") {
    throw new Error(
      'inlineLayout: align: "baseline" is CSS-only — baseline alignment is decided by text metrics, which a text-free geometry engine does not have. Use start, center, end or stretch.',
    );
  }
  const [belowSm, atSm] = INLINE_GAP_STEPS[props.gap ?? "md"];
  return {
    id: "root",
    style: {
      axis: "row",
      gap: ctx.viewportWidth >= INLINE_GAP_BREAKPOINT ? atSm : belowSm,
      alignItems: props.align ?? "stretch",
    },
    children: children.map((child) => ({
      style: { axis: "row", width: child.w, height: child.h },
    })),
  };
}
