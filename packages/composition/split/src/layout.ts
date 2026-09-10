/**
 * Split's semantic adapter — the component's props as engine geometry.
 *
 * The class records and style objects in Split.vue are one expression of
 * Split's layout; this module is the same semantics as typed data, and the
 * conformance route is what holds the two equal. Split.vue's render path
 * never imports this and the package barrel does not re-export it, so no
 * consumer import path reaches the engine — the component keeps rendering
 * pure CSS, and the published build carries zero engine bytes.
 *
 * The modelled subset, stated honestly: the ONE-LINE arrangement, the two
 * panels side by side. Split's intrinsic collapse — flex-wrap breaking the
 * row onto a second line when the panels' minimums no longer share one — is
 * line collection, which the engine does not model. The Phase 4A boundary
 * decision puts everything the engine lacks on THIS side of the edge:
 * `minSideWidth` and the content's `min-width: 50%` resolve to px here, so
 * the IR stays px-only. The collapse itself is a GUARDED regime, not a
 * refused one: `staysOnOneLine` is the breakpoint, the case set and the
 * coverage floor hold every compared case on the fitting side of it, and
 * SPLIT_UNMODELLED records what the far side would have needed. Phase 4B's
 * modelled-subset record owns the collapse — now landed as
 * MODELLED_SUBSET.absences.WRAP and SPLIT_UNMODELLED below.
 */
import { layout, MODELLED_SUBSET, type LayoutNode } from "@ecoma-io/loom-layout-engine";
// The band value is the law, not a restated number — see stack's layout.ts.
import { RESPONSIVE_VIEWPORT_BANDS } from "@ecoma-io/loom-core";
import type { SplitGap, SplitSide } from "./Split.vue";

// The engine's entry point, re-exported so the conformance route reaches it
// through this package's own module rather than importing it past the
// e2e layer's boundary — the route's only cross-library reaches are the
// case files, and everything else arrives transitively through this judged
// edge. The declared scope rides beside it — see stack's layout.ts.
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
 * The root font size the adapter resolves `rem` at. The conformance route
 * pins the document root to 16px (the determinism quintet asserts it), and
 * that pin is what makes a rem-based `minSideWidth` exact px arithmetic —
 * the adapter is conformance-only, so it resolves at the pinned root and
 * nowhere else.
 */
const ROOT_FONT_PX = 16;

/**
 * The gap scale in px at the 16px root, read from the Tailwind records in
 * Split.vue's `gapClass` — the same values Stack's scale carries, held here
 * rather than imported so each component's semantics stay in one file. The
 * value each step names applies from `sm` (640px) up and drops one notch
 * below it; conformance holds this table equal to what those classes render.
 */
export const SPLIT_GAP_STEPS: Record<Exclude<SplitGap, "none">, readonly [number, number]> = {
  sm: [8, 12],
  md: [12, 16],
  lg: [16, 24],
};

/** Tailwind's `sm`, in px — the one breakpoint the gap scale steps at. */
export const SPLIT_GAP_BREAKPOINT = RESPONSIVE_VIEWPORT_BANDS.sm;

/**
 * The content side's floor, as the fraction of the container Split.vue
 * states: `min-width: 50%`. Percent never enters the IR — the fraction is
 * resolved adapter-side against `availableWidth`, the measured content box
 * that is also the base the browser resolves the percentage against, so the
 * engine's input and the oracle's quantity stay the same by construction.
 */
const CONTENT_MIN_FRACTION = 0.5;

/**
 * Resolve the `minSideWidth` prop to px. `px` and `rem` are the units the
 * component's own docs and demos name, and the only ones this context can
 * resolve honestly: `rem` needs the pinned root, and everything else — `em`
 * needs a font, `%` a percentage base the prop's docs never promise — is
 * refused loudly rather than guessed. A case that wants a length outside
 * that pair cannot exist until the modelled-subset record admits it.
 */
export function resolveMinSideWidth(minSideWidth: string): number {
  const raw = /^(\d+(?:\.\d+)?)(px|rem)$/.exec(minSideWidth.trim());
  const value = Number.parseFloat(raw?.[1] ?? "");
  const unit = raw?.[2];
  if (unit === undefined || Number.isNaN(value)) {
    throw new Error(
      `resolveMinSideWidth: "${minSideWidth}" is not a px or rem length — those are the units ` +
        "the adapter resolves (rem at the conformance route's pinned 16px root), and an unresolvable " +
        "unit must fail loudly, never become a guessed width. The length grammar the engine keeps " +
        "is recorded as MODELLED_SUBSET.absences.PERCENT.",
    );
  }
  return unit === "rem" ? value * ROOT_FONT_PX : value;
}

/** The row's gap in px: the step's band value, or zero for "none". */
export function splitGapPx(gap: SplitGap | undefined, viewportWidth: number): number {
  if (gap === "none") return 0;
  const [belowSm, atSm] = SPLIT_GAP_STEPS[gap ?? "md"];
  return viewportWidth >= SPLIT_GAP_BREAKPOINT ? atSm : belowSm;
}

/**
 * The conservative floor of the content box the browser will measure, in
 * terms of the viewport a case declares: the most the harness page can take
 * from the viewport before the section's content box — a classic scrollbar
 * (15-17px) plus rounding. The route measures the real width and feeds the
 * adapter with it; this bound exists for the coverage floor, which has no
 * browser to measure and must judge the case list on the pessimistic side.
 */
export const SINGLE_LINE_MARGIN_PX = 32;

/**
 * Whether the browser keeps this Split on one line at the given context — the
 * CSS line-break predicate for exactly these two items: the row breaks onto
 * a second line when the panels' hypothetical main sizes plus the gap exceed
 * the line. The content side's hypothetical size is its `min-width: 50%`
 * floor (the basis is 0), the panel's is its basis, so the predicate closes
 * over the same numbers the adapter resolves. The coverage floor uses it to
 * keep every declared case inside the modelled single line, and the adapter
 * reads it as the regime boundary rather than a refusal — see splitLayout.
 */
export function staysOnOneLine(
  props: { minSideWidth?: string; gap?: SplitGap },
  ctx: LayoutContext,
): boolean {
  const minSidePx = resolveMinSideWidth(props.minSideWidth ?? "16rem");
  return (
    minSidePx + splitGapPx(props.gap, ctx.viewportWidth) <=
    CONTENT_MIN_FRACTION * ctx.availableWidth
  );
}

/**
 * The counted absences — the Split behaviours with no honest mapping in the
 * engine's modelled subset, recorded rather than pretended away. Same shape
 * and same law as sidebar's SIDEBAR_UNMODELLED: the fields are the gate's
 * exception-row fields and mandatory for the same reason, absences only, and
 * the floor test in layout.test.ts keeps the list counted and truthful.
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

export const SPLIT_UNMODELLED: readonly UnmodeledBehaviour[] = [
  {
    aspect:
      "the collapsed state — the side panel wrapped onto a line of its own at its declared width, the content stacked on the line below",
    reason:
      "the collapse is flex-wrap line breaking and the engine's IR is one line. The breakpoint resolves adapter-side (staysOnOneLine), but the wrapped boxes have no honest engine geometry: across the deficit the browser puts the panel alone on a full line and gives the content the next one, while the engine's row keeps both on one line and overflows — no tree this engine can produce states the wrapped boxes.",
    owner:
      "closed by Phase 4B: the modelled-subset record carries the wrap absence (MODELLED_SUBSET.absences.WRAP) and this row names its Split face",
    removal:
      "the engine growing line collection; the record's wrap declaration has landed, so the collapse is recorded scope, and what would replace the row is only a pinned wrapped geometry.",
  },
];

/**
 * Map Split's props onto a layout tree. Pure: same props and context, same
 * tree, every time. The component's own defaults (`side` "left",
 * `minSideWidth` "16rem", gap "md") are applied here so a case that passes
 * nothing models what a consumer actually renders.
 *
 * The tree mirrors the DOM the route mounts: the component root is the
 * single flex line, the content node is a column because Split's content
 * div is a plain block (its children stack, no flex of their own), and the
 * children ride the DEFAULT slot — the route supplies only that slot, so
 * the modelled side panel is the empty one, whose basis width, stretch
 * height and position the comparison still holds equal. Document order
 * follows `side` exactly as the template renders it, which is what puts the
 * panel on the right for `side: "right"`.
 *
 * The collapse is a guarded regime, not a refused one. The boundary is
 * `staysOnOneLine`; what holds every COMPARED case on its fitting side is
 * the case set plus the coverage floor, not a check in here.
 */
export function splitLayout(
  props: { side?: SplitSide; minSideWidth?: string; gap?: SplitGap },
  ctx: LayoutContext,
  children: readonly ChildSpec[],
): LayoutNode {
  const minSidePx = resolveMinSideWidth(props.minSideWidth ?? "16rem");
  const gap = splitGapPx(props.gap, ctx.viewportWidth);
  const contentMinPx = CONTENT_MIN_FRACTION * ctx.availableWidth;
  // The regime boundary must NOT throw: the route evaluates every case at
  // every width the spec navigates, including widths a case never declared,
  // so a context-conditional throw would kill a whole page's report for
  // comparisons nobody makes. `staysOnOneLine` is the breakpoint, and the
  // tree below is the one-line row either way — in the collapsed regime it
  // describes an arrangement the browser does not build (SPLIT_UNMODELLED
  // records exactly that), which is why nothing may compare a case there.

  // flexBasis 0 + flexGrow 999 is Split's "take the rest", copied verbatim
  // from the style objects the component ships; flexGrow 0 + flexShrink 0 +
  // the explicit basis is its "never move". The min-widths ride along
  // because the browser carries them into its line-break decision (the one
  // staysOnOneLine mirrors) and into the clamp the engine applies — the tree
  // states the CSS the component ships, not merely the geometry it happens
  // to produce.
  const panel: LayoutNode = {
    style: {
      axis: "row",
      flexBasis: minSidePx,
      flexGrow: 0,
      flexShrink: 0,
      minWidth: minSidePx,
    },
  };
  const content: LayoutNode = {
    style: {
      axis: "column",
      flexBasis: 0,
      flexGrow: 999,
      flexShrink: 1,
      minWidth: contentMinPx,
    },
    children: children.map((child) => ({
      style: { axis: "row", width: child.w, height: child.h },
    })),
  };
  return {
    id: "root",
    style: { axis: "row", gap },
    // Document order follows `side` (Split.vue's two templates), so the
    // comparator's positional walk sees the order the browser lays out.
    children: props.side === "right" ? [content, panel] : [panel, content],
  };
}
