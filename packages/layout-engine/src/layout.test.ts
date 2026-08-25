import { describe, expect, it } from "vitest";
import { layout, type ComputedNode } from "./layout";
import type { AvailableSpace } from "./constraint";
import type { LayoutNode, LayoutStyle } from "./style";

// Every expectation below is arithmetic a reviewer can do in their head —
// that is the point of this suite. The fixtures are hand-computed geometry
// for one line of flexbox; the conformance route is what holds the same
// algorithm equal to a real browser, and the invariants suite is what holds
// it lawful over generated trees. Here, each number is chosen so the rule
// that produced it is the only rule that could have.

/** A fixed-size child box. flexShrink stays unset: CSS's default 1 is part of what is pinned. */
const box = (width: number, height: number, extra: Partial<LayoutStyle> = {}): LayoutNode => ({
  // A leaf's axis is inert — required by the IR, read by nobody.
  style: { axis: "row", width, height, ...extra },
});

/** Definite width, content-decided height — the shape an auto-height container offers. */
const inAutoHeight = (width: number): AvailableSpace => ({
  width: { mode: "definite", size: width },
  height: { mode: "max-content" },
});

/** The {left, top, width, height} of a computed node, for line-by-line expects. */
const boxOf = (node: ComputedNode): [number, number, number, number] => [
  node.left,
  node.top,
  node.width,
  node.height,
];

/** The i-th computed child, asserting presence so the expects below read without fallbacks. */
function child(node: ComputedNode, i: number): ComputedNode {
  const c = node.children?.[i];
  if (!c) throw new Error(`missing child ${String(i)}`);
  return c;
}

const row = (style: Partial<LayoutStyle>, ...children: LayoutNode[]): LayoutNode => ({
  style: { axis: "row", ...style },
  children,
});

const column = (style: Partial<LayoutStyle>, ...children: LayoutNode[]): LayoutNode => ({
  style: { axis: "column", ...style },
  children,
});

describe("layout", () => {
  it("places fixed children along the row with the gap between each pair", () => {
    const out = layout(
      row({ gap: 12 }, box(100, 40), box(80, 24), box(200, 56)),
      inAutoHeight(440),
    );
    expect(boxOf(out)).toEqual([0, 0, 440, 56]);
    expect(boxOf(child(out, 0))).toEqual([0, 0, 100, 40]);
    expect(boxOf(child(out, 1))).toEqual([112, 0, 80, 24]);
    expect(boxOf(child(out, 2))).toEqual([204, 0, 200, 56]);
    expect(out.hadOverflow).toBe(false);
  });

  it("shrinks children proportionally to their base sizes on an overflowing row, because flex-shrink defaults to CSS's 1", () => {
    // Bases 100 + 80 + 200 plus 2×12 of gap need 404px in 400px: 4px of
    // deficit, taken ∝ base × shrink (all shrink 1).
    const out = layout(
      row({ gap: 12 }, box(100, 40), box(80, 24), box(200, 56)),
      inAutoHeight(400),
    );
    expect(out.children?.[0]?.width).toBeCloseTo(100 - (4 * 100) / 380, 10);
    expect(out.children?.[1]?.width).toBeCloseTo(80 - (4 * 80) / 380, 10);
    expect(out.children?.[2]?.width).toBeCloseTo(200 - (4 * 200) / 380, 10);
    expect(out.hadOverflow).toBe(false);
  });

  it("records overflow instead of clipping when shrinking is refused", () => {
    const out = layout(
      row(
        { gap: 12 },
        box(100, 40, { flexShrink: 0 }),
        box(80, 24, { flexShrink: 0 }),
        box(200, 56, { flexShrink: 0 }),
      ),
      inAutoHeight(400),
    );
    expect(out.children?.[2]?.width).toBe(200);
    expect(out.hadOverflow).toBe(true);
  });

  it("distributes surplus space by grow factor, clamping at max-width and redistributing the rest", () => {
    // 100px of free space over two equal growers would give each +50; A's
    // max-width freezes it at 120 and B takes everything that remains.
    const out = layout(
      row({ gap: 0 }, box(100, 10, { flexGrow: 1, maxWidth: 120 }), box(100, 10, { flexGrow: 1 })),
      inAutoHeight(300),
    );
    expect(out.children?.[0]?.width).toBe(120);
    expect(out.children?.[1]?.width).toBe(180);
  });

  it("clamps shrinking at min-width, freezing the clamped child and re-taking the rest", () => {
    // 80px of deficit: proportional shrinking would take A to 132 and B to
    // 68, both below their minimums, so both freeze and the line overflows
    // by exactly the amount the minimums insist on.
    const out = layout(
      row({ gap: 0 }, box(180, 10, { minWidth: 150 }), box(120, 10, { minWidth: 100 })),
      inAutoHeight(220),
    );
    expect(out.children?.[0]?.width).toBe(150);
    expect(out.children?.[1]?.width).toBe(100);
    expect(out.hadOverflow).toBe(true);
  });

  it("positions the line with justifyContent center and end, past the leading edge when it overflows", () => {
    const children = [box(100, 10), box(100, 10)];
    expect(
      layout(row({ justifyContent: "center" }, ...children), inAutoHeight(300)).children?.map(
        (c) => c.left,
      ),
    ).toEqual([50, 150]);
    expect(
      layout(row({ justifyContent: "end" }, ...children), inAutoHeight(300)).children?.map(
        (c) => c.left,
      ),
    ).toEqual([100, 200]);
    // A centered overflowing line places its first child at a negative
    // offset — information about the geometry, not an error to normalize.
    const overflowing = layout(
      row(
        { justifyContent: "center" },
        box(100, 10, { flexShrink: 0 }),
        box(100, 10, { flexShrink: 0 }),
      ),
      inAutoHeight(150),
    );
    expect(overflowing.children?.map((c) => c.left)).toEqual([-25, 75]);
    expect(overflowing.hadOverflow).toBe(true);
  });

  it("aligns children on the cross axis without stretching definite sizes", () => {
    const kids = [box(100, 40), box(80, 24)];
    expect(
      layout(
        column({ width: 300, alignItems: "center" }, ...kids),
        inAutoHeight(300),
      ).children?.map((c) => c.left),
    ).toEqual([100, 110]);
    expect(
      layout(column({ width: 300, alignItems: "end" }, ...kids), inAutoHeight(300)).children?.map(
        (c) => c.left,
      ),
    ).toEqual([200, 220]);
    // stretch is the default and changes nothing for definite-width children.
    expect(
      layout(column({ width: 300 }, ...kids), inAutoHeight(300)).children?.map((c) => c.left),
    ).toEqual([0, 0]);
  });

  it("stretches auto-sized children to the line's cross size, the CSS default", () => {
    const out = layout(row({}, { style: { axis: "row", width: 100 } }, box(50, 30)), {
      width: { mode: "definite", size: 300 },
      height: { mode: "definite", size: 120 },
    });
    expect(out.height).toBe(120);
    expect(boxOf(child(out, 0))).toEqual([0, 0, 100, 120]);
    expect(boxOf(child(out, 1))).toEqual([100, 0, 50, 30]);
  });

  it("subtracts padding from the content box and adds it back to the outer size", () => {
    // Child positions are relative to the content box origin; the outer
    // size is border-box, as the Tailwind preflight makes the DOM.
    const out = layout(
      row(
        { padding: { x: 20, y: 10 } },
        box(100, 40, { flexShrink: 0 }),
        box(300, 40, { flexShrink: 0 }),
      ),
      inAutoHeight(400),
    );
    expect(boxOf(out)).toEqual([0, 0, 400, 60]);
    expect(boxOf(child(out, 0))).toEqual([0, 0, 100, 40]);
    // The two children need 400px in the 360px content box and refuse to
    // shrink: the overflow is recorded against the content box, not the border box.
    expect(boxOf(child(out, 1))).toEqual([100, 0, 300, 40]);
    expect(out.hadOverflow).toBe(true);
  });

  it("derives height from width and aspectRatio, including when the width arrived from the available space", () => {
    const frame = column({ aspectRatio: 16 / 9 }, box(100, 50, { flexShrink: 0 }));
    const out = layout(frame, inAutoHeight(800));
    expect(boxOf(out)).toEqual([0, 0, 800, 450]);
    expect(out.hadOverflow).toBe(false);
  });

  it("treats degenerate aspectRatio values as unset", () => {
    for (const bad of [0, -2, Number.NaN, Number.POSITIVE_INFINITY]) {
      const out = layout(
        column({ aspectRatio: bad }, box(50, 30, { flexShrink: 0 })),
        inAutoHeight(200),
      );
      expect(out.height).toBe(30);
    }
  });

  it("derives a ratio-bound child's cross size from its final, distributed main size", () => {
    // A grows to 200 wide, so its ratio-1 height follows the grown size
    // rather than the base it started from.
    const grown: LayoutNode = { style: { axis: "row", width: 100, flexGrow: 1, aspectRatio: 1 } };
    const out = layout(row({}, grown, box(100, 50)), inAutoHeight(300));
    expect(boxOf(child(out, 0))).toEqual([0, 0, 200, 200]);
  });

  it("clamps a container-filling width at min-width and max-width", () => {
    expect(layout(row({ maxWidth: 300 }, box(100, 10)), inAutoHeight(500)).width).toBe(300);
    expect(layout(row({ minWidth: 200 }, box(50, 10)), inAutoHeight(100)).width).toBe(200);
  });

  it("sizes a node by content under a max-content constraint, and shrinks it to content under fit-content", () => {
    const kids = [box(100, 10), box(100, 10)];
    const maxContent = layout(row({ gap: 10 }, ...kids), {
      width: { mode: "max-content" },
      height: { mode: "max-content" },
    });
    expect(maxContent.width).toBe(210);
    expect(maxContent.children?.map((c) => c.left)).toEqual([0, 110]);
    const fit = layout(row({ gap: 10 }, ...kids), {
      width: { mode: "fit-content", size: 500 },
      height: { mode: "max-content" },
    });
    expect(fit.width).toBe(210);
    // A fit-content bound smaller than the content keeps the content's
    // geometry and lets it overflow — the box shrinks, the children do not.
    const tight = layout(
      row({ gap: 10 }, box(100, 10, { flexShrink: 0 }), box(100, 10, { flexShrink: 0 })),
      { width: { mode: "fit-content", size: 150 }, height: { mode: "max-content" } },
    );
    expect(tight.width).toBe(150);
    expect(tight.children?.map((c) => c.left)).toEqual([0, 110]);
    expect(tight.hadOverflow).toBe(true);
  });

  it("reports positions relative to each parent's content box in a nested tree", () => {
    const out = layout(
      row(
        { width: 400, gap: 20 },
        column({ gap: 8 }, box(50, 20, { flexShrink: 0 }), box(50, 30, { flexShrink: 0 })),
        box(100, 60, { flexShrink: 0 }),
      ),
      inAutoHeight(400),
    );
    const inner = child(out, 0);
    // The column's own height is content (50); stretch on the row's cross
    // axis lifts it to the line's 60.
    expect(boxOf(inner)).toEqual([0, 0, 50, 60]);
    expect(boxOf(child(inner, 0))).toEqual([0, 0, 50, 20]);
    expect(boxOf(child(inner, 1))).toEqual([0, 28, 50, 30]);
    expect(boxOf(child(out, 1))).toEqual([70, 0, 100, 60]);
  });

  it("records overflow on the cross axis as readily as on the main axis", () => {
    const out = layout(column({ width: 200 }, box(300, 20, { flexShrink: 0 })), inAutoHeight(200));
    expect(out.hadOverflow).toBe(true);
    expect(out.children?.[0]?.width).toBe(300);
  });

  it("echoes the optional id into the computed tree it produced", () => {
    const out = layout(
      {
        id: "root",
        style: { axis: "row" },
        children: [{ id: "a", style: { axis: "row", width: 10, height: 5 } }],
      },
      inAutoHeight(100),
    );
    expect(out.id).toBe("root");
    expect(out.children?.[0]?.id).toBe("a");
  });

  it("computes a childless node as its padding alone", () => {
    const out = layout(row({ padding: 8 }), inAutoHeight(120));
    expect(boxOf(out)).toEqual([0, 0, 120, 16]);
    expect(out.children).toBeUndefined();
    expect(out.hadOverflow).toBe(false);
  });

  // The fixtures below pin the engine-generality defects the invariants
  // property suite surfaced (05-test-engineer-findings). None is reachable
  // through the slice's four adapters — the route always offers a definite
  // width and no adapter emits basis or min/max bounds — but the engine's
  // own contracts (finite outputs, no overlapping siblings, one clamp story
  // across constraint modes) hold regardless of who calls it.

  it("degenerates center and end justification to start when the main size is content-derived", () => {
    // Under max-content the container's width IS the content: there is no
    // free space to inset into, and the old shape put Infinity into every
    // child position here. Every output stays finite now.
    const kids = [box(100, 10, { flexShrink: 0 }), box(80, 10, { flexShrink: 0 })];
    const centered = layout(row({ justifyContent: "center" }, ...kids), {
      width: { mode: "max-content" },
      height: { mode: "max-content" },
    });
    expect(boxOf(centered)).toEqual([0, 0, 180, 10]);
    expect(centered.children?.map((c) => c.left)).toEqual([0, 100]);
    expect(centered.hadOverflow).toBe(false);
    const ended = layout(row({ justifyContent: "end" }, ...kids), {
      width: { mode: "max-content" },
      height: { mode: "max-content" },
    });
    expect(ended.children?.map((c) => c.left)).toEqual([0, 100]);
  });

  it("uses flexBasis as the base main size, standing in for the stated width", () => {
    const basisOnly = layout(
      row({}, { style: { axis: "row", flexBasis: 250, height: 10 } }, box(100, 10)),
      inAutoHeight(500),
    );
    expect(boxOf(child(basisOnly, 0))).toEqual([0, 0, 250, 10]);
    // A declared basis wins over the stated width for base sizing, as CSS.
    const stated = layout(
      row({}, { style: { axis: "row", width: 50, flexBasis: 200, height: 10 } }, box(100, 10)),
      inAutoHeight(500),
    );
    expect(child(stated, 0).width).toBe(200);
    // And it is the base grow distributes from: 200px of free space over one
    // grower whose base is 100.
    const grown = layout(
      row({}, { style: { axis: "row", flexBasis: 100, flexGrow: 1, height: 10 } }, box(100, 10)),
      inAutoHeight(400),
    );
    expect(child(grown, 0).width).toBe(300);
  });

  it("never overlaps siblings when min-width overrules a grow pass's max freeze", () => {
    const out = layout(
      row(
        {},
        { style: { axis: "row", flexGrow: 1, minWidth: 200, maxWidth: 100, height: 10 } },
        box(50, 10, { flexShrink: 0 }),
      ),
      inAutoHeight(500),
    );
    const first = child(out, 0);
    const second = child(out, 1);
    // The child reports the min-clamped 200 (min wins over max, CSS clamp
    // order), and the line's cursor must advance past that same number.
    expect(first.width).toBe(200);
    expect(second.left).toBeGreaterThanOrEqual(first.left + first.width);
    expect(boxOf(second)).toEqual([200, 0, 50, 10]);
  });

  it("clamps the fit-content offer before distributing, so grown children fill the box the clamp keeps", () => {
    const out = layout(
      row({ maxWidth: 100 }, { style: { axis: "row", flexGrow: 1, height: 10 } }),
      { width: { mode: "fit-content", size: 114 }, height: { mode: "max-content" } },
    );
    expect(out.width).toBe(100);
    expect(child(out, 0).width).toBe(100);
    expect(out.hadOverflow).toBe(false);
  });

  it("distributes into the clamped box under max-content too — the line shrinks rather than overflowing the node's own clamp", () => {
    // 220px of content in a 100px box: the clamp feeds back into the space,
    // shrink engages, and the box the node reports is the one it keeps.
    const out = layout(row({ gap: 20, maxWidth: 100 }, box(100, 10), box(100, 10)), {
      width: { mode: "max-content" },
      height: { mode: "max-content" },
    });
    expect(out.width).toBe(100);
    expect(out.children?.map((c) => c.width)).toEqual([40, 40]);
    expect(out.hadOverflow).toBe(false);
  });

  it("clamps the width by its own min/max before the ratio transfers from it, the order a browser uses", () => {
    // Measured in Chromium: `width: 300, maxWidth: 120, aspectRatio: 2`
    // renders 120×60 — the transfer consumes the CLAMPED size, and a
    // clamp-after-transfer would leave the derived axis at the unclamped
    // source's ratio (120×150).
    const maxBinds = layout(
      { style: { axis: "row", width: 300, maxWidth: 120, aspectRatio: 2 } },
      inAutoHeight(400),
    );
    expect(boxOf(maxBinds)).toEqual([0, 0, 120, 60]);
    // The min variant of the same order: min-width raises the source to 400
    // and the height follows the raised size.
    const minBinds = layout(
      { style: { axis: "row", width: 100, minWidth: 400, aspectRatio: 2 } },
      inAutoHeight(800),
    );
    expect(boxOf(minBinds)).toEqual([0, 0, 400, 200]);
    // A width that arrives from the container is clamped before the same
    // transfer.
    const filled = layout(
      { style: { axis: "row", maxWidth: 120, aspectRatio: 2 } },
      { width: { mode: "definite", size: 300 }, height: { mode: "max-content" } },
    );
    expect(boxOf(filled)).toEqual([0, 0, 120, 60]);
    // When the clamp binds the DERIVED axis instead, the transfer overshoots
    // and the clamp wins — both orders agree with the browser.
    const clampOnDerived = layout(
      { style: { axis: "row", height: 300, maxWidth: 120, aspectRatio: 2 } },
      { width: { mode: "max-content" }, height: { mode: "max-content" } },
    );
    expect(boxOf(clampOnDerived)).toEqual([0, 0, 120, 300]);
  });

  it("clamps the content-sized cross line to the box the node's own cross bounds keep", () => {
    // The cross axis mirrors the main one: the line is the largest child,
    // bounded by the node's own max-width, and stretch fills the bounded
    // line. A grandchild that refuses to shrink overflows it — recorded,
    // never clipped.
    const out = layout(
      column(
        { maxWidth: 60 },
        { style: { axis: "row" }, children: [box(100, 40, { flexShrink: 0 })] },
      ),
      { width: { mode: "max-content" }, height: { mode: "max-content" } },
    );
    expect(out.width).toBe(60);
    expect(child(out, 0).width).toBe(60);
    expect(child(child(out, 0), 0).width).toBe(100);
    expect(child(out, 0).hadOverflow).toBe(true);
  });
});
