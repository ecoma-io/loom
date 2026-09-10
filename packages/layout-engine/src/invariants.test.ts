import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { layout, type ComputedNode } from "./layout";
import { clampSize, type AvailableSpace, type DimensionConstraint } from "./constraint";
import type { Axis, LayoutNode, LayoutStyle } from "./style";

// The invariants suite (design D7): Yoga's asserted-invariant list, restated
// over fast-check-generated trees rather than hand-picked fixtures — layout
// must be lawful for a whole class of inputs, not for the inputs its author
// thought of. The hand-computed fixtures in layout.test.ts pin what the
// geometry IS; this file pins what it may never fail to BE:
//
//   purity        — the input tree is never mutated, and a deep clone
//                   computes the deeply identical tree;
//   determinism   — a second run changes nothing observable (idempotence);
//   arithmetic    — for a non-overflowing start-justified container whose
//                   main size was content-derived, sum(child main sizes) +
//                   gaps + padding == the container's content size;
//   sanity        — every size is finite and non-negative, no NaN or
//                   Infinity anywhere in the output, positions may be
//                   negative (a centered overflowing line says so) but must
//                   stay finite;
//   bounds        — a node's size respects the min/max the same node
//                   declared (min wins over max, the CSS order);
//   overflow      — hadOverflow is exactly "some child's box exceeds this
//                   node's content box on either axis", recomputed from the
//                   output the way a reader would;
//   ratio         — a degenerate aspectRatio (≤0, NaN, ±Infinity) is
//                   indistinguishable from no ratio at all;
//   monotonicity  — growing the offered main space never shrinks a child;
//   conservation  — a fully active, unclamped, gapless line ends exactly
//                   full: the children sum to the content box;
//   degeneracy    — under max-content, center and end justification place
//                   children exactly where start does;
//   order         — the output's id sequence is the input's preorder (ids
//                   stamped by the generator): distribution never reorders;
//   invariance    — a pass-through wrapper is geometry-transparent, and
//                   padding on an undeclared box is translation;
//   clampSize     — the constraint primitive is total, idempotent, monotone
//                   and applies min after max (its own describe below).
//
// History: the first revision of this suite carried three generator-level
// exclusions, each holding it clear of a then-live engine defect (findings
// 1, 3 and 4 in /tmp/shipworm-reports/05-test-engineer-findings.md). All
// three were removed when the engine was fixed — justify center/end now runs
// against max-content main constraints, min>max bounds stay in the adjacency
// and line-fit walks, and main-axis clamps stay in the line-fit walk — and
// each defect is additionally pinned below as a literal regression case:
// the shrunk counterexample that found it, asserting the CSS-expected
// geometry, per the Yoga discipline of freezing a bug's minimal input.
// Finding 5 is pinned too, with the opposite sign: the both-definite ratio
// is not a defect but the declared contract, recorded as
// MODELLED_SUBSET.absences.BOTH_AXES_DEFINITE_RATIO and asserted as such.
//
// CI pins fast-check's seed (vitest.setup.ts); a counterexample that reveals
// a real defect is committed here as a literal regression case, never fixed
// by moving the seed.

/** Float dust tolerance — the engine's own EPSILON, mirrored for re-derivation. */
const EPSILON = 1e-6;

// --- generators ------------------------------------------------------------
//
// Sizes are small integers (0 included — a zero-size child is a real input),
// gaps and padding land on the values the slice's scales use (8/12/16/24 and
// friends), ratios are non-integer as often as not, and trees nest three
// levels so row-in-column-in-row interactions are reached, not just asserted
// possible.

const axisArb = fc.constantFrom<Axis>("row", "column");
const alignArb = fc.constantFrom("start", "center", "end", "stretch");
const justifyArb = fc.constantFrom("start", "center", "end");
const sizeArb = fc.integer({ min: 0, max: 400 });
const availSizeArb = fc.integer({ min: 0, max: 900 });
const gapArb = fc.integer({ min: 0, max: 48 });
const padArb = fc.integer({ min: 0, max: 32 });
const growArb = fc.integer({ min: 0, max: 3 });
const shrinkArb = fc.integer({ min: 0, max: 2 });
const boundArb = fc.integer({ min: 0, max: 350 });
// Frame-like rationals plus untidy ones — 16/9 and 1.777… must both be
// ordinary inputs, not special cases.
const ratioArb = fc.oneof(
  fc.constantFrom(16 / 9, 4 / 3, 1, 3 / 4),
  fc.double({ min: 0.25, max: 4, noNaN: true }),
);

const opt = <T>(arb: fc.Arbitrary<T>): fc.Arbitrary<T | undefined> =>
  fc.option(arb, { nil: undefined });

// fc.option spells an unset field as an explicit undefined, which the IR's
// optional properties never carry (exactOptionalPropertyTypes). The compact
// steps drop unset keys, and the assertion is then exact: what remains is a
// style whose present keys all carry values.
const compactPad = (value: {
  x: number | undefined;
  y: number | undefined;
}): {
  x?: number;
  y?: number;
} => Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));

const compactStyle = (value: object): LayoutStyle =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as LayoutStyle;

const styleArb: fc.Arbitrary<LayoutStyle> = fc
  .record({
    axis: axisArb,
    gap: opt(gapArb),
    alignItems: opt(alignArb),
    justifyContent: opt(justifyArb),
    padding: opt(fc.oneof(padArb, fc.record({ x: opt(padArb), y: opt(padArb) }).map(compactPad))),
    width: opt(sizeArb),
    height: opt(sizeArb),
    minWidth: opt(boundArb),
    maxWidth: opt(boundArb),
    flexGrow: opt(growArb),
    flexShrink: opt(shrinkArb),
    // flexBasis is read on the main axis as the distribution base (finding 2,
    // fixed and pinned below). It was generated even while dead — every
    // invariant here is phrased on the output — so the suite's coverage of
    // it predates the fix and outlives it.
    flexBasis: opt(sizeArb),
    aspectRatio: opt(ratioArb),
  })
  .map(compactStyle);

function treeArb(depth: number): fc.Arbitrary<LayoutNode> {
  const leaf: fc.Arbitrary<LayoutNode> = fc.record({ style: styleArb });
  if (depth <= 0) return leaf;
  return fc
    .record({
      style: styleArb,
      children: fc.array(treeArb(depth - 1), { maxLength: 4 }),
    })
    .map(({ style, children }) => (children.length === 0 ? { style } : { style, children }));
}

const definiteArb = fc.record({
  mode: fc.constant("definite" as const),
  size: availSizeArb,
});
const fitArb = fc.record({
  mode: fc.constant("fit-content" as const),
  size: availSizeArb,
});
const maxContentArb = fc.constant({ mode: "max-content" } as const);
const dimArb: fc.Arbitrary<DimensionConstraint> = fc.oneof(definiteArb, fitArb, maxContentArb);

// Every justification now meets every constraint mode, including the
// center/end + max-content combination that once placed children at Infinity
// (finding 1, fixed and pinned below) — the generators hold nothing back.
const caseArb: fc.Arbitrary<{ tree: LayoutNode; available: AvailableSpace }> = fc.record({
  tree: treeArb(3),
  available: fc.record({ width: dimArb, height: dimArb }),
});

// --- checker-side re-derivations -------------------------------------------
//
// The engine normalizes hostile numbers at its edges (constraint.ts); the
// checkers below must apply the same normalizations when re-deriving from the
// input, or they would test the normalization instead of the geometry.

function usable(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : undefined;
}

function padOf(style: LayoutStyle): { x: number; y: number } {
  const floor = (v: number | undefined) => Math.max(0, usable(v) ?? 0);
  if (style.padding === undefined) return { x: 0, y: 0 };
  if (typeof style.padding === "number")
    return { x: floor(style.padding), y: floor(style.padding) };
  return { x: floor(style.padding.x), y: floor(style.padding.y) };
}

function usableRatio(style: LayoutStyle): number | undefined {
  const r = style.aspectRatio;
  return typeof r === "number" && Number.isFinite(r) && r > 0 ? r : undefined;
}

/** A node's declared size along an axis, after the engine's own normalization. */
function declaredSize(style: LayoutStyle, axis: Axis): number | undefined {
  return usable(axis === "row" ? style.width : style.height);
}

/**
 * Whether the node's main size was content-derived: no declared main size,
 * and no ratio coupling that resolves it from a definite cross size. Only
 * such a node can satisfy the sum-children arithmetic as an equality — a
 * definite container may have air left over. Nested nodes always receive a
 * definite box from the recursion, so in practice this fires at the root;
 * it is derived, not hardcoded, so a future engine that hands children
 * indefinite constraints keeps the check.
 */
function isContentMain(
  style: LayoutStyle,
  mainConstraint: DimensionConstraint,
  crossConstraint: DimensionConstraint,
): boolean {
  if (declaredSize(style, style.axis) !== undefined) return false;
  const cross = style.axis === "row" ? "column" : "row";
  const ratio = usableRatio(style);
  const crossKnown =
    declaredSize(style, cross) !== undefined || crossConstraint.mode === "definite";
  if (ratio !== undefined && crossKnown) return false;
  return mainConstraint.mode !== "definite";
}

interface Mismatch {
  path: string;
  detail: string;
}

function walkAll(
  node: LayoutNode,
  out: ComputedNode,
  widthC: DimensionConstraint,
  heightC: DimensionConstraint,
  path: string,
  visit: (frame: {
    node: LayoutNode;
    out: ComputedNode;
    widthC: DimensionConstraint;
    heightC: DimensionConstraint;
    path: string;
  }) => void,
): void {
  visit({ node, out, widthC, heightC, path });
  const kids = node.children ?? [];
  const outs = out.children ?? [];
  const n = Math.min(kids.length, outs.length);
  for (let i = 0; i < n; i += 1) {
    // The engine hands every child a definite box on both axes — the
    // recursion's contract. A length mismatch is itself a failure, caught by
    // the structural property.
    const definiteBox: DimensionConstraint = { mode: "definite", size: 0 };
    walkAll(kids[i]!, outs[i]!, definiteBox, definiteBox, `${path}/${String(i)}`, visit);
  }
}

const structuralCheck = (node: LayoutNode, out: ComputedNode, path: string): Mismatch[] => {
  const issues: Mismatch[] = [];
  if ((node.children?.length ?? 0) !== (out.children?.length ?? 0)) {
    issues.push({
      path,
      detail: `child count: input ${String(node.children?.length ?? 0)}, output ${String(out.children?.length ?? 0)}`,
    });
  }
  if (node.id !== undefined && out.id !== node.id) {
    issues.push({ path, detail: `id: input ${node.id}, output ${String(out.id)}` });
  }
  return issues;
};

// --- the properties --------------------------------------------------------

describe("layout invariants", () => {
  it("is pure: it never mutates the input, a deep clone computes the identical tree, and a second run changes nothing", () => {
    fc.assert(
      fc.property(caseArb, ({ tree, available }) => {
        const before = structuredClone(tree);
        const first = layout(tree, available);
        expect(tree).toEqual(before);
        expect(layout(structuredClone(tree), available)).toEqual(first);
        expect(layout(tree, available)).toEqual(first);
      }),
      { numRuns: 250 },
    );
  });

  it("emits only finite sizes — no NaN, no Infinity, nothing negative — and finite positions", () => {
    fc.assert(
      fc.property(caseArb, ({ tree, available }) => {
        const issues: Mismatch[] = [];
        const check = (out: ComputedNode, path: string): void => {
          for (const [field, value] of [
            ["width", out.width],
            ["height", out.height],
            ["left", out.left],
            ["top", out.top],
          ] as const) {
            if (!Number.isFinite(value)) {
              issues.push({ path, detail: `${field} is not finite: ${String(value)}` });
            }
          }
          // Positions may be negative — a centered overflowing line carries
          // information in a negative offset. Sizes may not.
          if (out.width < 0 || out.height < 0) {
            issues.push({
              path,
              detail: `negative size: ${String(out.width)}x${String(out.height)}`,
            });
          }
          (out.children ?? []).forEach((child, i) => {
            check(child, `${path}/${String(i)}`);
          });
        };
        check(layout(tree, available), "root");
        expect(issues).toEqual([]);
      }),
      { numRuns: 250 },
    );
  });

  it("respects each node's own declared min/max bounds, min winning over max", () => {
    fc.assert(
      fc.property(caseArb, ({ tree, available }) => {
        const issues: Mismatch[] = [];
        walkAll(
          tree,
          layout(tree, available),
          available.width,
          available.height,
          "root",
          ({ node, out, path }) => {
            const min = usable(node.style.minWidth);
            const max = usable(node.style.maxWidth);
            if (min !== undefined && out.width < min - EPSILON) {
              issues.push({
                path,
                detail: `width ${String(out.width)} below declared min ${String(min)}`,
              });
            }
            if (
              max !== undefined &&
              (min === undefined || min <= max) &&
              out.width > max + EPSILON
            ) {
              issues.push({
                path,
                detail: `width ${String(out.width)} above declared max ${String(max)}`,
              });
            }
          },
        );
        expect(issues).toEqual([]);
      }),
      { numRuns: 250 },
    );
  });

  it("reports hadOverflow exactly when some child's box exceeds the node's content box on either axis", () => {
    fc.assert(
      fc.property(caseArb, ({ tree, available }) => {
        const issues: Mismatch[] = [];
        walkAll(
          tree,
          layout(tree, available),
          available.width,
          available.height,
          "root",
          ({ node, out, path }) => {
            const pad = padOf(node.style);
            const contentW = out.width - 2 * pad.x;
            const contentH = out.height - 2 * pad.y;
            const exceeds = (out.children ?? []).some(
              (child) =>
                child.left < -EPSILON ||
                child.top < -EPSILON ||
                child.left + child.width > contentW + EPSILON ||
                child.top + child.height > contentH + EPSILON,
            );
            if (exceeds !== out.hadOverflow) {
              issues.push({
                path,
                detail: `hadOverflow ${String(out.hadOverflow)} but recomputed ${String(exceeds)}`,
              });
            }
          },
        );
        expect(issues).toEqual([]);
      }),
      { numRuns: 250 },
    );
  });

  it("never overflows a line on its main axis when every child can shrink and the children's minimum sizes fit", () => {
    // The converse of honesty: the flag and the geometry can agree about an
    // overflow that should never have happened — a line whose children all
    // carry CSS's default shrink, and whose minimum sizes fit the content
    // box, must end up inside it. This is the property a "forgot to subtract
    // padding from the line's space" mutation breaks while honesty stays
    // green, which is why it exists separately.
    fc.assert(
      fc.property(caseArb, ({ tree, available }) => {
        const issues: Mismatch[] = [];
        walkAll(
          tree,
          layout(tree, available),
          available.width,
          available.height,
          "root",
          ({ node, out, path }) => {
            const kids = node.children ?? [];
            const outs = out.children ?? [];
            if (kids.length === 0) return;
            // A child that cannot shrink keeps its base size, which the
            // output does not carry — the guarantee only covers lines where
            // every child can give space back (usable shrink, undefined = 1).
            const shrinkOfStyle = (s: LayoutStyle) => Math.max(0, usable(s.flexShrink) ?? 1);
            if (!kids.every((kid) => shrinkOfStyle(kid.style) > 0)) return;
            // Conflicting min>max bounds (finding 3) and main-axis clamps
            // (finding 4) once had to be excluded here; both guards are gone —
            // the distribution now runs inside the clamped box and freezes at
            // the child's own clamp order, and this property holds over the
            // whole generator space again. The regression pins below keep the
            // two shrunk inputs from ever regrowing silently.
            const axis = node.style.axis;
            // The distribution bounds use minWidth on rows only — the IR has
            // no minHeight — so a column line's floor is 0 by definition.
            const floorOf = (kid: LayoutNode) =>
              axis === "row" ? (usable(kid.style.minWidth) ?? 0) : 0;
            const gap = Math.max(0, usable(node.style.gap) ?? 0);
            const minExtent =
              kids.reduce((sum, kid) => sum + floorOf(kid), 0) + gap * (kids.length - 1);
            const pad = padOf(node.style);
            const contentMain =
              (axis === "row" ? out.width : out.height) - 2 * (axis === "row" ? pad.x : pad.y);
            if (minExtent > contentMain + EPSILON) return; // overflow is the minimums' fault, lawfully
            const mainExceeded = outs.some((child) =>
              axis === "row"
                ? child.left + child.width > contentMain + EPSILON
                : child.top + child.height > contentMain + EPSILON,
            );
            if (mainExceeded) {
              issues.push({
                path,
                detail: `line overflows its ${axis} content box (${String(contentMain)}) though minimum sizes fit (${String(minExtent)})`,
              });
            }
          },
        );
        expect(issues).toEqual([]);
      }),
      { numRuns: 250 },
    );
  });

  it("sizes a content-derived, start-justified, non-overflowing container to exactly its children plus gaps plus padding", () => {
    fc.assert(
      fc.property(caseArb, ({ tree, available }) => {
        const issues: Mismatch[] = [];
        walkAll(
          tree,
          layout(tree, available),
          available.width,
          available.height,
          "root",
          ({ node, out, widthC, heightC, path }) => {
            if ((out.children?.length ?? 0) === 0) return;
            const mainC = node.style.axis === "row" ? widthC : heightC;
            const justify = node.style.justifyContent ?? "start";
            // A definite container keeps its size regardless of content, and
            // center/end justification insets the line inside it; either way
            // the sum is a bound, not an equality. Conflicting min>max on the
            // node itself clamps the outer size away from the content (finding
            // 3's sibling), so only unclamped containers are asserted.
            if (justify !== "start" || out.hadOverflow) return;
            const hasMainClamp =
              usable(node.style.minWidth) !== undefined ||
              usable(node.style.maxWidth) !== undefined;
            const crossC = node.style.axis === "row" ? heightC : widthC;
            if (hasMainClamp || !isContentMain(node.style, mainC, crossC)) return;
            const pad = padOf(node.style);
            const mainPad = 2 * (node.style.axis === "row" ? pad.x : pad.y);
            const gap = Math.max(0, usable(node.style.gap) ?? 0);
            const kids = out.children ?? [];
            const sumMain =
              kids.reduce(
                (sum, child) => sum + (node.style.axis === "row" ? child.width : child.height),
                0,
              ) +
              gap * (kids.length - 1);
            const outerMain = node.style.axis === "row" ? out.width : out.height;
            if (Math.abs(outerMain - (sumMain + mainPad)) > 1e-4) {
              issues.push({
                path,
                detail: `content-derived main size ${String(outerMain)} != children+gaps+padding ${String(sumMain + mainPad)}`,
              });
            }
          },
        );
        expect(issues).toEqual([]);
      }),
      { numRuns: 250 },
    );
  });

  it("couples the axes of a ratio-declaring node that declares no cross size: the width is the clamped transfer of height × ratio", () => {
    fc.assert(
      fc.property(caseArb, ({ tree, available }) => {
        const issues: Mismatch[] = [];
        walkAll(
          tree,
          layout(tree, available),
          available.width,
          available.height,
          "root",
          ({ node, out, path, widthC, heightC }) => {
            const ratio = usableRatio(node.style);
            if (ratio === undefined) return;
            const main = node.style.axis;
            const cross: Axis = main === "row" ? "column" : "row";
            if (declaredSize(node.style, cross) !== undefined) return; // both axes stated: the ratio is inert by CSS
            // A nested node's box is assigned by its parent's line: the
            // parent may redistribute the axis parallel to its own main and
            // honor the node's declared size on the other, which lawfully
            // decouples the pair — CSS's shrink does the same to an item
            // with aspect-ratio. The coupling is only guaranteed for nodes
            // that declare nothing and are sized by the ratio itself, or
            // for the root, which nothing reassigns.
            const isRoot = path === "root";
            if (!isRoot && declaredSize(node.style, main) !== undefined) return;
            // The IR's own contract (style.ts) is that the ratio couples
            // only "after either one resolves" — with no declared size and
            // no definite offer on either axis, nothing resolves and the
            // ratio is legitimately inert.
            const anyAxisResolves =
              declaredSize(node.style, "row") !== undefined ||
              declaredSize(node.style, "column") !== undefined ||
              widthC.mode === "definite" ||
              heightC.mode === "definite";
            if (!anyAxisResolves) return;
            // Finding 5 (found by the re-enabled generators; since Phase 4B
            // pinned below as the modelled contract rather than fixed away —
            // MODELLED_SUBSET.absences.BOTH_AXES_DEFINITE_RATIO records it
            // as declared scope): when BOTH axes fill from definite
            // constraints at once and no style size is declared, the engine
            // never re-consults the ratio — a declared style size mixed with
            // a constraint fill couples on every other path.
            // Nested nodes are exempt from this guard: their pair is
            // assigned by the parent's cross derivation, which does couple.
            if (
              isRoot &&
              widthC.mode === "definite" &&
              heightC.mode === "definite" &&
              declaredSize(node.style, "row") === undefined &&
              declaredSize(node.style, "column") === undefined
            ) {
              return;
            }
            if (out.height <= 0 || out.width <= 0) return; // a zero edge has no ratio to keep
            // The clamp-before-transfer fix (adversarial finding A) made the
            // coupling exact in the one direction the old exemption
            // wholesale skipped, so the exemption is gone. What replaces it
            // is the full CSS law, which covers both directions the clamp
            // can bind: a clamp on the SOURCE width transfers (the derived
            // height follows the clamped width, ratio kept), and a clamp on
            // the DERIVED width caps the transfer itself (ratio lawfully
            // broken — `height: 300, maxWidth: 120, aspectRatio: 2` is
            // 120×300 in a browser, not 600×300). One statement holds for
            // both: the reported width is exactly the clamped transfer of
            // the reported height through the ratio.
            const transferred = clampSize(
              out.height * ratio,
              node.style.minWidth,
              node.style.maxWidth,
            );
            if (Math.abs(out.width - transferred) > 1e-4) {
              issues.push({
                path,
                detail: `width ${String(out.width)} != clamped transfer ${String(transferred)} (height ${String(out.height)} x ratio ${String(ratio)})`,
              });
            }
          },
        );
        expect(issues).toEqual([]);
      }),
      { numRuns: 250 },
    );
  });

  it("pins finding 5 as the modelled contract: the ratio is inert when both axes resolve without it", () => {
    // Finding 5 reached this suite as a generator guard with an analysis
    // comment; Phase 4B makes the analysis the assertion. A change that
    // "closes the gap" by re-consulting the ratio in the both-definite case
    // reddens this pin — deliberately, because the semantics it would pick
    // were deferred, not lost, and no adapter reaches the case (the route's
    // height offer is always max-content).
    const offered: AvailableSpace = {
      width: { mode: "definite", size: 500 },
      height: { mode: "definite", size: 400 },
    };
    // Both axes fill from the definite constraints: 500x400, ratio 2 unheard.
    const inert = layout({ style: { axis: "row", aspectRatio: 2 } }, offered);
    expect([inert.width, inert.height]).toEqual([500, 400]);
    // The same ratio couples on every path where exactly one axis resolves —
    // here a declared height against the definite width the box would
    // otherwise fill: 100 x 2 = 200.
    const coupled = layout({ style: { axis: "row", aspectRatio: 2, height: 100 } }, offered);
    expect([coupled.width, coupled.height]).toEqual([200, 100]);
  });

  it("places each following child exactly one gap past the previous child's reported size — the line's cursor agrees with the boxes it placed", () => {
    fc.assert(
      fc.property(caseArb, ({ tree, available }) => {
        const issues: Mismatch[] = [];
        walkAll(
          tree,
          layout(tree, available),
          available.width,
          available.height,
          "root",
          ({ node, out, path }) => {
            const kids = out.children ?? [];
            if (kids.length < 2) return;
            // Conflicting min>max bounds once forced a guard here (finding 3);
            // the grow pass now freezes at the child's own clamp order, so
            // adjacency holds over every generated line again.
            const gap = Math.max(0, usable(node.style.gap) ?? 0);
            for (let i = 0; i < kids.length - 1; i += 1) {
              const a = kids[i]!;
              const b = kids[i + 1]!;
              // Both offsets carry the line's shared leading edge — 0 for
              // start, the justify inset for center/end — so it cancels in
              // the difference: adjacency must hold under every justify.
              const [aMainPos, aMainSize, bMainPos] =
                node.style.axis === "row" ? [a.left, a.width, b.left] : [a.top, a.height, b.top];
              if (Math.abs(bMainPos - (aMainPos + aMainSize + gap)) > EPSILON) {
                issues.push({
                  path: `${path}/${String(i + 1)}`,
                  detail: `main offset ${String(bMainPos)} != previous box + gap ${String(aMainPos + aMainSize + gap)}`,
                });
              }
            }
          },
        );
        expect(issues).toEqual([]);
      }),
      { numRuns: 250 },
    );
  });

  it("treats a degenerate aspectRatio — ≤0, NaN, ±Infinity — exactly as no ratio at all", () => {
    const withInjectablePath = treeArb(3).chain((tree) =>
      fc.array(fc.integer({ min: 0, max: 3 }), { maxLength: 3 }).map((path) => ({ tree, path })),
    );
    fc.assert(
      fc.property(
        withInjectablePath,
        fc.constantFrom(0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
        ({ tree, path }, degenerate) => {
          const nodeAt = (t: LayoutNode): LayoutNode | undefined =>
            path.length === 0 ? t : nodeAtPath(t, path, 0);
          // Recomputed imperatively to avoid a `filter` discarding most
          // paths; walk once and bail out on a miss.
          const target = nodeAt(tree);
          if (target === undefined) return true;
          const mapKids = (t: LayoutNode, f: (kid: LayoutNode) => LayoutNode): LayoutNode =>
            t.children === undefined ? t : { ...t, children: t.children.map(f) };
          const inject = (t: LayoutNode): LayoutNode =>
            t === target
              ? { ...t, style: { ...t.style, aspectRatio: degenerate } }
              : mapKids(t, inject);
          const strip = (t: LayoutNode): LayoutNode => {
            if (t === target) {
              // Key omitted rather than set to undefined — the IR's optional
              // properties never carry an explicit undefined.
              const { aspectRatio: _dropped, ...style } = t.style;
              return { ...t, style };
            }
            return mapKids(t, strip);
          };
          const available: AvailableSpace = {
            width: { mode: "definite", size: 500 },
            height: { mode: "definite", size: 400 },
          };
          expect(layout(inject(tree), available)).toEqual(layout(strip(tree), available));
          return true;
        },
      ),
      { numRuns: 250 },
    );
  });

  it("sizes by content under a max-content main constraint, start-justified: the container is its content, no more", () => {
    // The dedicated max-content sizing property. The general generators now
    // cover every justification against max-content (finding 1 is fixed);
    // this one stays start-only because its law is stated for the
    // degenerate case CSS itself picks — under an unbounded offer, start is
    // what center and end collapse to, and a min-clamped box may exceed its
    // content, which the content-derived guard below already excludes.
    const startCaseArb = treeArb(3)
      .filter((tree) => (tree.style.justifyContent ?? "start") === "start")
      .chain((tree) =>
        fc
          .record({
            width:
              tree.style.axis === "row"
                ? maxContentArb
                : fc.oneof(definiteArb, fitArb, maxContentArb),
            height:
              tree.style.axis === "row"
                ? fc.oneof(definiteArb, fitArb, maxContentArb)
                : maxContentArb,
          })
          .map((available) => ({ tree, available })),
      );
    fc.assert(
      fc.property(startCaseArb, ({ tree, available }) => {
        const issues: Mismatch[] = [];
        const out = layout(tree, available);
        const pad = padOf(tree.style);
        const gap = Math.max(0, usable(tree.style.gap) ?? 0);
        const kids = out.children ?? [];
        const axis = tree.style.axis;
        const sumMain =
          kids.reduce((sum, child) => sum + (axis === "row" ? child.width : child.height), 0) +
          gap * Math.max(0, kids.length - 1);
        const outerMain = axis === "row" ? out.width : out.height;
        const mainPad = 2 * (axis === "row" ? pad.x : pad.y);
        // Unclamped AND content-derived only: min/max on the container's
        // main axis legitimately moves the outer size away from the content
        // sum, and a main size the ratio derived from a definite cross size
        // is not the content's at all (width: h × ratio wins).
        const clamped =
          usable(tree.style.minWidth) !== undefined || usable(tree.style.maxWidth) !== undefined;
        const mainC = axis === "row" ? available.width : available.height;
        const crossC = axis === "row" ? available.height : available.width;
        const contentDerived = isContentMain(tree.style, mainC, crossC);
        if (!clamped && contentDerived && Math.abs(outerMain - (sumMain + mainPad)) > 1e-4) {
          issues.push({
            path: "root",
            detail: `max-content main size ${String(outerMain)} != content ${String(sumMain + mainPad)}`,
          });
        }
        expect(issues).toEqual([]);
      }),
      { numRuns: 250 },
    );
  });

  it("keeps the output structurally faithful: child counts and ids survive the computation", () => {
    fc.assert(
      fc.property(caseArb, ({ tree, available }) => {
        const issues: Mismatch[] = [];
        const check = (node: LayoutNode, out: ComputedNode, path: string): void => {
          issues.push(...structuralCheck(node, out, path));
          const kids = node.children ?? [];
          const outs = out.children ?? [];
          for (let i = 0; i < Math.min(kids.length, outs.length); i += 1) {
            check(kids[i]!, outs[i]!, `${path}/${String(i)}`);
          }
        };
        check(tree, layout(tree, available), "root");
        expect(issues).toEqual([]);
      }),
      { numRuns: 250 },
    );
  });

  it("never shrinks a child when the offered main space grows", () => {
    // Space monotonicity of the line. The distribution's freeze makes this
    // non-trivial — a saturated child stops absorbing deficit — but a base
    // is clamped by the child's own min before distribution
    // (hypotheticalSize), so saturation already sits inside the base and
    // cannot reorder offers: the property holds over the whole generator
    // space with no guard, verified across seeds and tens of thousands of
    // generated trees before it was committed. Tolerance is the engine's own
    // EPSILON: the two runs divide by different totals, and the proportional
    // dust of one need not match the other's.
    fc.assert(
      fc.property(treeArb(3), availSizeArb, availSizeArb, (tree, first, more) => {
        const axis = tree.style.axis;
        const avail = (size: number): AvailableSpace =>
          axis === "row"
            ? { width: { mode: "definite", size }, height: { mode: "max-content" } }
            : { width: { mode: "max-content" }, height: { mode: "definite", size } };
        const before = layout(tree, avail(first)).children ?? [];
        const after = layout(tree, avail(first + more)).children ?? [];
        const issues: Mismatch[] = [];
        for (let i = 0; i < Math.min(before.length, after.length); i += 1) {
          const smaller = axis === "row" ? (before[i]?.width ?? 0) : (before[i]?.height ?? 0);
          const larger = axis === "row" ? (after[i]?.width ?? 0) : (after[i]?.height ?? 0);
          if (larger < smaller - EPSILON) {
            issues.push({
              path: `child ${String(i)}`,
              detail: `${String(larger)} at space ${String(first + more)} < ${String(smaller)} at space ${String(first)}`,
            });
          }
        }
        expect(issues).toEqual([]);
      }),
      { numRuns: 250 },
    );
  });

  it("conserves space on a fully active line: the children sum exactly to the content box", () => {
    // The distribution's equality face. The guards carve where conservation
    // is the LAW rather than a coincidence: every child shrinkable and some
    // child growing, so whichever regime the line lands in, its pass runs to
    // completion; no child clamp, basis or ratio re-deriving a base; no
    // container clamp; a gapless line — gaps are not distributable (CSS does
    // not shrink a gap either), so a gapped deficit lawfully ends in
    // overflow, not conservation; padding that fits the box, since the
    // larger-padding collapse is MODELLED_SUBSET.absences
    // .PADDING_LARGER_THAN_BOX, a recorded pathology and not a law to
    // assert. Tolerance EPSILON: the pass divides by the active totals, and
    // the sum carries that division's dust.
    fc.assert(
      fc.property(treeArb(3), definiteArb, definiteArb, (tree, w, h) => {
        const axis = tree.style.axis;
        const kids = tree.children ?? [];
        if (kids.length === 0) return;
        const shrinkable = kids.every((kid) => Math.max(0, usable(kid.style.flexShrink) ?? 1) > 0);
        const growTotal = kids.reduce(
          (sum, kid) => sum + Math.max(0, usable(kid.style.flexGrow) ?? 0),
          0,
        );
        const rebased = kids.some(
          (kid) =>
            kid.style.minWidth !== undefined ||
            kid.style.maxWidth !== undefined ||
            kid.style.flexBasis !== undefined ||
            kid.style.aspectRatio !== undefined,
        );
        const containerClamped =
          tree.style.minWidth !== undefined ||
          tree.style.maxWidth !== undefined ||
          tree.style.aspectRatio !== undefined;
        const gap = Math.max(0, usable(tree.style.gap) ?? 0);
        const pad = padOf(tree.style);
        const mainPad = 2 * (axis === "row" ? pad.x : pad.y);
        const declaredMain = usable(axis === "row" ? tree.style.width : tree.style.height);
        const mainKnown = declaredMain ?? (axis === "row" ? w.size : h.size);
        if (
          !shrinkable ||
          growTotal <= 0 ||
          rebased ||
          containerClamped ||
          gap !== 0 ||
          mainKnown - mainPad < 0
        ) {
          return;
        }
        const mainSpace = Math.max(0, mainKnown - mainPad);
        const outs = layout(tree, { width: w, height: h }).children ?? [];
        const sumMain = outs.reduce(
          (sum, child) => sum + (axis === "row" ? child.width : child.height),
          0,
        );
        expect(Math.abs(sumMain - mainSpace)).toBeLessThanOrEqual(EPSILON);
      }),
      { numRuns: 250 },
    );
  });

  it("degenerates center and end justification to start when the main size is content-derived", () => {
    // layout.test.ts pins the degeneration for one fixture; this is the law
    // it instances. Under an unbounded offer the line IS the content, so
    // there is no free space to inset: whatever start places, center and end
    // must place identically. The guards exclude a declared or clamped main
    // size — there the inset is real — and a ratio coupling that resolves
    // the main size from a definite cross one. Tolerance EPSILON: the two
    // runs compute the same line through different leading-edge arithmetic,
    // and expression-order dust is what the tolerance is for.
    fc.assert(
      fc.property(
        treeArb(3).filter((tree) => (tree.style.justifyContent ?? "start") !== "start"),
        (tree) => {
          const axis = tree.style.axis;
          const cross: Axis = axis === "row" ? "column" : "row";
          const mainDeclared =
            usable(axis === "row" ? tree.style.width : tree.style.height) !== undefined ||
            tree.style.minWidth !== undefined ||
            tree.style.maxWidth !== undefined ||
            tree.style.aspectRatio !== undefined;
          const crossCoupled =
            usable(cross === "row" ? tree.style.width : tree.style.height) !== undefined &&
            tree.style.aspectRatio !== undefined;
          if (mainDeclared || crossCoupled) return;
          const unbounded: AvailableSpace = {
            width: { mode: "max-content" },
            height: { mode: "max-content" },
          };
          const asIs = layout(tree, unbounded);
          const start = layout(
            { ...tree, style: { ...tree.style, justifyContent: "start" } },
            unbounded,
          );
          const issues: Mismatch[] = [];
          expectWithin(asIs, start, "root", issues);
          expect(issues).toEqual([]);
        },
      ),
      { numRuns: 250 },
    );
  });

  it("keeps the output's id sequence equal to the input's preorder — distribution never reorders a line", () => {
    // The structural property checks ids only where both trees have a node
    // at the same position, and the generators never set ids — so it could
    // not see a reordering. This one stamps every node with a unique
    // preorder id and holds the OUTPUT's id sequence to the input's: child
    // order is document order on every axis, in every constraint mode.
    // Exact, not tolerant: ids are strings echoed verbatim, and sequence
    // identity is not an arithmetic claim.
    fc.assert(
      fc.property(treeArb(3), dimArb, dimArb, (tree, w, h) => {
        const stamped = decorate(tree, "n");
        const inIds: string[] = [];
        const walk = (node: LayoutNode): void => {
          if (node.id !== undefined) inIds.push(node.id);
          for (const kid of node.children ?? []) walk(kid);
        };
        walk(stamped);
        expect(preorderIds(layout(stamped, { width: w, height: h }))).toEqual(inIds);
      }),
      { numRuns: 250 },
    );
  });

  it("is transparent to a pass-through wrapper: wrapping a subtree changes nothing", () => {
    // A node whose only work is to measure its child and hand the child its
    // own box must not perturb it — the recursion's contract, stated as a
    // law (Center's synthetic centering row is the consumer-facing instance).
    // The excluded subtree roots are the two fields the wrapper itself
    // consumes: a basis is the wrapper's distribution base, and a ratio
    // derives the root's cross size from the box the WRAPPER assigned, while
    // the direct run derives it from the constraint — both differences are
    // the wrapper doing its job, not a defect. Tolerance EPSILON: the two
    // runs derive the same numbers through different expressions.
    fc.assert(
      fc.property(treeArb(3), (subtree) => {
        if (subtree.style.aspectRatio !== undefined) return;
        if (subtree.style.flexBasis !== undefined) return;
        const unbounded: AvailableSpace = {
          width: { mode: "max-content" },
          height: { mode: "max-content" },
        };
        const direct = layout(subtree, unbounded);
        const wrapped = layout(
          { style: { axis: subtree.style.axis }, children: [subtree] },
          unbounded,
        );
        const inner = wrapped.children ?? [];
        const issues: Mismatch[] = [];
        if (inner.length !== 1) {
          issues.push({
            path: "wrapper",
            detail: `expected the wrapper to keep one child, got ${String(inner.length)}`,
          });
        } else {
          expectWithin(inner[0]!, direct, "subtree", issues);
        }
        expect(issues).toEqual([]);
      }),
      { numRuns: 250 },
    );
  });

  it("treats padding as translation: declare padding p, grow the offer by 2p, and no child moves", () => {
    // With the container undeclared and unclamped, the box grows with the
    // offer and the padding rides outside the content box — the children's
    // geometry is identical to the unpadded run in the smaller offer. What
    // is excluded is everything that pins the box (a declared size does not
    // grow, so the padding would eat into it) and the recorded pathology
    // where padding exceeds the box (MODELLED_SUBSET.absences
    // .PADDING_LARGER_THAN_BOX). Tolerance EPSILON, for the same
    // expression-order dust as the wrapper property.
    fc.assert(
      fc.property(treeArb(2), padArb, padArb, availSizeArb, availSizeArb, (tree, p, q, w, h) => {
        const axis = tree.style.axis;
        const pinned =
          tree.style.width !== undefined ||
          tree.style.height !== undefined ||
          tree.style.minWidth !== undefined ||
          tree.style.maxWidth !== undefined ||
          tree.style.aspectRatio !== undefined ||
          tree.style.padding !== undefined;
        if (pinned) return;
        const padX = axis === "row" ? p : q;
        const padY = axis === "row" ? q : p;
        const avail = (width: number, height: number): AvailableSpace => ({
          width: { mode: "definite", size: width },
          height: { mode: "definite", size: height },
        });
        const base = layout(tree, avail(w, h));
        // exactOptionalPropertyTypes: a leaf's `children` is absent, not
        // undefined, so the field spreads in only when the tree carries one.
        const padded = layout(
          {
            style: { ...tree.style, padding: { x: padX, y: padY } },
            ...(tree.children === undefined ? {} : { children: tree.children }),
          },
          avail(w + 2 * padX, h + 2 * padY),
        );
        const issues: Mismatch[] = [];
        expectWithin(padded, base, "root", issues);
        expect(issues).toEqual([]);
      }),
      { numRuns: 250 },
    );
  });

  it("regression pins: the four shrunk inputs that found the engine's defects, frozen with their CSS-expected geometry", () => {
    // The Yoga discipline: a counterexample that revealed a real defect
    // becomes a committed fixture. Each pin below is the minimal input from
    // the findings doc (/tmp/shipworm-reports/05-test-engineer-findings.md),
    // reshaped by hand rather than copied, asserting the geometry CSS would
    // produce — never the engine's accident. A fix that regresses any of
    // these reddens the suite even if the property that found it shrinks
    // differently next time.

    const maxContent = (): AvailableSpace => ({
      width: { mode: "max-content" },
      height: { mode: "max-content" },
    });

    // Finding 1 — justify center under a max-content main constraint once
    // placed children at Infinity and collapsed the box to its padding.
    // CSS: the container's max-content width IS the line; justify
    // degenerates to start.
    const centered = layout(
      {
        style: { axis: "row", gap: 20, justifyContent: "center" },
        children: [
          { style: { axis: "row", width: 140, height: 10, flexShrink: 0 } },
          { style: { axis: "row", width: 60, height: 10, flexShrink: 0 } },
        ],
      },
      maxContent(),
    );
    expect([centered.width, centered.height, centered.hadOverflow]).toEqual([220, 10, false]);
    expect(centered.children?.map((c) => [c.left, c.width])).toEqual([
      [0, 140],
      [160, 60],
    ]);

    // The same line clamped by the container's own max-width stays finite
    // and keeps its information: a centered overflowing line starts past
    // the leading edge.
    const centeredClamped = layout(
      {
        style: { axis: "row", gap: 20, justifyContent: "center", maxWidth: 100 },
        children: [
          { style: { axis: "row", width: 140, height: 10, flexShrink: 0 } },
          { style: { axis: "row", width: 60, height: 10, flexShrink: 0 } },
        ],
      },
      maxContent(),
    );
    expect([centeredClamped.width, centeredClamped.hadOverflow]).toEqual([100, true]);
    // 220px of line in a 100px box: leading = (100 - 220) / 2 = -60, and the
    // second child follows the first plus the gap: -60 + 140 + 20 = 100.
    expect(centeredClamped.children?.map((c) => c.left)).toEqual([-60, 100]);

    // Finding 2 — flexBasis was declared and never read; a basis-only child
    // collapsed to its content size. CSS: basis is the distribution base,
    // and a declared basis wins over the stated width.
    const basisOnly = layout(
      {
        style: { axis: "row" },
        children: [
          { style: { axis: "row", flexBasis: 250, height: 10 } },
          { style: { axis: "row", width: 100, height: 10, flexShrink: 0 } },
        ],
      },
      { width: { mode: "definite", size: 500 }, height: { mode: "max-content" } },
    );
    expect(basisOnly.children?.[0]?.width).toBe(250);
    expect(basisOnly.children?.[1]?.left).toBe(250);

    const basisOverWidth = layout(
      {
        style: { axis: "row" },
        children: [{ style: { axis: "row", width: 180, flexBasis: 200, height: 10 } }],
      },
      { width: { mode: "definite", size: 400 }, height: { mode: "max-content" } },
    );
    expect(basisOverWidth.children?.[0]?.width).toBe(200);

    const basisWithGrow = layout(
      {
        style: { axis: "row" },
        children: [{ style: { axis: "row", flexBasis: 100, flexGrow: 1, height: 10 } }],
      },
      { width: { mode: "definite", size: 300 }, height: { mode: "max-content" } },
    );
    expect(basisWithGrow.children?.[0]?.width).toBe(300);

    // Finding 3 — conflicting min>max plus grow once froze A at its max
    // while its own recursion restored its min, placing B inside A's box.
    // CSS: the final size is the min (min wins over max), and the line's
    // cursor follows the final size.
    const overlapped = layout(
      {
        style: { axis: "row" },
        children: [
          { style: { axis: "row", flexGrow: 1, minWidth: 200, maxWidth: 100, height: 10 } },
          { style: { axis: "row", width: 50, height: 10, flexShrink: 0 } },
        ],
      },
      { width: { mode: "definite", size: 500 }, height: { mode: "max-content" } },
    );
    const a = overlapped.children?.[0];
    const b = overlapped.children?.[1];
    expect([a?.width, a?.left]).toEqual([200, 0]);
    expect(b?.left).toBe(200);
    // No overlap: the line's cursor advanced past A's final reported size.
    // -1 sentinels make a missing child fail the arithmetic loudly.
    expect((b?.left ?? -1) - ((a?.left ?? -1) + (a?.width ?? -1))).toBe(0);
    expect(overlapped.hadOverflow).toBe(false);

    // Finding 4 — a node's own clamp once never fed back into the line's
    // space: the growable child filled the unclamped offer (114) inside the
    // clamped box (100). CSS: the used width is the clamped one and the
    // item fills exactly it.
    const fitClamped = layout(
      {
        style: { axis: "row", maxWidth: 100 },
        children: [{ style: { axis: "row", flexGrow: 1, height: 10 } }],
      },
      { width: { mode: "fit-content", size: 114 }, height: { mode: "max-content" } },
    );
    expect([fitClamped.width, fitClamped.hadOverflow]).toEqual([100, false]);
    expect(fitClamped.children?.[0]?.width).toBe(100);

    // Under max-content the clamp once meant shrink never engaged at all.
    // CSS: the two 100px items share the clamped 100px box minus the gap.
    const maxContentClamped = layout(
      {
        style: { axis: "row", gap: 20, maxWidth: 100 },
        children: [
          { style: { axis: "row", width: 100, height: 10 } },
          { style: { axis: "row", width: 100, height: 10 } },
        ],
      },
      maxContent(),
    );
    expect([maxContentClamped.width, maxContentClamped.hadOverflow]).toEqual([100, false]);
    expect(maxContentClamped.children?.map((c) => [c.left, c.width])).toEqual([
      [0, 40],
      [60, 40],
    ]);

    // The cross-axis face of the same fix, in my own shape: a column node's
    // own max-width bounds the line it stretches its children into, and a
    // shrink-refusing grandchild overflows that box — recorded, not clipped.
    const crossClamped = layout(
      {
        style: { axis: "column", maxWidth: 60 },
        children: [
          {
            style: { axis: "row", height: 30, flexShrink: 0 },
            children: [{ style: { axis: "row", width: 80, height: 10, flexShrink: 0 } }],
          },
        ],
      },
      { width: { mode: "definite", size: 200 }, height: { mode: "max-content" } },
    );
    expect(crossClamped.width).toBe(60);
    const stretched = crossClamped.children?.[0];
    expect([stretched?.width, stretched?.height, stretched?.hadOverflow]).toEqual([60, 30, true]);
    expect(stretched?.children?.[0]).toMatchObject({ left: 0, top: 0, width: 80, height: 10 });
  });
});

/**
 * Dust-tolerant deep geometry compare: every position and size within
 * EPSILON, `hadOverflow` and the child structure exact. The invariance
 * properties compare two runs that compute the same numbers through
 * different expressions; the tolerance absorbs expression-order dust
 * without loosening any law.
 */
function expectWithin(
  actual: ComputedNode,
  expected: ComputedNode,
  path: string,
  issues: Mismatch[],
): void {
  for (const [field, a, b] of [
    ["left", actual.left, expected.left],
    ["top", actual.top, expected.top],
    ["width", actual.width, expected.width],
    ["height", actual.height, expected.height],
  ] as const) {
    if (Math.abs(a - b) > EPSILON) {
      issues.push({ path, detail: `${field} ${String(a)} != ${String(b)}` });
    }
  }
  if (actual.hadOverflow !== expected.hadOverflow) {
    issues.push({
      path,
      detail: `hadOverflow ${String(actual.hadOverflow)} != ${String(expected.hadOverflow)}`,
    });
  }
  const actualKids = actual.children ?? [];
  const expectedKids = expected.children ?? [];
  if (actualKids.length !== expectedKids.length) {
    issues.push({
      path,
      detail: `child count ${String(actualKids.length)} != ${String(expectedKids.length)}`,
    });
    return;
  }
  for (const [i, kid] of actualKids.entries()) {
    expectWithin(kid, expectedKids[i]!, `${path}/${String(i)}`, issues);
  }
}

/** Stamp every node with its preorder path as a unique id. */
function decorate(node: LayoutNode, path: string): LayoutNode {
  const kids = node.children ?? [];
  return {
    id: path,
    style: node.style,
    ...(kids.length > 0
      ? { children: kids.map((kid, i) => decorate(kid, `${path}/${String(i)}`)) }
      : {}),
  };
}

/** The output's ids, in the order the output tree carries them. */
function preorderIds(out: ComputedNode): string[] {
  const ids: string[] = [];
  const walk = (node: ComputedNode): void => {
    if (node.id !== undefined) ids.push(node.id);
    for (const kid of node.children ?? []) walk(kid);
  };
  walk(out);
  return ids;
}

describe("clampSize, the constraint primitive", () => {
  // The edge normalizer's own laws, held on the primitive rather than
  // through layout's outputs. Every law is EXACT — clampSize returns one of
  // its operands (max and min introduce no arithmetic), so a tolerance could
  // only hide a defect. The generators include the hostiles finite()
  // exists to absorb, because NaN and ±Infinity are ordinary inputs here,
  // not error cases.
  const numberArb = fc.oneof(
    fc.constant(Number.NaN),
    fc.constant(Number.POSITIVE_INFINITY),
    fc.constant(Number.NEGATIVE_INFINITY),
    fc.double({ noNaN: false }),
    fc.integer(),
  );
  const boundArb = opt(numberArb);

  it("returns a finite, non-negative size for every input, including NaN and ±Infinity", () => {
    fc.assert(
      fc.property(numberArb, boundArb, boundArb, (size, min, max) => {
        const out = clampSize(size, min, max);
        expect(Number.isFinite(out)).toBe(true);
        expect(out).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 250 },
    );
  });

  it("is idempotent — clamping an already-clamped size changes nothing", () => {
    fc.assert(
      fc.property(numberArb, boundArb, boundArb, (size, min, max) => {
        expect(clampSize(clampSize(size, min, max), min, max)).toBe(clampSize(size, min, max));
      }),
      { numRuns: 250 },
    );
  });

  it("is monotone in the size", () => {
    // NaN is excluded, not tolerated: it has no ordering, and its
    // finiteness is the first law's business.
    fc.assert(
      fc.property(numberArb, numberArb, boundArb, boundArb, (a, b, min, max) => {
        if (!Number.isFinite(a) || !Number.isFinite(b) || a > b) return;
        expect(clampSize(b, min, max)).toBeGreaterThanOrEqual(clampSize(a, min, max));
      }),
      { numRuns: 250 },
    );
  });

  it("applies min after max: a finite min is a floor, a finite max a ceiling — unless the min overrules it", () => {
    // Conditional bounds assert by throwing — the fast-check idiom — so the
    // violation rides the counterexample report instead of a conditional
    // expect.
    fc.assert(
      fc.property(numberArb, boundArb, boundArb, (size, min, max) => {
        const out = clampSize(size, min, max);
        const finiteMin = min !== undefined && Number.isFinite(min) ? Math.max(0, min) : undefined;
        const finiteMax = max !== undefined && Number.isFinite(max) ? Math.max(0, max) : undefined;
        if (finiteMin !== undefined && out < finiteMin) {
          throw new Error(`below floor: ${String(out)} < ${String(finiteMin)}`);
        }
        if (finiteMax !== undefined && (finiteMin === undefined || finiteMin <= finiteMax)) {
          if (out > finiteMax) {
            throw new Error(`above ceiling: ${String(out)} > ${String(finiteMax)}`);
          }
        }
        // Unconditional, and implied by the bounds themselves: non-negativity
        // is the one part of the clamp this law can state as an assertion.
        expect(out).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 250 },
    );
  });
});

// Path walk for the degenerate-ratio property: descend one branch by child
// index per step; undefined when the branch does not exist.
function nodeAtPath(t: LayoutNode, path: readonly number[], i: number): LayoutNode | undefined {
  const step = path[i];
  if (step === undefined) return t;
  const kid = t.children?.[step];
  return kid === undefined ? undefined : nodeAtPath(kid, path, i + 1);
}
