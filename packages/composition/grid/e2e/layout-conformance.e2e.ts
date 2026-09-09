import { expect, test, type Page } from "@playwright/test";

// Grid's live-oracle conformance spec (design D5): the engine tree the
// conformance route publishes must equal what the browser actually renders
// for the same props in the same viewport. Every navigation IS the
// regeneration — there is no golden file to diff against, on purpose: the
// component must track CSS-as-rendered, and this spec is where a drift
// between Grid.vue's inline `repeat(auto-fit, minmax(...))` and gridLayout's
// derived track arithmetic turns red.
//
// What equality means for a grid is narrower than for a flex line, and the
// narrowness is the evidence: the engine places children at cursor sums of
// (size + gap) while a grid places items at track starts, so the two trees
// agree to the pixel exactly when the case pins a width where the fixture
// fills its cell — which is why the case set is built from the reflow
// boundaries themselves (see ../e2e/conformance.cases.ts). An adapter whose
// repetition count, gap band or track arithmetic is wrong emits leaves at
// the wrong widths and this spec reddens with the full table.
//
// The spec is self-contained by design: the case list itself is published by
// the route (the report JSON carries each case's viewports), so this file
// duplicates nothing but the module's viewport bands — and asserts even
// those equal the published union, so a case file gaining a band reddens
// here instead of silently never running. The case module cannot be
// imported from Node: it carries Grid.vue with it, and Node cannot compile
// an SFC.
//
// Why the known-divergence skip is an annotated skip and not test.fixme:
// per-case granularity would require knowing the cases before the page
// loads, which the no-duplication rule above forbids; a runtime test.fixme()
// inside the per-case loop aborts the remaining cases with it. So a
// divergence is skipped loudly — an annotation on the test, a line on
// stderr — and never deleted. Grid's one divergence is the row banding a
// grid with more items than columns renders, outside the engine's
// single-line IR until line collection lands (Phase 4B).

const ROUTE = "grid";
/** Every width the case set pins: the reflow boundaries, both gap bands and the mid band. */
const VIEWPORTS = [268, 332, 360, 520, 524, 528, 640, 656, 800] as const;
/**
 * Tall enough that the whole mounted page stays above the fold at the
 * NARROWEST pinned width. The route mounts every case in one document, and
 * at 268px several cases reflow to extra rows — a viewport short enough to
 * scroll would pull in a classic scrollbar and shift every measured width
 * by it, which the fixtures' fill-the-cell arithmetic would read as
 * divergence.
 */
const VIEWPORT_HEIGHT = 1400;
/** Browser reads are rounded on both edges (Yoga's technique) and compared to engine floats at half a pixel. */
const EPSILON = 0.5;

/** The engine's published node: parent-relative positions, engine floats. */
interface EngineNode {
  id?: string;
  left: number;
  top: number;
  width: number;
  height: number;
  children?: EngineNode[];
}

interface ReportCase {
  name: string;
  viewports: readonly number[];
  knownDivergence?: { reason: string; owner: string };
  engines?: readonly string[];
  availableWidth: number;
  tree: EngineNode;
}

interface Report {
  viewportWidth: number;
  devicePixelRatio: number;
  rootFontSize: string;
  cases: ReportCase[];
}

/** A DOM box as read: two-edge rounded, relative to the parent's content-box origin. */
interface DomNode {
  left: number;
  top: number;
  width: number;
  height: number;
  children: DomNode[];
}

async function readReport(page: Page): Promise<Report> {
  // The route lays out every case on one page load, so a single case whose
  // adapter throws in-page leaves no report node at all — a bare selector
  // timeout with no clue which case or width killed it (measured on CI).
  // The page's own errors ride along on the timeout's message.
  const crashes: string[] = [];
  const onError = (error: Error): void => {
    crashes.push(error.message);
  };
  page.on("pageerror", onError);
  try {
    await page.waitForSelector("#loom-conformance-report", { state: "attached" });
  } catch (error) {
    throw new Error(
      `the conformance route published no report${
        crashes.length > 0 ? `; the page threw: ${crashes.join(" | ")}` : ""
      }`,
      { cause: error },
    );
  } finally {
    page.off("pageerror", onError);
  }
  const text = await page.locator("#loom-conformance-report").textContent();
  if (text === null) throw new Error("the conformance route did not publish its report");
  return JSON.parse(text) as Report;
}

async function readDomTree(page: Page, caseName: string): Promise<DomNode> {
  return page.evaluate((name: string) => {
    const section = document.querySelector(`section[data-conformance-case="${name}"]`);
    if (section === null) {
      throw new Error(`case "${name}" did not render`);
    }
    const rootEl = section.querySelector('[data-conformance-role="root"]');
    if (!(rootEl instanceof HTMLElement)) {
      throw new Error(`case "${name}" did not render`);
    }
    // Engine positions are relative to the parent's CONTENT-box origin, so
    // each level passes its own content origin down; padding and border are
    // added back to the border-box rect to find it.
    const read = (el: HTMLElement, parentOrigin: { x: number; y: number }): DomNode => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const origin = {
        x: r.left + Number.parseFloat(cs.paddingLeft) + Number.parseFloat(cs.borderLeftWidth),
        y: r.top + Number.parseFloat(cs.paddingTop) + Number.parseFloat(cs.borderTopWidth),
      };
      return {
        left: Math.round(r.left) - Math.round(parentOrigin.x),
        top: Math.round(r.top) - Math.round(parentOrigin.y),
        width: Math.round(r.right) - Math.round(r.left),
        height: Math.round(r.bottom) - Math.round(r.top),
        children: Array.from(el.children).map((kid) => read(kid as HTMLElement, origin)),
      };
    };
    const sr = section.getBoundingClientRect();
    const scs = getComputedStyle(section);
    return read(rootEl, {
      x: sr.left + Number.parseFloat(scs.paddingLeft) + Number.parseFloat(scs.borderLeftWidth),
      y: sr.top + Number.parseFloat(scs.paddingTop) + Number.parseFloat(scs.borderTopWidth),
    });
  }, caseName);
}

/**
 * The engine node the component's root element corresponds to: the first
 * id "root" at or below the tree root, so synthetic wrappers are descended
 * through rather than compared. Grid's adapter publishes none — its tree
 * anchors at the top — but the anchor walk is the published shape's
 * contract, not an adapter detail.
 */
function anchorOf(tree: EngineNode): EngineNode | undefined {
  if (tree.id === "root") return tree;
  for (const child of tree.children ?? []) {
    const found = anchorOf(child);
    if (found !== undefined) return found;
  }
  return undefined;
}

const box = (n: { left: number; top: number; width: number; height: number }): string =>
  `[l ${n.left.toString()} t ${n.top.toString()} w ${n.width.toString()} h ${n.height.toString()}]`;

/**
 * Walk both trees positionally. Every compared node lands in `rows` (the
 * human-readable table a failure prints); every field beyond epsilon lands
 * in `bad`. The whole table is emitted even when only one node diverges —
 * a diagnosis needs the neighbours, not just the outlier.
 */
function diffTree(
  engine: EngineNode,
  dom: DomNode,
  path: string,
  rows: string[],
  bad: string[],
): void {
  const fields: readonly [string, number, number][] = [
    ["left", engine.left, dom.left],
    ["top", engine.top, dom.top],
    ["width", engine.width, dom.width],
    ["height", engine.height, dom.height],
  ];
  const off = fields.filter(([, e, d]) => Math.abs(e - d) > EPSILON);
  rows.push(
    `  ${path.padEnd(16)} engine ${box(engine)}  dom ${box(dom)}${off.length > 0 ? "  <<< " : ""}`,
  );
  for (const [field, e, d] of off) {
    bad.push(`${path}: ${field} — engine ${e.toString()}, dom ${d.toString()}`);
  }
  const engineKids = engine.children ?? [];
  if (engineKids.length !== dom.children.length) {
    bad.push(
      `${path}: engine has ${engineKids.length.toString()} children, DOM has ${dom.children.length.toString()}`,
    );
    return;
  }
  for (const [i, kid] of engineKids.entries()) {
    const domKid = dom.children[i];
    if (domKid === undefined) return; // the count mismatch above already reported it
    diffTree(kid, domKid, `${path}>${i.toString()}`, rows, bad);
  }
}

for (const vw of VIEWPORTS) {
  test.describe(`viewport ${vw.toString()}px`, () => {
    // The comparison runs at DPR 1 (the determinism quintet). The webkit
    // project carries Desktop Safari's deviceScaleFactor 2, so the quintet is
    // declared here rather than inherited from the browser profile.
    test.use({
      viewport: { width: vw, height: VIEWPORT_HEIGHT },
      deviceScaleFactor: 1,
    });

    test("every Grid case published at this width renders exactly the geometry the engine computed", async ({
      page,
    }) => {
      await page.goto(`/?conformance=${ROUTE}`);
      const report = await readReport(page);

      // The spec's band list must name exactly the widths the case files
      // publish — a new band in a case file that this file never learned
      // would otherwise be tested by nobody.
      const published = [...new Set(report.cases.flatMap((c) => [...c.viewports]))].sort(
        (a, b) => a - b,
      );
      expect(published, "the spec's VIEWPORTS must equal the case files' published bands").toEqual([
        ...VIEWPORTS,
      ]);

      // Chromium is the normative engine (design D5); the cases' engines
      // skip-set names the bare browser, so the mobile projects alias down.
      const engineName = test.info().project.name.replace(/-mobile$/, "");
      const atThisWidth = report.cases.filter((c) => c.viewports.some((v) => v === vw));
      expect(
        atThisWidth.length,
        `no ${ROUTE} case is published at ${vw.toString()}px`,
      ).toBeGreaterThan(0);

      for (const one of atThisWidth) {
        await test.step(one.name, async () => {
          if (one.knownDivergence !== undefined) {
            test.info().annotations.push({
              type: "known-divergence",
              description: `${one.name}: ${one.knownDivergence.reason} (owner ${one.knownDivergence.owner})`,
            });
            console.warn(
              `[known-divergence] ${ROUTE}/${one.name} @${vw.toString()}px not compared: ${one.knownDivergence.reason} (owner ${one.knownDivergence.owner})`,
            );
            return;
          }
          if (one.engines?.includes(engineName) === true) {
            test.info().annotations.push({
              type: "engine-divergence",
              description: `${one.name}: known to diverge on ${engineName}; chromium is normative`,
            });
            console.warn(
              `[engine-divergence] ${ROUTE}/${one.name} @${vw.toString()}px not compared on ${engineName}`,
            );
            return;
          }
          const anchor = anchorOf(one.tree);
          expect(anchor, `${one.name}: no id "root" node in the engine tree`).toBeDefined();
          const dom = await readDomTree(page, one.name);
          const rows: string[] = [];
          const bad: string[] = [];
          if (anchor !== undefined) {
            diffTree(anchor, dom, "root", rows, bad);
          }
          if (bad.length > 0) {
            const table = [
              `${ROUTE}/${one.name} @${vw.toString()}px — engine vs DOM (epsilon ${EPSILON.toString()}px, DOM read with two-edge rounding)`,
              ...rows,
              "",
              ...bad.map((line) => `  mismatch ${line}`),
            ].join("\n");
            await test.info().attach(`${ROUTE}-${one.name}-${vw.toString()}px.txt`, {
              contentType: "text/plain",
              body: table,
            });
            console.error(table);
          }
          expect(
            bad,
            `${ROUTE}/${one.name} @${vw.toString()}px — full engine-vs-DOM table printed above and attached`,
          ).toEqual([]);
        });
      }
    });
  });
}

// The page-side half of the determinism quintet (design D5), asserted here
// and only here: the route pins the rest itself (it throws on a DPR it does
// not expect, pins the root font, renders text-free fixtures, and measures
// the fixture container rather than trusting the viewport). DPR 1 and the
// 16px root are what make the rem-based track floor exact px arithmetic, and
// a profile change that breaks either must fail loudly, not flake softly.
// It carries its own viewport so the assertions are about the page, not
// about whatever the ambient default happened to be.
test.describe("determinism quintet", () => {
  test.use({
    viewport: { width: VIEWPORTS[0], height: VIEWPORT_HEIGHT },
    deviceScaleFactor: 1,
  });

  test("the conformance page holds the quintet's browser-side facts: DPR 1, 16px root, viewport as set", async ({
    page,
  }) => {
    await page.goto(`/?conformance=${ROUTE}`);
    const report = await readReport(page);
    expect(report.devicePixelRatio).toBe(1);
    expect(report.rootFontSize).toBe("16px");
    expect(report.viewportWidth).toBe(VIEWPORTS[0]);
  });
});
