/**
 * The style model — what a layout tree asks for, as plain data.
 *
 * Yoga's `Node` is a mutable C++ object with ~90 imperative setters and
 * copy-on-write sharing, because React Native's shadow trees need an object
 * a host can mutate in place. Loom has no such host: the engine is a pure
 * oracle over immutable input trees, so there are no setters, no classes and
 * no `reset()` here — one tree is built per computation and read as data.
 *
 * Sizing is border-box throughout, matching the Tailwind preflight every Loom
 * component renders under: `width`, `maxWidth` and friends bound the OUTER
 * edge, and a container's content box is its size minus its padding. The
 * conformance comparator relies on that being true of both sides.
 */

/** The direction children line up in. No wrap, no reverse, in this slice. */
export type Axis = "row" | "column";

/**
 * Cross-axis alignment of children (CSS `align-items`). `baseline` is
 * deliberately absent: it needs text metrics, which the engine does not have
 * and the conformance fixtures do not contain.
 */
export type Align = "start" | "center" | "end" | "stretch";

/**
 * A resolved length in px. Percent is phase 2 (Split's `minWidth: "50%"`) and
 * will arrive as an additive union member, not a rewrite of this one.
 */
export type Length = number;

/**
 * What one node asks of its container.
 *
 * Fields left unset follow CSS's own defaults, on purpose: `flexGrow` 0 and
 * `flexShrink` 1 mean a tree of plain fixed boxes behaves like the same DOM
 * in a browser — children of an overflowing nowrap row shrink — without the
 * adapter spelling the defaults out. A conformance tree must model the
 * component's real DOM, and the real DOM ships those defaults.
 */
export interface LayoutStyle {
  /** Required, no default: explicitness beats remembering a convention. */
  axis: Axis;
  /** Main-axis gap between children, px. */
  gap?: number;
  /** Cross-axis alignment of children. Default `"stretch"` — the CSS default. */
  alignItems?: Align;
  /** Main-axis positioning of the single line: the trivial three only. */
  justifyContent?: "start" | "center" | "end";
  /**
   * Symmetric or per-axis padding, px. Named x/y — horizontal/vertical — not
   * inline/block: this IR has no direction, and Loom's layout components are
   * entirely physical (`px-*` gutters, physical `side`), so logical names
   * here would be physical meaning in a logical costume. If direction is
   * added in a later phase, logical padding arrives as its own fields then,
   * honestly. The number form is per side: `4` means 4 on every edge, the
   * way `p-1` does.
   */
  padding?: number | { x?: number; y?: number };
  width?: Length;
  height?: Length;
  minWidth?: Length;
  maxWidth?: Length;
  flexGrow?: number;
  flexShrink?: number;
  /**
   * The main-axis base size (CSS `flex-basis`): stands in for the stated
   * main size as the distribution base — a declared basis wins over `width`
   * for base sizing, the way it does in a browser. Applies only along the
   * parent's main axis; it is never read as a cross size.
   */
  flexBasis?: Length;
  /**
   * width / height; Frame. Degenerate (≤0, non-finite) treated as unset, and
   * — border-box — it applies to the outer size, the way `aspect-ratio` does
   * under the preflight.
   *
   * The contract, stated exactly: the ratio derives the second axis whenever
   * EXACTLY ONE axis has resolved — from a declared style size, or from a
   * constraint fill that happened while the other axis was still unresolved.
   * When BOTH axes resolve without it — both declared, or both filled from
   * definite constraints before the ratio is consulted — the ratio is not
   * re-applied. The both-definite case is unreachable through this slice's
   * adapters (the conformance route always offers a max-content height, so
   * one axis always arrives unresolved), and what CSS would want there is
   * genuinely ambiguous — an auto-height block does not fill its containing
   * block's height the way a definite constraint fills an axis here, so
   * "match CSS" does not name one answer — so the semantic decision (re-apply,
   * transfer, or clamp) is deferred to the phase that has a real consumer.
   */
  aspectRatio?: number;
}

/**
 * One node of the input tree. `style` is the only part the algorithm reads;
 * `children` are laid out inside the content box, in order, one line.
 */
export interface LayoutNode {
  /**
   * Optional; echoed verbatim into the computed node. Never read by the
   * algorithm. Convention: the node corresponding to a component's root
   * element carries id "root" — the conformance comparator anchors there so
   * it can walk through synthetic wrapper nodes a component's tree needs but
   * its DOM does not have (Center's centering row, for one).
   */
  id?: string;
  style: LayoutStyle;
  children?: readonly LayoutNode[];
}
