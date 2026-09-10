/**
 * DashboardGrid's semantic adapter — the component's arrangement as engine
 * geometry.
 *
 * The class records in DashboardGrid.vue are one expression of the grid; this
 * module is the same semantics as typed data, and the conformance route is
 * what holds the two equal. DashboardGrid.vue's render path never imports
 * this and the package barrel does not re-export it, so no consumer import
 * path reaches the engine — the component keeps rendering pure CSS, and the
 * published build carries zero engine bytes.
 *
 * Lineage: the composition joined the tier in 2C (ADR-001), was named by no
 * planning document until gap P1's census correction made it the named
 * least-ready twin, and lands its evidence set here as Phase 4A
 * (ecoma-io/loom#311) — which deletes its exception row in
 * tools/composition-conformance.exceptions.ts as this file arrives.
 *
 * ## The derived arithmetic
 *
 * The component renders `repeat(auto-fit, minmax(min(100%, M), 1fr))` with
 * gap G, and the column count is computed by the browser from the container
 * width W — never authored. Derived from that CSS, not assumed:
 *
 * - **Fitted count.** A track's max sizing function (`1fr`) is indefinite,
 *   so the repeat count treats each track as its MIN — `min(100%, M)`,
 *   which resolves to `min(W, M)` — and takes the largest count that fits
 *   with its gaps: `fitted = max(1, floor((W + G) / (M + G)))`
 *   (`fittedTrackCount` below). The `min(100%, …)` floor is an
 *   anti-overflow device, count-invisible: with W < M both readings of the
 *   bound floor to the same single track.
 * - **Used count.** `auto-fit` collapses tracks no item occupies to zero,
 *   and their gutters collapse with them, so the surviving tracks share all
 *   of W: with every tile on one line and no holes in the flow, the used
 *   count is `k = sum(spans)` (capped by `fitted` — beyond it the grid
 *   wraps, which is outside the subset below), and each track is
 *   `trackW = (W - (k - 1) * G) / k`.
 * - **Tile boxes.** A tile spanning s tracks occupies an area of
 *   `s * trackW + (s - 1) * G` (its own tracks plus the gaps between them).
 *
 * ## The span encoding in the IR
 *
 * The engine IR is a single line of px boxes: no grid, no columns, no span
 * field. A span therefore never appears in the tree — it resolves
 * adapter-side into the tile's px width, the area width above. Because a
 * tile at its area width satisfies `width + G = span * (trackW + G)`, the
 * line's own cursor arithmetic (`left += width + gap`) reproduces the grid's
 * track flow exactly: tile i's left comes out at the start of its column
 * area, as the browser's span placement puts it. The modelled consumer is
 * the stretching one — a tile whose width is its area, which is what a
 * `col-span-*` panel with no width override renders; a tile authored OFF its
 * area places its siblings at offsets the cursor cannot express and is
 * refused, not approximated.
 *
 * ## What stays outside the modelled subset (counted absences)
 *
 * These behaviours have no honest mapping in the single-line IR. They are
 * absent from the cases by design — never approximated — and each row names
 * its reason, owner and what removes it:
 *
 * - **Row auto-placement.** More tiles than tracks reflow onto further rows;
 *   the IR is one line and cannot express a second row, so the adapter
 *   refuses (`sum(spans) > fitted` throws). Recorded engine-side as
 *   MODELLED_SUBSET.absences.DASHBOARD_ROW_AUTO_PLACEMENT; removal: an IR
 *   that can express lines.
 * - **Implicit tracks.** A span wider than the whole fitted grid (a span-2
 *   tile at one track) creates auto-sized implicit columns the `1fr`
 *   arithmetic does not cover; the same wrap check refuses it. Recorded as
 *   MODELLED_SUBSET.absences.DASHBOARD_IMPLICIT_TRACKS; same removal.
 */
import { layout, MODELLED_SUBSET, type LayoutNode } from "@ecoma-io/loom-layout-engine";
// The band value is the law, not a restated number: the responsive contract
// owns the viewport bands, and an adapter that keeps its own 640 could drift
// from the contract its sidecar claim is judged against.
import { RESPONSIVE_VIEWPORT_BANDS } from "@ecoma-io/loom-core";
import type { DashboardGridGap } from "./DashboardGrid.vue";

// The engine's entry point, re-exported so the conformance route reaches it
// through this package's own module rather than importing it past the
// e2e layer's boundary — the route's only cross-library reaches are the
// four case files, and everything else arrives transitively through
// this judged edge. The declared scope rides beside it — see stack's
// layout.ts.
export { layout };
export { MODELLED_SUBSET };

/**
 * What every adapter is told about the host it is mapping for. See stack's
 * layout.ts for why there are two inputs: the viewport resolves the
 * responsive scale band (Tailwind's `sm:` responds to the viewport), while
 * `availableWidth` must be the measured content-box width of the container —
 * here it is the width the browser computed the column count from, so
 * feeding the unmeasured viewport would derive a different `fitted` than the
 * browser rendered.
 */
export interface LayoutContext {
  viewportWidth: number;
  availableWidth: number;
}

/** A fixture child: a fixed px box. Conformance fixtures are text-free. */
export interface ChildSpec {
  /**
   * The tile's width — its spanned AREA width, which is what a stretching
   * tile renders. The adapter derives the same number from the span
   * arithmetic and refuses a case whose declared width disagrees, so the
   * case data stays a pin on the arithmetic rather than a free parameter.
   */
  w: number;
  h: number;
}

/**
 * The gap scale in px at the 16px root every conformance run pins: the value
 * each step names applies from `sm` (640px) up, and drops one notch below
 * it. Derived from the Tailwind records in DashboardGrid.vue — conformance
 * holds this table equal to what those classes render.
 */
export const DASHBOARD_GRID_GAP_STEPS: Record<DashboardGridGap, readonly [number, number]> = {
  sm: [8, 12],
  md: [12, 16],
  lg: [16, 24],
};

/** Tailwind's `sm`, in px — the one breakpoint the gap scale steps at. */
export const DASHBOARD_GRID_GAP_BREAKPOINT = RESPONSIVE_VIEWPORT_BANDS.sm;

/**
 * The root the px conversion assumes — the conformance route pins the root
 * font-size to exactly this (the determinism quintet asserts it), so a rem
 * is this many px by construction there.
 */
export const REM_PX = 16;

/**
 * Resolve a declared `minTileWidth` to px. Only px and rem are accepted: the
 * engine speaks px, and em/% are font- or container-relative units whose
 * resolution would be an invention, not a derivation.
 */
export function minTileWidthToPx(value: string): number {
  const px = /^(\d+(?:\.\d+)?)px$/.exec(value);
  if (px !== null) return Number(px[1]);
  const rem = /^(\d+(?:\.\d+)?)rem$/.exec(value);
  if (rem !== null) return Number(rem[1]) * REM_PX;
  throw new Error(
    `dashboardGridLayout: minTileWidth "${value}" is not a px or rem length — the engine speaks px at the ${String(REM_PX)}px root the conformance page pins. Recorded as MODELLED_SUBSET.absences.PERCENT.`,
  );
}

/**
 * The fitted track count: the largest number of `M`-wide tracks (plus their
 * gaps) the container can hold, floored at one — the browser's own repeat
 * count for `repeat(auto-fit, minmax(M, 1fr))`. See the module docblock for
 * the derivation.
 */
export function fittedTrackCount(availableWidth: number, minTilePx: number, gap: number): number {
  return Math.max(1, Math.floor((availableWidth + gap) / (minTilePx + gap)));
}

/** The one failure shape the adapter raises: a case outside the subset. */
function refuse(detail: string): never {
  throw new Error(`dashboardGridLayout: ${detail}`);
}

/**
 * Map DashboardGrid's props onto a layout tree. Pure: same props and
 * context, same tree, every time. The component's own defaults (gap "md",
 * minTileWidth "16rem") are applied here so a case that passes nothing
 * models what a consumer actually renders.
 *
 * The tree is one line: the grid's first row, root `id: "root"`, children at
 * their area widths. A case whose tiles do not all fit one line is outside
 * the modelled subset and refused — see the module docblock's counted
 * absences.
 *
 * `spans` rides on props rather than on the children because the harness
 * fixture box is a plain px rectangle: the case module's wrapper applies the
 * same data to the mounted DOM that this adapter applies to the tree, and
 * one field feeding both sides cannot drift. The props stay inline, the way
 * stack's and center's do — an inline shape is what the case modules'
 * `Parameters<typeof …>[0]` intake and the harness's
 * `Record<string, unknown>` case props both accept.
 */
export function dashboardGridLayout(
  props: {
    /** Any px or rem length; the component default is "16rem". */
    minTileWidth?: string;
    gap?: DashboardGridGap;
    /** The column span of each child, in slot order, defaulting to 1 — the arrangement a consumer authors as `col-span-*` utilities. */
    spans?: readonly number[];
    /** The one viewport width the case is published at. Not read here — `dashboardGridLayout` models whatever width it is given; it is the route adapter below that narrows. */
    at?: number;
  },
  ctx: LayoutContext,
  children: readonly ChildSpec[],
): LayoutNode {
  if (children.length === 0) refuse("a grid with no tiles has no line to model");
  const gapStep = DASHBOARD_GRID_GAP_STEPS[props.gap ?? "md"];
  const gap = ctx.viewportWidth >= DASHBOARD_GRID_GAP_BREAKPOINT ? gapStep[1] : gapStep[0];
  const minTilePx = minTileWidthToPx(props.minTileWidth ?? "16rem");

  const spans = children.map((_, i) => props.spans?.[i] ?? 1);
  if (props.spans !== undefined && props.spans.length > children.length) {
    refuse("props.spans names more tiles than the case carries children");
  }
  for (const span of spans) {
    if (!Number.isInteger(span) || span < 1) {
      refuse(`a tile span must be a whole number of tracks, got ${String(span)}`);
    }
  }

  const fitted = fittedTrackCount(ctx.availableWidth, minTilePx, gap);
  const used = spans.reduce((sum, span) => sum + span, 0);
  if (used > fitted) {
    refuse(
      `the tiles need ${String(used)} tracks but the container fits ${String(fitted)} — the grid would wrap onto a further row (or raise implicit tracks), which is outside the single-line subset (MODELLED_SUBSET.absences.DASHBOARD_ROW_AUTO_PLACEMENT / DASHBOARD_IMPLICIT_TRACKS)`,
    );
  }

  // The used count and the track width: every spanned tile sits on one line
  // with no holes, so the surviving auto-fit tracks are exactly `used`, and
  // they share all of W (collapsed tracks release their gutters too).
  const trackWidth = (ctx.availableWidth - (used - 1) * gap) / used;

  const widths = spans.map((span) => span * trackWidth + (span - 1) * gap);
  for (const [i, child] of children.entries()) {
    const width = widths[i];
    if (width === undefined) continue; // spans is children-derived; unreachable
    if (Math.abs(child.w - width) > 1e-6) {
      refuse(
        `child ${String(i)} is authored ${String(child.w)}px wide but its ${String(spans[i] ?? 0)}-track area is ${String(width)}px — a tile off its area places its siblings at offsets the single line cannot express`,
      );
    }
  }

  return {
    id: "root",
    style: { axis: "row", gap },
    children: children.map((child, i) => ({
      style: { axis: "row", width: widths[i] ?? 0, height: child.h },
    })),
  };
}

/**
 * The adapter the conformance route runs (`export const adapter` in the case
 * module). The route mounts every case of the module on one page and computes
 * each one at every width it navigates — the route's shape has no way to say
 * a case is width-bound, and this module's cases each are: a tile's fixture
 * width IS its spanned area at one container (see the case module's
 * docblock), so a case computed away from its own width is a refusal waiting
 * to happen. That computation is never compared — the case's `viewports`
 * gate the spec's assertions — but a refusal would still kill the page
 * before the report published, taking every published case down with it.
 * So the route adapter answers out-of-scope computations with an empty line
 * (never read, since the spec filters by `viewports`), and the case module's
 * wrapper hides the fixture at those widths so it cannot pull in a scrollbar
 * that would shift the measured widths of the cases that ARE published there.
 *
 * The refusal contract stays on `dashboardGridLayout` and stays tested; this
 * wrapper only decides whether a computation is in scope at all, which is
 * why it keys on `props.at` — the case's own published width — rather than
 * re-deriving scope from the arithmetic a refusal would be.
 */
export function dashboardGridRouteAdapter(
  props: Parameters<typeof dashboardGridLayout>[0],
  ctx: LayoutContext,
  children: readonly ChildSpec[],
): LayoutNode {
  if (props.at !== undefined && props.at !== ctx.viewportWidth) {
    return { id: "root", style: { axis: "row" } };
  }
  return dashboardGridLayout(props, ctx, children);
}
