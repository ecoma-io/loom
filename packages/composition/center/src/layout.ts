/**
 * Center's semantic adapter — the component's props as engine geometry.
 *
 * The classes in Center.vue are one expression of Center's layout; this
 * module is the same semantics as typed data, and the conformance route is
 * what holds the two equal. Center.vue's render path never imports this
 * and the package barrel does not re-export it, so no consumer import path
 * reaches the engine.
 */
import { layout, type LayoutNode } from "@ecoma-io/loom-layout-engine";
import type { CenterMaxWidth } from "./Center.vue";

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
 * The max-width scale in px at the 16px root every conformance run pins
 * (Tailwind's max-w-sm…xl are 24/28/32/36rem). `"prose"` is deliberately
 * absent: 65ch is font-relative, and the engine speaks px.
 */
export const CENTER_MAX_WIDTH_PX: Record<Exclude<CenterMaxWidth, "prose">, number> = {
  sm: 384,
  md: 448,
  lg: 512,
  xl: 576,
};

/**
 * The gutter scale as viewport bands, high band first so a lookup is a find,
 * not a scan. `px-4 sm:px-6 3xl:px-8`: narrow viewports need less margin
 * because the viewport itself is margin, and ultra-wide ones need more so
 * the gap between content and screen edge stays proportional.
 */
export const CENTER_GUTTER_STEPS: readonly { minWidth: number; px: number }[] = [
  { minWidth: 1920, px: 32 },
  { minWidth: 640, px: 24 },
  { minWidth: 0, px: 16 },
];

/**
 * Map Center's props onto a layout tree. `mx-auto` has no length to read,
 * so the tree wraps the component's own box in a full-width row that
 * centers it — geometry identical to the margin for a max-width box. The
 * comparator anchors on the id "root" node, which is the node the
 * component's root element corresponds to; the wrapper exists in the tree
 * and not in the DOM.
 */
export function centerLayout(
  props: { maxWidth?: CenterMaxWidth; gutter?: boolean },
  ctx: LayoutContext,
  children: readonly ChildSpec[],
): LayoutNode {
  if (props.maxWidth === "prose") {
    throw new Error(
      'centerLayout: maxWidth: "prose" is CSS-only — 65ch is a font-relative unit and the engine speaks px. Use sm, md, lg or xl.',
    );
  }
  const maxWidth = CENTER_MAX_WIDTH_PX[props.maxWidth ?? "lg"];
  const gutter = props.gutter ?? true;
  const band = CENTER_GUTTER_STEPS.find((step) => ctx.viewportWidth >= step.minWidth);
  // Center's children are block flow, not flex items: they refuse to shrink.
  const boxes = children.map((child) => ({
    style: { axis: "row" as const, width: child.w, height: child.h, flexShrink: 0 },
  }));
  return {
    style: { axis: "row", justifyContent: "center" },
    children: [
      {
        id: "root",
        style: {
          axis: "column",
          // A block-level box fills its container up to the max-width — the
          // width is resolved here rather than left to the engine because
          // the engine models flex semantics, not block fill.
          width: Math.min(ctx.availableWidth, maxWidth),
          maxWidth,
          ...(gutter ? { padding: { x: band?.px ?? 16 } } : {}),
        },
        children: boxes,
      },
    ],
  };
}
