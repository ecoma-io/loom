/**
 * Grid's semantic adapter — the component's props as engine geometry.
 *
 * The class and inline-style records in Grid.vue are one expression of Grid's
 * layout; this module is the same semantics as typed data, and the
 * conformance route is what holds the two equal. Grid.vue's render path never
 * imports this and the package barrel does not re-export it, so no consumer
 * import path reaches the engine — the component keeps rendering pure CSS,
 * and the published build carries zero engine bytes.
 */
import { layout, type LayoutNode } from "@ecoma-io/loom-layout-engine";
// The band value is the law, not a restated number: the responsive contract
// owns the viewport bands, and an adapter that keeps its own 640 could drift
// from the contract its sidecar claim is judged against.
import { RESPONSIVE_VIEWPORT_BANDS } from "@ecoma-io/loom-core";
import type { GridGap } from "./Grid.vue";

// The engine's entry point, re-exported so the conformance route reaches it
// through this package's own module rather than importing it past the
// e2e layer's boundary — the route's only cross-library reaches are the
// case files, and everything else arrives transitively through this judged
// edge.
export { layout };

/** See stack's layout.ts — the two inputs and why there are two. */
export interface LayoutContext {
  viewportWidth: number;
  availableWidth: number;
}

/** A fixture child: a fixed px box. Conformance fixtures are text-free by
 * construction — text metrics are the one input a geometry oracle cannot
 * make deterministic, so the fixtures do not contain any. */
export interface ChildSpec {
  w: number;
  h: number;
}

/**
 * The gap scale in px at the 16px root every conformance run pins: the value
 * each step names applies from `sm` (640px) up, and drops one notch below
 * it. Derived from the Tailwind records in Grid.vue — conformance holds this
 * table equal to what those classes render.
 */
export const GRID_GAP_STEPS: Record<GridGap, readonly [number, number]> = {
  sm: [8, 12],
  md: [12, 16],
  lg: [16, 24],
};

/** Tailwind's `sm`, in px — the one breakpoint the gap scale steps at. */
export const GRID_GAP_BREAKPOINT = RESPONSIVE_VIEWPORT_BANDS.sm;

/**
 * The root font size, in px, at which a `rem` track floor resolves. The
 * conformance route pins the document root to 16px and its spec asserts the
 * pin (the determinism quintet), so a rem value is exact px arithmetic —
 * but only while that pin holds, which is why the conversion is named here
 * rather than left as a bare `* 16` at the use site.
 */
export const REM_PX = 16;

/**
 * Resolve a `minColWidth` prop to px. The engine speaks px, and rem is
 * exact only at the pinned root, so the accepted set is px and rem — a
 * percent floor would need the percent support the IR has not earned
 * (`Length` is px-only by design), and em/ch resolve through font metrics
 * the engine does not have. Throwing, not guessing, follows Center's
 * `prose` precedent: a silently wrong track floor would corrupt every
 * column count downstream of it.
 */
export function parseMinColWidth(value: string): number {
  const match = /^(\d+(?:\.\d+)?)(px|rem)$/.exec(value.trim());
  if (match === null) {
    throw new Error(
      `gridLayout: minColWidth "${value}" is outside the modelled subset — the engine speaks px, and rem at the pinned ${String(
        REM_PX,
      )}px root. Use px or rem.`,
    );
  }
  const amount = Number.parseFloat(match[1] ?? "0");
  return match[2] === "rem" ? amount * REM_PX : amount;
}

/**
 * The auto-fit repetition count, derived from the component's real CSS —
 * `repeat(auto-fit, minmax(min(100%, MIN), 1fr))` at container width W and
 * gap G:
 *
 * 1. A repetition is placed while every repetition still respects its
 *    minimum: k tracks need k·MIN + (k−1)·G ≤ W, which solves to
 *    k ≤ (W + G) / (MIN + G). The browser takes the largest such k, so the
 *    count is the floor.
 * 2. MIN is `min(100%, minColWidth)`: below `minColWidth` the container
 *    itself is the floor and one track is all that can ever fit — the
 *    floor expression goes under 1 exactly there, so the max(1, …) clamp
 *    states the min() guard rather than an extra rule.
 * 3. `auto-fit` then collapses every track no item occupies — the min
 *    track sizing function is definite — together with the gaps around it,
 *    and the `1fr` maximum redistributes their share across the survivors.
 *    The USED column count is therefore min(children, n), and each used
 *    track is (W − (used−1)·G) / used. {@link gridLayout} models the used
 *    count; this function is the raw repetition count the template asks
 *    for.
 */
export function autoFitColumns(availableWidth: number, minTrackPx: number, gap: number): number {
  return Math.max(1, Math.floor((availableWidth + gap) / (minTrackPx + gap)));
}

/** The px width of each used track: the container shared out as `1fr`,
 * minus the gaps between the tracks that survived. */
export function trackWidth(availableWidth: number, usedColumns: number, gap: number): number {
  return (availableWidth - (usedColumns - 1) * gap) / usedColumns;
}

/**
 * Map Grid's props onto a layout tree. Pure: same props and context, same
 * tree, every time. The component's own defaults (minColWidth "16rem", gap
 * "md") are applied here so a case that passes nothing models what a
 * consumer actually renders.
 *
 * The engine tree is a single line with the resolved gap; each leaf is its
 * fixture box with `flexShrink: 0`, because a grid item is not a flex item
 * and refuses to shrink, and `alignItems` is left at the engine's default
 * because CSS's own default (normal → stretch) is the default the engine
 * ships on purpose. The line equals the rendered grid exactly when the grid
 * IS one line — children ≤ the repetition count — and every fixture fills
 * its cell: the engine places children at cursor sums of (size + gap) and a
 * grid places items at track starts, and the two coincide only when item ==
 * track. That equality is a case-file convention, not an adapter check: the
 * conformance route lays out EVERY case at EVERY viewport its page loads, so
 * a width-conditional throw here would take down the whole report for one
 * off-pin case — the failure mode CI actually ran. The loud check lives
 * where the compared widths are known: the coverage floor in
 * src/layout.test.ts pins every compared case at its published viewports,
 * and the spec's engine-vs-DOM table reddens on any arithmetic this module
 * gets wrong. A lone item is exempt by nature: its left is the track start
 * whatever its width.
 *
 * Beyond one row (children > the repetition count) there is no honest
 * single-line tree, and this adapter does not pretend to one: it returns the
 * first row's projection — the first n items on the gap line — and the case
 * carrying such a fixture must carry the `knownDivergence` that declines the
 * comparison. The coverage floor in src/layout.test.ts holds that pairing,
 * so the row banding stays a counted exception instead of a silent one.
 */
export function gridLayout(
  props: { minColWidth?: string; gap?: GridGap },
  ctx: LayoutContext,
  children: readonly ChildSpec[],
): LayoutNode {
  const minTrackPx = parseMinColWidth(props.minColWidth ?? "16rem");
  const [belowSm, atSm] = GRID_GAP_STEPS[props.gap ?? "md"];
  const gap = ctx.viewportWidth >= GRID_GAP_BREAKPOINT ? atSm : belowSm;
  const columns = autoFitColumns(ctx.availableWidth, minTrackPx, gap);

  if (children.length > columns) {
    // Row banding: the first row only, and never compared — see the
    // docblock; the pairing with the case's knownDivergence is the
    // coverage floor's law.
    return {
      id: "root",
      style: { axis: "row", gap },
      // The projection keeps the fixtures' own boxes — never a track width:
      // a comparison against this tree is exactly what the case declines.
      children: children.slice(0, columns).map(leaf),
    };
  }

  const leaves = children.map(leaf);
  return { id: "root", style: { axis: "row", gap }, children: leaves };
}

/** A fixture box as a leaf: fixed size, no shrink — grid items are not flex items. */
function leaf(child: ChildSpec): LayoutNode {
  return {
    style: { axis: "row", width: child.w, height: child.h, flexShrink: 0 },
  };
}
