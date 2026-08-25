/**
 * The constraint vocabulary — what a parent offers a node, per axis.
 *
 * css-sizing-3's own words, not Yoga's internal `StretchFit` / `MaxContent` /
 * `FitContent`. The trichotomy's semantics are identical in both vocabularies;
 * the words differ, and CSS's are chosen because Loom's oracle *is* CSS — a
 * conformance failure should read as a sentence about sizing, and a
 * contributor cross-referencing the standard should land on the same terms
 * this file uses. Yoga renamed them because it is a host that owns layout
 * outright; Loom never owns layout on the web.
 */

/**
 * How much space an axis offers. The union makes the illegal combination — an
 * indefinite size with mode "definite", Yoga's runtime assertion —
 * unrepresentable at compile time.
 */
export type DimensionConstraint =
  | { mode: "definite"; size: number }
  | { mode: "max-content" }
  | { mode: "fit-content"; size: number };

/** What the caller offers the tree on both axes. */
export interface AvailableSpace {
  width: DimensionConstraint;
  height: DimensionConstraint;
}

/**
 * A length safe to do arithmetic on: `undefined` (unset) and non-finite
 * values (NaN, ±Infinity) collapse to `fallback`. The defensive floor Yoga
 * puts around its measure protocol — never hand negative or NaN space onward
 * — applies to every number here, not only to measured text, so the engine's
 * outputs are finite by construction.
 */
export function finite(value: number | undefined, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Clamp a resolved size into `[min, max]`, defending each bound: unset and
 * non-finite bounds do not bind, and the result is never negative or
 * non-finite. `min` is applied after `max` so it wins when both bind — the
 * CSS order — rather than the two oscillating.
 */
export function clampSize(size: number, min: number | undefined, max: number | undefined): number {
  const value = Math.max(0, finite(size));
  const clampedByMax =
    max !== undefined && Number.isFinite(max) ? Math.min(value, Math.max(0, max)) : value;
  return min !== undefined && Number.isFinite(min)
    ? Math.max(clampedByMax, Math.max(0, min))
    : clampedByMax;
}
