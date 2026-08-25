/**
 * Frame's semantic adapter — the component's props as engine geometry.
 *
 * The inline `aspectRatio` in Frame.vue is one expression of Frame's
 * layout; this module is the same semantics as typed data, and the
 * conformance route is what holds the two equal. Frame.vue's render path
 * never imports this and the package barrel does not re-export it, so no
 * consumer import path reaches the engine.
 */
import { layout, type LayoutNode } from "@ecoma-io/loom-layout-engine";
import type { FrameRatio } from "./Frame.vue";

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

/** The named ratios as numbers, width over height. */
export const FRAME_RATIOS: Record<FrameRatio, number> = {
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  "1:1": 1,
  "3:4": 3 / 4,
};

/** What Frame.vue passes through: a CSS `aspect-ratio` value of the form "a / b". */
const RATIO_PATTERN = /^\s*(\d*\.?\d+)\s*\/\s*(\d*\.?\d+)\s*$/;

/**
 * Map Frame's props onto a layout tree. The frame is width-driven —
 * `w-full` means the box is as wide as the space offered, and the height
 * follows from the ratio — so the adapter states the width it was given and
 * lets the engine derive the height. What the fixtures prove is the ratio
 * arithmetic and overflow recording; absolutely-positioned overlay children
 * (media embeds, avatar crops — Frame's modal usage) are CSS-only and
 * outside the engine, and `overflow: hidden` clips paint, not geometry.
 */
// The prop accepts any string: the four named values are a lookup, and
// everything else is parsed as the "a / b" CSS value Frame.vue passes
// through — declaring the named union here would be redundant with string.
export function frameLayout(
  props: { ratio?: string },
  ctx: LayoutContext,
  children: readonly ChildSpec[],
): LayoutNode {
  // The component's own default (16:9) is applied here so a case that
  // passes nothing models what a consumer actually renders.
  const value = props.ratio ?? "16:9";
  const named = Object.hasOwn(FRAME_RATIOS, value) ? FRAME_RATIOS[value as FrameRatio] : undefined;
  const match = named === undefined ? RATIO_PATTERN.exec(value) : undefined;
  const parsed = match ? Number(match[1]) / Number(match[2]) : undefined;
  const ratio = named ?? parsed;
  if (ratio === undefined || !Number.isFinite(ratio) || ratio <= 0) {
    throw new Error(
      `frameLayout: ratio ${JSON.stringify(value)} is not modeled — pass a named ratio ("16:9", "4:3", "1:1", "3:4") or an "a / b" string the engine can divide.`,
    );
  }
  return {
    id: "root",
    style: { axis: "column", width: ctx.availableWidth, aspectRatio: ratio },
    // Block flow, not flex items: children refuse to shrink, and an
    // over-tall child overflows (recorded, never clipped).
    children: children.map((child) => ({
      style: { axis: "row", width: child.w, height: child.h, flexShrink: 0 },
    })),
  };
}
