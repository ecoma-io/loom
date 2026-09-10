/**
 * The engine's declared scope, as data: what the single-line IR models, and
 * every behaviour it deliberately does not.
 *
 * This constant exists because a scope that lives only in prose rots — the
 * docblock this record replaced listed the absences in words while the
 * adapters that refuse on them threw free-text messages, and nothing held
 * the two together. Now the record is one export the adapters re-export
 * beside the judged `layout` edge (the conformance gate requires that
 * re-export), a refusal of an unmodelled capacity names the absence entry
 * it refuses on — a malformed prop value refuses on the prop's own grammar
 * and names no entry (frame's ratio throw is that shape) — and the
 * artifact model cites this file instead of restating the list. Nothing
 * reads the entries programmatically yet; their law is the gate plus the
 * floor tests, which is enough to make a silently widened subset impossible.
 *
 * ## Route totality, stated once because four adapters live by it
 *
 * The conformance route computes every case at every viewport its page
 * navigates, so an adapter's throw is never a per-case refusal — it kills a
 * whole page's report for comparisons nobody makes. The law the route's
 * adapters converged on: an adapter is TOTAL at the route edge, and refusal
 * is PROP-LEVEL, firing only where the case author can act. Sidebar and
 * split are the pure form — their regime boundary is contextual, so the
 * exported predicate (`sidebarCollapses`, `staysOnOneLine`) guards it and
 * the single-line tree comes back on both sides, the far side never
 * compared. Dashboard-grid is the same law where the predicate is a prop:
 * its route adapter answers a computation outside the case's published
 * width with the empty line, and the inner adapter's throws are case-author
 * errors. Grid neither guards nor throws: it projects the first row and the
 * case's `knownDivergence` declines the comparison — declining to compare
 * is not failing to compute. The one shape this forbids is the
 * context-conditional throw inside the mapped adapter; it was measured, not
 * imagined (a defaults case declared at 800px computed inside a 360px page
 * took the whole report down).
 */

/** One declared absence from the modelled subset. */
export interface ModelledAbsence {
  /**
   * Why the engine does not model it — precisely enough to recognise the
   * behaviour in a browser, and citing the observed instance where one
   * exists.
   */
  reason: string;
  /** Who owns the decision that keeps it outside, or the work that ends it. */
  owner: string;
  /**
   * What reopens the question — the condition under which the absence is
   * modeled or re-decided. Omit it only for an absence closed by decision
   * rather than by future work: an entry with an owner but no reopen
   * condition must say in `owner` why none is owed.
   */
  reopens?: string;
}

/**
 * The modelled subset. `modelled` states what the IR computes — one
 * capability per key, terse because `layout.ts` and `style.ts` carry the
 * precise contracts; `absences` states the boundary, one declared absence
 * per key.
 */
export const MODELLED_SUBSET = {
  modelled: {
    /** One line of children in order — the line is the whole model. */
    SINGLE_LINE: "one line of children, placed in document order",
    /** Own size: declared width/height, min/max, and the ratio transfer. */
    OWN_SIZE:
      "width/height resolved against the constraint (definite, max-content, fit-content), clamped by minWidth/maxWidth with min winning over max, and the aspectRatio transfer contract style.ts states",
    /** Border-box padding; the content box is the outer size minus it. */
    PADDING: "border-box padding on both axes; children divide the content box it leaves",
    /** Main-axis sizing: fixed bases, then basis/grow/shrink distribution. */
    MAIN_AXIS:
      "fixed sizes, then flex-basis/grow/shrink distribution with per-child clamping and freeze — the clamps ride minWidth/maxWidth, rows only (the IR has no minHeight)",
    /** Cross axis: align-items, and the line's cross size. */
    CROSS_AXIS:
      "align-items start/center/end/stretch, the line's cross size taken from the container's content box or the largest child",
    /** Placement: gap and justifyContent along the line. */
    PLACEMENT: "gap between children, justifyContent start/center/end along the line",
  },
  absences: {
    /**
     * The general face of the wrap refusals: SIDEBAR_WRAPPED_PANEL,
     * GRID_ROW_BANDING and the DASHBOARD_ROW_AUTO_PLACEMENT pair are its
     * concrete instances at the adapters that guard them.
     */
    WRAP: {
      reason:
        "flex-wrap line breaking is line collection, and the IR is one line. No adapter approximates a wrapped arrangement; the regimes that would wrap are guarded or declined, never compared.",
      owner: "Engine — a later phase, behind the design record's gates",
      reopens:
        "line collection lands as an additive capability that does not reshape ComputedNode (layout.ts's own condition for anything this IR takes on)",
    },
    DIRECTION: {
      reason:
        "axes are physical: no row-reverse, no column-reverse, no logical inline/start-end direction. Loom's layout components are entirely physical (px-* gutters, a physical `side`), so logical names here would be physical meaning in a logical costume (style.ts).",
      owner: "Engine — a later phase, if a direction-dependent consumer exists",
      reopens: "a component that renders direction-dependent layout joins the modelled slice",
    },
    BASELINE: {
      reason:
        "align-items: baseline is decided by text metrics, which a text-free geometry engine does not have and the conformance fixtures do not contain. The adapters refuse it loudly (inline, center) rather than fall back to a different alignment.",
      owner: "Engine — blocked on the same measure protocol TEXT_METRICS needs",
      reopens: "text metrics, or a measure protocol that can resolve a baseline",
    },
    PERCENT: {
      reason:
        "`Length` is px by design. The percentages the slice needs — Split's `min-width: 50%`, Sidebar's `contentMin` — resolve adapter-side against the measured container, so the engine never sees one (#300 closed exactly that way); rem resolves at the conformance route's pinned 16px root, also adapter-side. Everything else (em, ch, a percent track floor) is refused loudly rather than guessed.",
      owner: "Engine — phase 2",
      reopens: "percent arrives as an additive `Length` union member, not a rewrite of the field",
    },
    TEXT_METRICS: {
      reason:
        "the engine cannot measure text: no min-content width, no ch/em resolution, no baseline. Font-relative lengths are refused adapter-side (Center's `prose`), and the conformance fixtures are text-free fixed boxes by construction — which is also what keeps the AUTOMATIC_MINIMUM_SIZE divergence out of every comparison.",
      owner:
        "Engine — needs a measure protocol, the one input a pure geometry oracle cannot synthesize",
      reopens:
        "a measure protocol lands, or a modelled component needs text-bearing children compared",
    },
    AUTOMATIC_MINIMUM_SIZE: {
      reason:
        "CSS gives a flex item a content-based minimum (`min-width: auto` over the item's own content, in the visible-overflow case); the engine's floor is the declared minWidth, on the main axis only, and 0 otherwise. The two agree exactly when every child is a text-free fixed box. Where a child carries text or a replaced element they diverge: the browser's floor stops a shrink the engine's distribution applies. Observed instance ecoma-io/loom#283: with a reel's shrink lock lost, eight `w-40` cards in a `gap=\"md\"` reel compress to ~86px and the row fits at an 800px viewport — at 360px it is the browser's min-content floor, not anything the engine models, that stops the compression.",
      owner:
        "Engine — blocked on TEXT_METRICS's measure protocol, which a content-based minimum presupposes",
      reopens:
        "the measure protocol lands; until then the fixtures' text-free construction is the containment",
    },
    PADDING_LARGER_THAN_BOX: {
      reason:
        "when padding exceeds the box, the engine collapses the children's space to zero and places them at the content origin, where CSS would keep them at the padding edge — recorded rather than modeled (layout.ts), and unreachable through the slice's 16-32px gutters.",
      owner: "Engine — a padding-semantics decision, not a defect; nothing models it today",
      reopens:
        "a consumer can author padding at or above the box, or the padding model is revisited",
    },
    BOTH_AXES_DEFINITE_RATIO: {
      reason:
        "when both axes resolve without the ratio — both declared, or both filled from definite constraints before the ratio is consulted — the ratio is not re-applied. That is the contract style.ts states and invariants.test.ts pins (the finding-5 fixture): what CSS wants there is genuinely ambiguous, because an auto-height block does not fill its containing block the way a definite constraint fills an axis here. The case is unreachable through the conformance route, whose height offer is always max-content.",
      owner: "Engine — the phase that grows a real both-definite consumer decides the semantics",
      reopens: "a consumer reaches the both-definite case through an adapter",
    },
    SIDEBAR_WRAPPED_PANEL: {
      reason:
        "the intrinsic collapse is flex-wrap, so the wrapped state has no honest engine geometry: across the deficit the browser puts the sidebar panel alone on its own line at its declared width, while the engine's shrink pass would eat the basis. What IS pinned is the boundary: the collapse breakpoint resolves adapter-side (`sidebarCollapses`, exact at the flip), and because the content floor is a percentage of the container the defaults collapse when the container is under 544px — 0.5W + 16 gap + 256 basis > W, the floor moving with the container, not a fixed width (sidebar's layout.test.ts pins 544/543). What is NOT pinned is the width the wrapped panel keeps: ecoma-io/loom#275 stays open on exactly that (#314).",
      owner:
        "Phase 4B — closing: this record plus the adapter's floor is the closure; the wrapped width stays with #275",
      reopens:
        "#275's resolution (a pinned wrapped-panel width), or the engine growing line collection",
    },
    GRID_ROW_BANDING: {
      reason:
        "beyond one row there is no honest single-line tree; the adapter returns the first row's projection and the case carrying such a fixture carries the `knownDivergence` that declines the comparison (ecoma-io/loom#317). The projection–divergence pairing is the coverage floor's law, so row banding stays a counted exception instead of a silent one.",
      owner: "Phase 4B — closed as a recorded absence; the engine gains nothing until rows exist",
      reopens:
        "the IR expressing more than one line, or a consumer that needs a computed second row",
    },
    DASHBOARD_ROW_AUTO_PLACEMENT: {
      reason:
        "more tiles than fitted tracks reflow onto further rows; `sum(spans) > fitted` refuses — the wrap face of WRAP at the dashboard's span arithmetic (ecoma-io/loom#315). The refusal fires on case-author data, never on context, so it cannot kill a route page.",
      owner: "Engine — line collection, with WRAP",
      reopens: "the IR expressing more than one line",
    },
    DASHBOARD_IMPLICIT_TRACKS: {
      reason:
        "a span wider than the whole fitted grid raises auto-sized implicit columns the `1fr` arithmetic does not cover; the same wrap check refuses it (ecoma-io/loom#315).",
      owner: "Engine — with DASHBOARD_ROW_AUTO_PLACEMENT",
      reopens: "the IR expressing tracks the fitted count does not name",
    },
  },
} as const;

/** The declared absences, keyed — the identifiers adapters and docs cite. */
export type ModelledAbsenceKey = keyof typeof MODELLED_SUBSET.absences;
