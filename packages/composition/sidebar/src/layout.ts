/**
 * Sidebar's semantic adapter — the component's props as engine geometry.
 *
 * The inline styles in Sidebar.vue are one expression of Sidebar's layout;
 * this module is the same semantics as typed data, and the conformance route
 * is what holds the two equal. Sidebar.vue's render path never imports this
 * and the package barrel does not re-export it, so no consumer import path
 * reaches the engine — the component keeps rendering pure CSS, and the
 * published build carries zero engine bytes.
 *
 * The modelled subset is the EXPANDED row: both panels on one line, the
 * content growing into what the sidebar's preferred basis leaves. The
 * intrinsic collapse is `flex-wrap` line breaking, and the engine's IR is a
 * single line — so the breakpoint resolves here, adapter-side
 * (`sidebarCollapses`), and the collapsed regime is GUARDED rather than
 * modelled: the tree this returns past the boundary is the single-line
 * approximation the browser does not render, the conformance spec never
 * compares a case at a width the case did not declare, and the floor test
 * holds every declared case x viewport to the fitting side. A case author
 * who crosses the boundary anyway gets the loudest failure there is — a
 * red engine-vs-browser comparison — not a silently agreed lie.
 */
import { layout, MODELLED_SUBSET, type LayoutNode } from "@ecoma-io/loom-layout-engine";
// The band value is the law, not a restated number — see stack's layout.ts.
import { RESPONSIVE_VIEWPORT_BANDS } from "@ecoma-io/loom-core";
import type { SidebarSide } from "./Sidebar.vue";

// The engine's entry point, re-exported so the conformance route reaches it
// through this package's own module rather than importing it past the
// e2e layer's boundary — the route's only cross-library reaches are the
// five case files, and everything else arrives transitively through
// this judged edge. The declared scope rides beside it — see stack's
// layout.ts.
export { layout };
export { MODELLED_SUBSET };

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
 * The gap scale in px at the 16px root every conformance run pins: `gap-3
 * sm:gap-4`, below `sm` and at or above it. The one responsive scale the
 * component ships — the gap prop is a boolean, so there are no named steps
 * to enumerate.
 */
export const SIDEBAR_GAP_STEPS: readonly [number, number] = [12, 16];

/** Tailwind's `sm`, in px — the one breakpoint the gap scale steps at. */
export const SIDEBAR_GAP_BREAKPOINT = RESPONSIVE_VIEWPORT_BANDS.sm;

/**
 * The px-per-rem the conformance route pins the document root to (and the
 * spec's determinism-quintet test asserts). `sideWidth` ships in rem, and a
 * rem is only a definite number of px under that pinned root — the adapter
 * is exact for the run it is judged in, which is the only run that compares
 * it to anything.
 */
const ROOT_PX_PER_REM = 16;

const REM = /^(\d+(?:\.\d+)?)rem$/;
const PERCENT = /^(\d+(?:\.\d+)?)%$/;

function remToPx(value: string): number {
  const match = REM.exec(value.trim());
  if (match === null) {
    throw new Error(
      `sidebarLayout: sideWidth ${JSON.stringify(value)} is not modeled — the component ships its preferred width in rem ("16rem", "14rem"); pass a rem length. Recorded as MODELLED_SUBSET.absences.PERCENT.`,
    );
  }
  return Number.parseFloat(match[1] ?? "0") * ROOT_PX_PER_REM;
}

/** The content floor as a fraction of the container, parsed from `contentMin`. */
function percentToFraction(value: string): number {
  const match = PERCENT.exec(value.trim());
  if (match === null) {
    throw new Error(
      `sidebarLayout: contentMin ${JSON.stringify(value)} is not modeled — the component documents the floor as a percentage of the container; pass one ("50%"). Recorded as MODELLED_SUBSET.absences.PERCENT.`,
    );
  }
  return Number.parseFloat(match[1] ?? "0") / 100;
}

/**
 * The component's inputs resolved to the px the engine speaks. This is the
 * resolution the IR cannot carry: `contentMin` is a percentage of the
 * MEASURED container, so it becomes `fraction × availableWidth` here, at the
 * width the route measured — the engine never sees a percent, and the
 * breakpoint the percentage decides moves with the container exactly as it
 * does in the browser.
 */
export interface SidebarInputs {
  /** The sidebar panel's preferred width: `sideWidth` at the pinned root. */
  sideBasis: number;
  /** The content panel's `contentMin`, resolved against the measured container. */
  contentFloor: number;
  /** The row gap at this viewport's band, 0 when the prop turns the gap off. */
  gap: number;
}

/** Resolve `props` against `ctx` — pure, and the one place the units meet. */
export function sidebarInputs(
  props: { sideWidth?: string; contentMin?: string; gap?: boolean },
  ctx: LayoutContext,
): SidebarInputs {
  const fraction = percentToFraction(props.contentMin ?? "50%");
  const [belowSm, atSm] = SIDEBAR_GAP_STEPS;
  return {
    sideBasis: remToPx(props.sideWidth ?? "16rem"),
    contentFloor: fraction * ctx.availableWidth,
    gap: props.gap === false ? 0 : ctx.viewportWidth >= SIDEBAR_GAP_BREAKPOINT ? atSm : belowSm,
  };
}

/**
 * Whether the intrinsic collapse fires for these inputs: the content's
 * resolved floor plus the gap plus the sidebar's basis no longer fits the
 * measured container. The line-breaking comparison itself — the CSS rule
 * `flex-wrap` applies — lives here because the container width it needs is
 * the measured quantity the route hands the adapter, not anything the engine
 * models; the breakpoint is exact at the boundary (`>` — a line that fits
 * exactly does not break, in the browser or here).
 *
 * At the component defaults the boundary is derivable in closed form:
 * `0.5W + gap + 256 > W` solves to `W < 544` at the sm-band gap of 16. The
 * threshold MOVES with the container because the floor is a percentage of
 * it — the collapse point is the derived 544px, not a fixed width. (A
 * fixed-width reading of the row's needs at one measured case — 672px of
 * line at the 800px defaults case — gives the wrong boundary: 672 is what
 * the row occupies AT 800, not what it needs everywhere.) sidebar's
 * layout.test.ts pins 544/543.
 */
export function sidebarCollapses(
  props: { sideWidth?: string; contentMin?: string; gap?: boolean },
  ctx: LayoutContext,
): boolean {
  const resolved = sidebarInputs(props, ctx);
  return resolved.contentFloor + resolved.gap + resolved.sideBasis > ctx.availableWidth;
}

/**
 * The counted absences — sidebar behaviours with no honest mapping in the
 * engine's modelled subset, recorded rather than pretended away. The fields
 * are the gate's exception-row fields, and they are mandatory for the same
 * reason: an unexplained absence is indistinguishable from a forgotten one.
 * Absences only — nothing here vouches for a comparison the case set does
 * carry; the floor test in layout.test.ts keeps this list counted and
 * truthful.
 */
export interface UnmodeledBehaviour {
  /** The behaviour, named precisely enough to recognise it in the browser. */
  aspect: string;
  /** Why no engine mapping is claimed for it. */
  reason: string;
  /** Who owns closing the gap. */
  owner: string;
  /** What removes the absence. */
  removal: string;
}

export const SIDEBAR_UNMODELLED: readonly UnmodeledBehaviour[] = [
  {
    aspect:
      "the wrapped state — both panels stacked after the intrinsic collapse, and the width the wrapped sidebar panel keeps",
    reason:
      "the collapse is flex-wrap line breaking and the engine's IR is one line. The breakpoint resolves adapter-side (sidebarCollapses), but the wrapped boxes have no honest engine geometry: across a deficit the engine's shrink pass eats the sidebar panel's basis while the browser puts it alone on its own line at its declared width — the exact open question ecoma-io/loom#275 keeps unpinned.",
    owner:
      "closed by Phase 4B: the modelled-subset record carries the absence (MODELLED_SUBSET.absences.SIDEBAR_WRAPPED_PANEL) — what stays open is only #275's wrapped width",
    removal:
      "the engine growing line collection; the record's declaration has landed, so what remains is #275's resolution — a pinned wrapped-panel width or line collection.",
  },
];

/**
 * Map Sidebar's props onto a layout tree. Pure: same props and context, same
 * tree, every time. The component's own defaults (side "left", sideWidth
 * "16rem", contentMin "50%", gap on) are applied here so a case that passes
 * nothing models what a consumer actually renders.
 *
 * The route mounts the default slot, so the fixture boxes are the content
 * panel's population and the side panel models as the empty box its basis
 * sizes — which is geometrically the panel it mounts, whose width is
 * basis-driven either way (preferred, never grown). A populated side panel
 * would also bring the browser's automatic minimum size (`min-width: auto`
 * over the slotted content) into play, and that floor is a divergence this
 * slice does not model — small text-free fixtures keep it out of every
 * comparison, and the trap itself is a record entry
 * (MODELLED_SUBSET.absences.AUTOMATIC_MINIMUM_SIZE).
 */
export function sidebarLayout(
  props: { side?: SidebarSide; sideWidth?: string; contentMin?: string; gap?: boolean },
  ctx: LayoutContext,
  children: readonly ChildSpec[],
): LayoutNode {
  // Unlike inline's wrap and center's prose, the regime boundary must NOT
  // throw: the route evaluates every case at every width the spec navigates,
  // including widths a case never declared, so a context-conditional throw
  // would kill a whole page for comparisons nobody makes — measured when the
  // defaults case, declared at 800, was evaluated in a 360px page. The
  // boundary is `sidebarCollapses`; the floor and the spec's own filter are
  // what keep the collapsed regime never-compared.
  const resolved = sidebarInputs(props, ctx);
  // The panel trio is the DOM's, verbatim: the sidebar panel takes its
  // preferred width as basis, never grows, but stays shrinkable — the
  // difference from Split's panel the component's docblock calls out. The
  // content panel grows at 999 off a zero basis, floored at its resolved
  // percentage.
  const side: LayoutNode = {
    style: { axis: "column", flexBasis: resolved.sideBasis, flexGrow: 0, flexShrink: 1 },
  };
  const content: LayoutNode = {
    style: {
      axis: "column",
      flexBasis: 0,
      flexGrow: 999,
      flexShrink: 1,
      minWidth: resolved.contentFloor,
    },
    children: children.map((child) => ({
      style: { axis: "row", width: child.w, height: child.h },
    })),
  };
  return {
    id: "root",
    style: {
      axis: "row",
      // gap: false ships no gap class; the resolved 0 is the absence, not a
      // styled zero, so it is omitted rather than stated.
      ...(resolved.gap > 0 ? { gap: resolved.gap } : {}),
    },
    // Document order follows `side` — the DOM-order fix that makes the
    // collapsed stack agree with the row — so the tree's child order is the
    // DOM's: content first for side="right", sidebar first otherwise.
    children: props.side === "right" ? [content, side] : [side, content],
  };
}
