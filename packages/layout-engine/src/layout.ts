/**
 * The single entry point: a pure function from a style tree plus the space it
 * was offered, to the geometry that results.
 *
 * Scope of the algorithm, stated honestly: single-line flexbox at the
 * fidelity Loom's four slice components exercise — resolve own size
 * (width/height/min/max/aspectRatio against the constraint), subtract
 * padding, size children along the main axis (fixed sizes, then
 * grow/shrink/basis distribution with min/max clamping), place with gap and
 * justifyContent, size and place on the cross axis per alignItems. No wrap,
 * no percent, no measure protocol: those arrive in later phases behind the
 * gates the design record names, and none of them may force this IR to
 * change shape.
 *
 * The engine never touches the DOM and never rounds: rounding is a policy of
 * the reader (the conformance comparator applies Yoga's two-edge absolute
 * technique; a consumer that needs device pixels rounds where it reads).
 */
import { clampSize, finite, type AvailableSpace, type DimensionConstraint } from "./constraint";
import type { Align, Axis, LayoutNode, LayoutStyle } from "./style";

export interface ComputedNode {
  /** Echoed from the input node when present — makes failure messages self-sufficient. */
  id?: string;
  /** Position relative to the parent's content box origin. */
  left: number;
  top: number;
  width: number;
  height: number;
  /**
   * true iff any child's laid-out box (position + size) extends beyond this
   * node's content box on EITHER axis. Both axes, any child, no exception
   * list — the invariants suite asserts on this field, so its meaning is
   * fixed here rather than discovered later. Clipping is rendering and never
   * happens here: the geometry of an overflowing child stays its layout box,
   * which is exactly what a browser's `getBoundingClientRect` reports under
   * `overflow: hidden`.
   */
  hadOverflow: boolean;
  children?: readonly ComputedNode[];
}

/**
 * Compute the geometry of `root` inside `available`.
 *
 * Pure: the input tree is never mutated, the output is a fresh tree, and
 * identical inputs produce deeply identical outputs — the invariants suite
 * holds the engine to that rather than this comment.
 */
export function layout(root: LayoutNode, available: AvailableSpace): ComputedNode {
  return compute(root, available);
}

/**
 * Float dust from proportional distribution must not read as overflow: a
 * grow pass that fills the line exactly can still land a few ULPs past it,
 * and a geometry comparator cares about pixels, not the 16th decimal place.
 */
const EPSILON = 1e-6;

/** A definite, usable length: non-finite means unset, negative collapses to 0. */
function definite(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(0, value);
}

/** The style's size along an axis, when it states one. */
function styleSize(style: LayoutStyle, axis: Axis): number | undefined {
  return definite(axis === "row" ? style.width : style.height);
}

/**
 * Clamp a size along an axis. Only width carries min/max in this slice —
 * that is where the shipped semantics need it (the px fragment of the
 * Split/Sidebar collapse trio), and an honest type beats a speculative
 * minHeight nobody pins.
 */
function clampAlong(style: LayoutStyle, axis: Axis, size: number): number {
  return axis === "row"
    ? clampSize(size, style.minWidth, style.maxWidth)
    : Math.max(0, finite(size));
}

/** Per-side padding on each axis; negative and non-finite padding is none. */
interface Padding {
  x: number;
  y: number;
}

function paddingOf(style: LayoutStyle): Padding {
  if (style.padding === undefined) return { x: 0, y: 0 };
  if (typeof style.padding === "number") {
    const p = Math.max(0, finite(style.padding));
    return { x: p, y: p };
  }
  return { x: Math.max(0, finite(style.padding.x)), y: Math.max(0, finite(style.padding.y)) };
}

/** A usable ratio, or undefined: ≤0 and non-finite mean unset (Frame degenerates). */
function ratioOf(style: LayoutStyle): number | undefined {
  const r = style.aspectRatio;
  return typeof r === "number" && Number.isFinite(r) && r > 0 ? r : undefined;
}

function gapOf(style: LayoutStyle): number {
  return Math.max(0, finite(style.gap));
}

/** Flex factors follow CSS defaults: grow 0, shrink 1 — see LayoutStyle. */
function growOf(style: LayoutStyle): number {
  return Math.max(0, finite(style.flexGrow));
}

function shrinkOf(style: LayoutStyle): number {
  return Math.max(0, finite(style.flexShrink, 1));
}

/**
 * The size a child takes along `axis` before distribution: its flex basis,
 * its stated size, the ratio-derived one, or what its own content needs.
 * `axis` is the axis being measured — a child's own `style.axis` decides
 * only how ITS children stack, never how big the child is here.
 *
 * `asMain` says the axis is the MAIN axis of the container being measured,
 * which is the only place flex-basis applies: it stands in for the stated
 * main size as the distribution base (CSS: `flex-basis: auto` falls back to
 * width, and a declared basis wins over the width for base sizing). A
 * cross-axis measurement never consults it — basis is not a cross size.
 */
function hypotheticalSize(child: LayoutNode, axis: Axis, asMain = false): number {
  if (asMain) {
    const basis = definite(child.style.flexBasis);
    if (basis !== undefined) return clampAlong(child.style, axis, basis);
  }
  const own = styleSize(child.style, axis);
  if (own !== undefined) return clampAlong(child.style, axis, own);
  const other = styleSize(child.style, axis === "row" ? "column" : "row");
  const ratio = ratioOf(child.style);
  if (ratio !== undefined && other !== undefined) {
    // ratio is width/height, so deriving the row-axis size multiplies.
    return clampAlong(child.style, axis, axis === "row" ? other * ratio : other / ratio);
  }
  return contentSize(child, axis);
}

/**
 * The node's outer size along `axis` when content alone decides it: its own
 * children line up along its axis (sum) or share the cross axis (max). Grow
 * does not apply — with no definite space to divide, an item's max-content
 * contribution is its base size, which is exact for the slice's fixed-box
 * fixtures.
 */
function contentSize(node: LayoutNode, axis: Axis): number {
  const kids = node.children ?? [];
  const gap = gapOf(node.style);
  let extent = 0;
  if (node.style.axis === axis) {
    for (const [i, kid] of kids.entries()) {
      extent += hypotheticalSize(kid, axis, true) + (i > 0 ? gap : 0);
    }
  } else {
    for (const kid of kids) extent = Math.max(extent, hypotheticalSize(kid, axis));
  }
  const pad = axis === "row" ? paddingOf(node.style).x : paddingOf(node.style).y;
  return clampAlong(node.style, axis, extent + 2 * pad);
}

/** The distribution clamps and flex factors of one child, resolved once. */
interface ChildBounds {
  min: number;
  max: number;
  grow: number;
  shrink: number;
}

/**
 * Resolve the main-axis sizes of one line: grow fills surplus space in
 * proportion to grow factors, shrink takes deficit in proportion to
 * base × shrink factor (CSS's scaled shrink), and both clamp at each child's
 * min/max with the remainder redistributed among the rest. The space is the
 * caller's already-clamped content box on every path, so a freeze target is
 * the child's own clampAlong order — max first, min raised over it — and the
 * line's cursor and the child's reported box can never disagree.
 */
function distributeSizes(
  kids: readonly LayoutNode[],
  bases: readonly number[],
  space: number,
  gap: number,
  axis: Axis,
): number[] {
  const sizes = [...bases];
  // Defensive only: the caller derives a finite clamped box on every path, so
  // an unbounded space cannot reach here — kept so a future caller cannot
  // reintroduce the infinite-positions failure silently.
  if (!Number.isFinite(space) || kids.length === 0) return sizes;
  const totalGaps = gap * (kids.length - 1);
  const totalOf = (): number => sizes.reduce((sum, size) => sum + size, 0) + totalGaps;
  const bounds: ChildBounds[] = kids.map((kid) => ({
    min: axis === "row" ? Math.max(0, finite(kid.style.minWidth)) : 0,
    max:
      axis === "row" && kid.style.maxWidth !== undefined && Number.isFinite(kid.style.maxWidth)
        ? Math.max(0, kid.style.maxWidth)
        : Number.POSITIVE_INFINITY,
    grow: growOf(kid.style),
    shrink: shrinkOf(kid.style),
  }));

  if (totalOf() <= space) {
    const frozen = new Set<number>();
    for (;;) {
      const free = space - totalOf();
      if (free <= 0) break;
      const active = bounds
        .map((b, i) => ({ b, i }))
        .filter(({ b, i }) => b.grow > 0 && !frozen.has(i));
      if (active.length === 0) break;
      const totalGrow = active.reduce((sum, { b }) => sum + b.grow, 0);
      let refroze = false;
      for (const { b, i } of active) {
        const target = (sizes[i] ?? 0) + (free * b.grow) / totalGrow;
        if (target > b.max) {
          // Freeze at the child's own clamp order, min raised over max — the
          // same number the child's recursion will report. Freezing at max
          // alone let a min>max child report one width while the cursor
          // advanced past a smaller one, silently overlapping the sibling.
          sizes[i] = Math.max(b.max, b.min);
          frozen.add(i);
          refroze = true;
        }
      }
      if (!refroze) {
        for (const { b, i } of active) sizes[i] = (sizes[i] ?? 0) + (free * b.grow) / totalGrow;
        break;
      }
    }
    return sizes;
  }

  const frozen = new Set<number>();
  for (;;) {
    const deficit = totalOf() - space;
    if (deficit <= 0) break;
    const active = bounds
      .map((b, i) => ({ b, i }))
      .filter(({ b, i }) => b.shrink > 0 && !frozen.has(i));
    if (active.length === 0) break;
    const scaled = active.map(({ b, i }) => (sizes[i] ?? 0) * b.shrink);
    const totalScaled = scaled.reduce((sum, value) => sum + value, 0);
    if (totalScaled <= 0) break;
    let refroze = false;
    for (const [k, { b, i }] of active.entries()) {
      const target = (sizes[i] ?? 0) - (deficit * (scaled[k] ?? 0)) / totalScaled;
      if (target < b.min) {
        sizes[i] = b.min;
        frozen.add(i);
        refroze = true;
      }
    }
    if (!refroze) {
      for (const [k, { i }] of active.entries()) {
        sizes[i] = (sizes[i] ?? 0) - (deficit * (scaled[k] ?? 0)) / totalScaled;
      }
      break;
    }
  }
  return sizes;
}

/** The constraint offered on an axis. */
function constraintAlong(available: AvailableSpace, axis: Axis): DimensionConstraint {
  return axis === "row" ? available.width : available.height;
}

function compute(node: LayoutNode, available: AvailableSpace): ComputedNode {
  const style = node.style;
  const axis = style.axis;
  const pad = paddingOf(style);
  const kids = node.children ?? [];
  const gap = gapOf(style);
  const ratio = ratioOf(style);

  // Own size resolution. Definite style sizes win; the ratio derives one axis
  // from the other, whichever resolves first; the available space fills what
  // is still auto (a block-level node fills its container — Stack and Inline
  // roots rely on that); the ratio then runs once more because a width that
  // arrived from the container still fixes the height (Frame). What survives
  // as undefined is content-sized below. When BOTH axes fill from definite
  // constraints at once, both are resolved before that last consultation and
  // the ratio is not re-applied — the contract aspectRatio's docblock states
  // exactly. The width is clamped by its own min/max BEFORE the ratio
  // transfers from it: the transfer consumes the clamped size, which is the
  // order a browser uses — measured in Chromium, `width: 300, maxWidth: 120,
  // aspectRatio: 2` renders 120×60, not the 120×150 a post-transfer clamp
  // would leave behind.
  let width = styleSize(style, "row");
  let height = styleSize(style, "column");
  if (width !== undefined) width = clampAlong(style, "row", width);
  if (width === undefined && height !== undefined && ratio !== undefined) {
    width = clampAlong(style, "row", height * ratio);
  }
  if (height === undefined && width !== undefined && ratio !== undefined) height = width / ratio;
  if (width === undefined && available.width.mode === "definite") {
    width = clampAlong(style, "row", available.width.size);
  }
  if (height === undefined && available.height.mode === "definite") height = available.height.size;
  if (height === undefined && width !== undefined && ratio !== undefined) height = width / ratio;
  if (width === undefined && height !== undefined && ratio !== undefined) {
    width = clampAlong(style, "row", height * ratio);
  }
  height = height === undefined ? undefined : clampAlong(style, "column", height);

  const mainKnown = axis === "row" ? width : height;
  const crossKnown = axis === "row" ? height : width;
  const padMainBoth = axis === "row" ? 2 * pad.x : 2 * pad.y;
  const padCrossBoth = axis === "row" ? 2 * pad.y : 2 * pad.x;
  const crossAxis: Axis = axis === "row" ? "column" : "row";
  const mainConstraint = constraintAlong(available, axis);
  const crossConstraint = constraintAlong(available, crossAxis);

  // The content-box space children divide, derived so that the node's own
  // min/max bounds it on EVERY path: definite sizes were clamped before this
  // point, the fit-content offer is clamped here, and a max-content size is
  // the content itself, clamped here. Clamping after distribution instead —
  // the old shape — let children grow into an offer the box then reneged on,
  // and an unclamped max-content space put Infinity into child positions
  // under center/end justification. Every path now distributes into a finite
  // box the node actually keeps; a max-width under max-content shrinks the
  // line rather than overflowing the node's own clamp. Pathologically,
  // padding larger than the box collapses this space to zero and places
  // children at the content origin (0) where CSS would keep them at the
  // padding edge — unreachable through the slice's 16-32px gutters, recorded
  // rather than modeled.
  const bases = kids.map((kid) => hypotheticalSize(kid, axis, true));
  const contentMain =
    bases.reduce((sum, base) => sum + base, 0) + gap * Math.max(0, kids.length - 1);
  const mainSpace =
    mainKnown !== undefined
      ? Math.max(0, mainKnown - padMainBoth)
      : mainConstraint.mode === "fit-content"
        ? Math.max(0, clampAlong(style, axis, finite(mainConstraint.size)) - padMainBoth)
        : Math.max(0, clampAlong(style, axis, contentMain + padMainBoth) - padMainBoth);
  const sizes = distributeSizes(kids, bases, mainSpace, gap, axis);
  const justify = style.justifyContent ?? "start";
  const usedMain = sizes.reduce((sum, size) => sum + size, 0) + gap * Math.max(0, kids.length - 1);
  // center/end on an overflowing line push the leading edge past 0, exactly
  // as CSS places them — a negative offset is information, not an error.
  const leading =
    justify === "center"
      ? (mainSpace - usedMain) / 2
      : justify === "end"
        ? mainSpace - usedMain
        : 0;
  const mainPos: number[] = [];
  let cursor = leading;
  for (const size of sizes) {
    mainPos.push(cursor);
    cursor += size + gap;
  }

  // Cross axis: the line's cross size is the container's content box when it
  // has one (a definite size, or a fit-content offer clamped the same way the
  // main path clamps its offer), else the largest child clamped to the box
  // the node's own cross bounds keep — which is also what stretch then fills.
  const crossSpace: number | undefined =
    crossKnown !== undefined
      ? Math.max(0, crossKnown - padCrossBoth)
      : crossConstraint.mode === "fit-content"
        ? Math.max(0, clampAlong(style, crossAxis, finite(crossConstraint.size)) - padCrossBoth)
        : undefined;
  const align: Align = style.alignItems ?? "stretch";
  const lineCross =
    crossSpace ??
    Math.max(
      0,
      clampAlong(
        style,
        crossAxis,
        padCrossBoth +
          kids.reduce((max, kid) => Math.max(max, hypotheticalSize(kid, crossAxis)), 0),
      ) - padCrossBoth,
    );
  const crossSizes = kids.map((kid, i) => {
    const own = styleSize(kid.style, crossAxis);
    if (own !== undefined) return clampAlong(kid.style, crossAxis, own);
    const kidRatio = ratioOf(kid.style);
    if (kidRatio !== undefined) {
      // The ratio derives cross from the FINAL main size — a grown or shrunk
      // Frame-like child is as tall as it ended up wide.
      const mainSize = sizes[i] ?? 0;
      return clampAlong(
        kid.style,
        crossAxis,
        crossAxis === "column" ? mainSize / kidRatio : mainSize * kidRatio,
      );
    }
    if (align === "stretch") return clampAlong(kid.style, crossAxis, lineCross);
    return hypotheticalSize(kid, crossAxis);
  });
  const crossPos = crossSizes.map((size) =>
    align === "center" ? (lineCross - size) / 2 : align === "end" ? lineCross - size : 0,
  );

  // Recurse. The parent owns its children's boxes on both axes: a
  // distributed main size replaces the child's stated one, the way CSS's
  // used size replaces the flex base, and the cross size is the line's
  // (stretch) or the child's own. So the recursion receives the box the
  // line actually assigned — stated as the child's style, not merely offered
  // as space — or a definite-width child would render at its basis again
  // one level down after shrink or grow had moved it.
  const children: ComputedNode[] = [...kids.entries()].map(([i, kid]) => {
    const mainSize = sizes[i] ?? 0;
    const crossSize = crossSizes[i] ?? 0;
    const boxWidth = axis === "row" ? mainSize : crossSize;
    const boxHeight = axis === "row" ? crossSize : mainSize;
    const computed = compute(
      { ...kid, style: { ...kid.style, width: boxWidth, height: boxHeight } },
      {
        width: { mode: "definite", size: boxWidth },
        height: { mode: "definite", size: boxHeight },
      },
    );
    return {
      ...computed,
      left: axis === "row" ? (mainPos[i] ?? 0) : (crossPos[i] ?? 0),
      top: axis === "row" ? (crossPos[i] ?? 0) : (mainPos[i] ?? 0),
    };
  });

  // Content extents, and the own sizes that were left content-based. The
  // content-based paths already clamped the space children were offered, so
  // a max-content box IS that clamped space plus padding — children that
  // refused to shrink past it overflow, honestly, rather than re-widening
  // the box the clamp had decided. fit-content still shrinks to content when
  // the content is the smaller of the two.
  let mainExtent = 0;
  let crossExtent = 0;
  for (const child of children) {
    mainExtent = Math.max(
      mainExtent,
      axis === "row" ? child.left + child.width : child.top + child.height,
    );
    crossExtent = Math.max(
      crossExtent,
      axis === "row" ? child.top + child.height : child.left + child.width,
    );
  }
  const outerMain =
    mainKnown ??
    clampAlong(
      style,
      axis,
      padMainBoth +
        (mainConstraint.mode === "fit-content" ? Math.min(mainSpace, mainExtent) : mainSpace),
    );
  const outerCross =
    crossKnown ??
    clampAlong(
      style,
      crossAxis,
      padCrossBoth +
        (crossConstraint.mode === "fit-content"
          ? Math.min(crossSpace ?? 0, crossExtent)
          : lineCross),
    );

  const outerWidth = axis === "row" ? outerMain : outerCross;
  const outerHeight = axis === "row" ? outerCross : outerMain;
  const contentW = outerWidth - 2 * pad.x;
  const contentH = outerHeight - 2 * pad.y;
  const hadOverflow = children.some(
    (child) =>
      child.left < -EPSILON ||
      child.top < -EPSILON ||
      child.left + child.width > contentW + EPSILON ||
      child.top + child.height > contentH + EPSILON,
  );

  return {
    ...(node.id !== undefined ? { id: node.id } : {}),
    left: 0,
    top: 0,
    width: outerWidth,
    height: outerHeight,
    hadOverflow,
    ...(children.length > 0 ? { children } : {}),
  };
}
