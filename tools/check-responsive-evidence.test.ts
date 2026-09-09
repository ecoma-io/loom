// @vitest-environment node
//
// Node rather than the project-wide jsdom, because these tests exercise the
// responsive evidence gate against fixture trees on the filesystem — the same
// reason check-a11y-evidence.test.ts opts out of jsdom.
//
// The gate is itself tested because a check that always passes is not a
// check, and doubly so here: the gate reads its law by PARSING a TypeScript
// file, so its fixtures must also prove the parse is fail-closed — a contract
// the parser cannot read must stop the gate, never empty it. Each case builds
// a minimal `packages/` tree with exactly the shape needed to trip one rule —
// a missing claim, an unknown behaviour word, evidence that names no viewport,
// a sweep citation for a page the leg never loads — and asserts the reported
// failure names the component. Three cases run the opposite direction: a tree
// whose claims satisfy the law must report zero failures, a law that lost its
// band uniqueness must throw, and a sweep leg the gate cannot read must stop
// the run rather than read as an empty one.
import { afterAll, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  checkResponsiveEvidence,
  namesABand,
  namesAViewport,
  parseResponsiveContract,
  readResponsiveContract,
  responsiveExceptionSummary,
} from "./check-responsive-evidence.ts";

/**
 * A minimal but parseable contract. The same flat `as const` shape the real
 * one keeps — the parser judges shape, not content, and a two-word vocabulary
 * with two bands makes each fixture's failure readable.
 */
const CONTRACT = `
export const RESPONSIVE_BEHAVIOURS = ["intrinsic-collapse", "band-scale"] as const;
export const RESPONSIVE_EVIDENCE_TIERS = ["harness", "sweep"] as const;
export const RESPONSIVE_VIEWPORT_BANDS = {
  narrow: 360,
  mid: 800,
} as const;
`;

/** Where the law says the one sweep runtime lives. */
const SWEEP_SUITE_PATH = "e2e/layout-responsive.e2e.ts";

/**
 * The root leg itself, carrying the one fact the gate reads from it: a
 * `page.goto` whose last path segment is a page name. Grid's page is in this
 * population; no other component's is — which is exactly the split the
 * fixtures below assert on.
 */
const SWEEP_SUITE = [
  'import { test } from "@playwright/test";',
  "",
  "test.use({ viewport: { width: 360, height: 900 } });",
  "",
  'test("the grid holds together", async ({ page }) => {',
  '  await page.goto("layouts/grid");',
  "});",
].join("\n");

/**
 * A viewport-bearing spec, in the two shapes the tree actually writes: the
 * harness idiom (`setViewportSize` at a band literal) for the component's own
 * spec, the conformance idiom (`test.use({ viewport: … })` plus a bands
 * array) for the route's cases.
 */
const HARNESS_SPEC = [
  'import { test, expect } from "@playwright/test";',
  "",
  'test("the grid collapses at the narrow band", async ({ page }) => {',
  "  await page.setViewportSize({ width: 360, height: 800 });",
  '  await expect(page.getByTestId("grid")).toBeVisible();',
  "});",
].join("\n");

const CONFORMANCE_SPEC = [
  'import { test } from "@playwright/test";',
  "",
  "const VIEWPORTS = [360, 800];",
  "for (const vw of VIEWPORTS) test.use({ viewport: { width: vw, height: 900 } });",
].join("\n");

/** Every evidence file a satisfying claim may cite, created as files. */
const EVIDENCE_FILES = ["packages/composition/grid/e2e/grid.e2e.ts", SWEEP_SUITE_PATH];

const roots: string[] = [];
function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "loom-responsive-evidence-"));
  roots.push(root);
  return root;
}
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

/**
 * A tree with the law, the sweep leg, and one composition's harness spec; no
 * sidecar yet. Composition, not primitives: the gate enumerates the component
 * tiers minus the primitives, so a fixture component under primitives would
 * prove nothing.
 */
function makeTree(): string {
  const root = makeRoot();
  mkdirSync(join(root, "packages", "core", "src"), { recursive: true });
  writeFileSync(join(root, "packages", "core", "src", "responsive-contract.ts"), CONTRACT);
  for (const rel of EVIDENCE_FILES) {
    mkdirSync(join(root, ...rel.split("/").slice(0, -1)), { recursive: true });
    // The sweep leg is not an empty stand-in: its goto population is the tree
    // fact the gate reads, so the fixture carries the shape the real one does.
    writeFileSync(
      join(root, ...rel.split("/")),
      rel === SWEEP_SUITE_PATH ? SWEEP_SUITE : HARNESS_SPEC,
    );
  }
  return root;
}

function writeSidecar(root: string, sidecar: object, name = "grid"): void {
  mkdirSync(join(root, "packages", "composition", name), { recursive: true });
  writeFileSync(join(root, "packages", "composition", name, "a11y.json"), JSON.stringify(sidecar));
}

/** A grid sidecar that satisfies every rule the gate asserts. */
function completeSidecar(): Record<string, unknown> {
  return {
    role: "region",
    basis: "renders a labelled region",
    responsive: {
      behaviour: ["intrinsic-collapse"],
      basis: "flex-wrap with a min-width floor on each track",
      evidence: {
        harness: ["packages/composition/grid/e2e/grid.e2e.ts"],
        // A citation the leg's population answers by tree fact, not prose.
        sweep: [{ path: SWEEP_SUITE_PATH }],
      },
    },
  };
}

const contract = parseResponsiveContract(CONTRACT);

describe("checkResponsiveEvidence", () => {
  it("reports zero failures for a tree whose claims satisfy the law", () => {
    const root = makeTree();
    writeSidecar(root, completeSidecar());
    expect(checkResponsiveEvidence(root, contract)).toEqual([]);
  });

  it("names the component of a missing sidecar in the artifact gate's style", () => {
    const root = makeTree();
    expect(checkResponsiveEvidence(root, contract)).toEqual([
      "Grid: missing packages/composition/grid/a11y.json",
    ]);
  });

  it("fails a sidecar with no responsive claim at all", () => {
    const root = makeTree();
    writeSidecar(root, { role: "region", basis: "renders a labelled region" });
    expect(checkResponsiveEvidence(root, contract)).toEqual([
      "Grid: packages/composition/grid/a11y.json carries no responsive claim — every component under composition/patterns/layouts declares how its geometry answers the viewport",
    ]);
  });

  it("takes a none contract on its basis, and refuses the contradictory shapes around it", () => {
    const none = {
      role: "region",
      basis: "renders a labelled region",
      responsive: { contract: "none", basis: "aspect-ratio is width-relative, band-independent" },
    };
    const satisfied = makeTree();
    writeSidecar(satisfied, none);
    expect(checkResponsiveEvidence(satisfied, contract)).toEqual([]);

    const withBehaviour = makeTree();
    writeSidecar(withBehaviour, {
      ...none,
      responsive: {
        contract: "none",
        basis: "aspect-ratio is width-relative, band-independent",
        behaviour: ["intrinsic-collapse"],
      },
    });
    expect(checkResponsiveEvidence(withBehaviour, contract)).toEqual([
      expect.stringContaining("responsive claim carries both contract and behaviour"),
    ]);

    const withEvidence = makeTree();
    writeSidecar(withEvidence, {
      ...none,
      responsive: {
        contract: "none",
        basis: "aspect-ratio is width-relative, band-independent",
        evidence: { harness: ["packages/composition/grid/e2e/grid.e2e.ts"] },
      },
    });
    expect(checkResponsiveEvidence(withEvidence, contract)).toEqual([
      expect.stringContaining('responsive contract "none" carries evidence'),
    ]);
  });

  it("fails an unknown behaviour word — a claim the law cannot judge", () => {
    const root = makeTree();
    const sidecar = completeSidecar() as { responsive: Record<string, unknown> };
    sidecar.responsive.behaviour = ["magic-collapse"];
    writeSidecar(root, sidecar);
    expect(checkResponsiveEvidence(root, contract)).toEqual([
      expect.stringContaining(
        'responsive claim names "magic-collapse" — outside the closed vocabulary (intrinsic-collapse, band-scale)',
      ),
    ]);
  });

  it("fails a declared behaviour with neither viewport-bearing evidence nor an exception", () => {
    const root = makeTree();
    writeSidecar(root, {
      role: "region",
      basis: "renders a labelled region",
      responsive: { behaviour: ["intrinsic-collapse", "band-scale"], basis: "wraps and steps" },
    });
    expect(checkResponsiveEvidence(root, contract)).toEqual([
      "Grid: behaviour intrinsic-collapse has no viewport-bearing evidence and no exception recorded",
      "Grid: behaviour band-scale has no viewport-bearing evidence and no exception recorded",
    ]);
  });

  it("fails evidence that exists but names no viewport — the fabricated-coverage kind", () => {
    const root = makeTree();
    // The file exists, is a real spec of the tree's own shape, but sizes no
    // viewport and names no band: one width only, wherever the browser left it.
    writeFileSync(
      join(root, "packages/composition/grid/e2e/grid.e2e.ts"),
      HARNESS_SPEC.replace(
        "setViewportSize({ width: 360, height: 800 });",
        'await expect(page.getByRole("region")).toBeVisible();',
      ),
    );
    const sidecar = completeSidecar();
    writeSidecar(root, sidecar);
    expect(checkResponsiveEvidence(root, contract)).toEqual([
      expect.stringContaining("names no viewport — evidence must size the page"),
    ]);
  });

  it("reads the conformance idiom as viewport-bearing: test.use plus a bands array", () => {
    const root = makeTree();
    writeFileSync(join(root, "packages/composition/grid/e2e/grid.e2e.ts"), CONFORMANCE_SPEC);
    writeSidecar(root, completeSidecar());
    expect(checkResponsiveEvidence(root, contract)).toEqual([]);
  });

  it("does not read coverage out of a comment — a remarked resize is not a viewport", () => {
    const root = makeTree();
    // The file talks the talk in remarks only: no live resize, no live band.
    writeFileSync(
      join(root, "packages/composition/grid/e2e/grid.e2e.ts"),
      [
        'import { test, expect } from "@playwright/test";',
        "",
        "// await page.setViewportSize({ width: 360, height: 800 }); — the 360 band",
        'test("visible", async ({ page }) => {',
        '  await expect(page.getByTestId("grid")).toBeVisible();',
        "});",
      ].join("\n"),
    );
    writeSidecar(root, completeSidecar());
    expect(checkResponsiveEvidence(root, contract)).toEqual([
      expect.stringContaining("names no viewport — evidence must size the page"),
    ]);
  });

  it("still reads real code that carries band-bearing remarks", () => {
    const root = makeTree();
    // The opposite polarity: stripping comments must not eat the live code
    // the remarks annotate.
    writeFileSync(
      join(root, "packages/composition/grid/e2e/grid.e2e.ts"),
      `${HARNESS_SPEC}\n\n// The 360 above is the law's narrow band; a /* mid: 800 */ remark changes nothing.`,
    );
    writeSidecar(root, completeSidecar());
    expect(checkResponsiveEvidence(root, contract)).toEqual([]);
  });

  it("fails a dangling evidence path — declared-but-absent evidence is the fabricated kind", () => {
    const root = makeTree();
    const sidecar = completeSidecar() as { responsive: Record<string, unknown> };
    // The sweep citation stays: the path fault is what this case is for, and
    // the remaining tier still answers the behaviour.
    sidecar.responsive.evidence = {
      harness: ["packages/composition/grid/e2e/never-written.e2e.ts"],
      sweep: [{ path: SWEEP_SUITE_PATH }],
    };
    writeSidecar(root, sidecar);
    expect(checkResponsiveEvidence(root, contract)).toEqual([
      'Grid: responsive evidence.harness entry "packages/composition/grid/e2e/never-written.e2e.ts" does not exist in the tree',
    ]);
  });

  it("rejects a path that escapes the repository root — forward or backward slashes", () => {
    for (const escape of ["../elsewhere/spec.e2e.ts", "..\\elsewhere\\spec.e2e.ts"]) {
      const root = makeTree();
      const sidecar = completeSidecar() as { responsive: Record<string, unknown> };
      sidecar.responsive.evidence = { harness: [escape], sweep: [{ path: SWEEP_SUITE_PATH }] };
      writeSidecar(root, sidecar);
      expect(checkResponsiveEvidence(root, contract), escape).toEqual([
        `Grid: responsive evidence.harness entry "${escape}" must be repository-root-relative`,
      ]);
    }
  });

  it("refuses a directory standing in for a file — a directory evidences nothing", () => {
    const root = makeTree();
    const sidecar = completeSidecar() as { responsive: Record<string, unknown> };
    sidecar.responsive.evidence = {
      harness: ["packages/composition"],
      sweep: [{ path: SWEEP_SUITE_PATH }],
    };
    writeSidecar(root, sidecar);
    expect(checkResponsiveEvidence(root, contract)).toEqual([
      'Grid: responsive evidence.harness entry "packages/composition" is not a file',
    ]);
  });

  it("answers a sweep citation by the tree fact alone — the leg's population, not the claim's prose", () => {
    const outside = makeTree();
    writeSidecar(outside, completeSidecar());
    writeSidecar(outside, completeSidecar(), "stack");
    expect(checkResponsiveEvidence(outside, contract)).toEqual([
      'Stack: responsive evidence.sweep entry "e2e/layout-responsive.e2e.ts" — the responsive sweep does not reach this component\'s page (e2e/layout-responsive.e2e.ts never loads it)',
    ]);
  });

  it("keys the population on the leg cited, not the tier label — a relabelled sweep citation answers nothing", () => {
    // The tier key is the claim's own word; the sweep file is the one sweep
    // runtime there is. Citing that file under `harness` must not lift the
    // population obligation, or a claim could refile its sweep citation one
    // key over and read as witnessed.
    const relabelled = makeTree();
    writeSidecar(relabelled, completeSidecar());
    const stack = completeSidecar();
    (stack.responsive as Record<string, unknown>).evidence = {
      harness: [{ path: SWEEP_SUITE_PATH }],
    };
    writeSidecar(relabelled, stack, "stack");
    // Two failures, and the second is the point: once the population fault
    // voids the citation, the behaviour it was filed under is unanswered —
    // the relabel bought nothing at all.
    expect(checkResponsiveEvidence(relabelled, contract)).toEqual([
      'Stack: responsive evidence.harness entry "e2e/layout-responsive.e2e.ts" — the responsive sweep does not reach this component\'s page (e2e/layout-responsive.e2e.ts never loads it)',
      "Stack: behaviour intrinsic-collapse has no viewport-bearing evidence and no exception recorded",
    ]);
  });

  it("stops at a sweep leg it cannot read, never mistaking it for an empty one", () => {
    const root = makeTree();
    writeSidecar(root, completeSidecar());
    rmSync(join(root, ...SWEEP_SUITE_PATH.split("/")));
    expect(() => checkResponsiveEvidence(root, contract)).toThrow(/unreadable/);
  });

  it("stops at a sweep leg whose source names no page.goto population", () => {
    const root = makeTree();
    writeSidecar(root, completeSidecar());
    writeFileSync(
      join(root, ...SWEEP_SUITE_PATH.split("/")),
      'import { test } from "@playwright/test";',
    );
    expect(() => checkResponsiveEvidence(root, contract)).toThrow(/names no page\.goto population/);
  });

  it("reads the sweep population comment-blind — a goto in a remark loads no page", () => {
    const root = makeTree();
    writeSidecar(root, completeSidecar());
    // The leg's only goto lives in a comment: no population, so the run stops
    // rather than reading the leg as an empty one.
    writeFileSync(
      join(root, ...SWEEP_SUITE_PATH.split("/")),
      ['import { test } from "@playwright/test";', "", '// await page.goto("layouts/grid");'].join(
        "\n",
      ),
    );
    expect(() => checkResponsiveEvidence(root, contract)).toThrow(/names no page\.goto population/);

    // And a remarked goto must not join a live population: stack's page is
    // only ever a remark here, so its sweep citation stays unanswered while
    // grid's is answered by the live goto.
    const remarked = makeTree();
    writeSidecar(remarked, completeSidecar());
    writeSidecar(remarked, completeSidecar(), "stack");
    writeFileSync(
      join(remarked, ...SWEEP_SUITE_PATH.split("/")),
      [
        'import { test } from "@playwright/test";',
        "",
        "test.use({ viewport: { width: 360, height: 900 } });",
        "",
        'test("the grid holds together", async ({ page }) => {',
        '  await page.goto("layouts/grid");',
        "});",
        "",
        '// await page.goto("layouts/stack");',
      ].join("\n"),
    );
    expect(checkResponsiveEvidence(remarked, contract)).toEqual([
      expect.stringContaining("the responsive sweep does not reach this component's page"),
    ]);
  });

  it("takes an unqualified spec at its word, but a because-qualified one answers nothing", () => {
    const qualified = completeSidecar() as { responsive: Record<string, unknown> };
    qualified.responsive.evidence = {
      harness: [
        {
          path: "packages/composition/grid/e2e/grid.e2e.ts",
          because: "witnesses the collapse, not the gap step",
        },
      ],
    };
    const silent = makeTree();
    writeSidecar(silent, qualified);
    expect(checkResponsiveEvidence(silent, contract)).toEqual([
      "Grid: behaviour intrinsic-collapse has no viewport-bearing evidence and no exception recorded",
    ]);
    const excepted = makeTree();
    writeSidecar(excepted, {
      ...qualified,
      responsive: {
        ...qualified.responsive,
        exceptions: [
          { behaviour: "intrinsic-collapse", because: "the spec exercises the wrap only" },
        ],
      },
    });
    expect(checkResponsiveEvidence(excepted, contract)).toEqual([]);
  });

  it("fails a because that is not a non-empty string, instead of silently widening the entry", () => {
    // Dropped silently, a blank or non-string because would upgrade the entry
    // to unqualified — answering every behaviour — the one direction a lie
    // wants to go, so the shape fails closed instead.
    for (const bad of ["", "   ", 42, null]) {
      const root = makeTree();
      const sidecar = completeSidecar() as { responsive: Record<string, unknown> };
      sidecar.responsive.evidence = {
        harness: [{ path: "packages/composition/grid/e2e/grid.e2e.ts", because: bad }],
      };
      writeSidecar(root, sidecar);
      expect(checkResponsiveEvidence(root, contract)[0], `because: ${String(bad)}`).toContain(
        "carries a because that is not a non-empty string",
      );
    }
  });

  it("fails an exception recorded for evidence that already answers the behaviour", () => {
    const root = makeTree();
    const sidecar = completeSidecar() as { responsive: Record<string, unknown> };
    sidecar.responsive.exceptions = [{ behaviour: "intrinsic-collapse", because: "swept anyway" }];
    writeSidecar(root, sidecar);
    expect(checkResponsiveEvidence(root, contract)).toEqual([
      "Grid: behaviour intrinsic-collapse is answered by evidence and excepted at once — drop one or the other",
    ]);
  });

  it("fails an exception for a behaviour the claim does not declare, and for a word outside the vocabulary", () => {
    const undeclared = makeTree();
    const a = completeSidecar() as { responsive: Record<string, unknown> };
    a.responsive.evidence = {};
    a.responsive.exceptions = [{ behaviour: "band-scale", because: "not this component" }];
    writeSidecar(undeclared, a);
    // First failure, not the whole list: the dropped exception also leaves the
    // declared behaviours unanswered, and the noise-in-the-record fault is
    // what this case is for.
    expect(checkResponsiveEvidence(undeclared, contract)[0]).toContain(
      "responsive exception names band-scale, which the claim does not declare",
    );

    const unknown = makeTree();
    const b = completeSidecar() as { responsive: Record<string, unknown> };
    b.responsive.evidence = {};
    b.responsive.exceptions = [{ behaviour: "magic", because: "unjudged" }];
    writeSidecar(unknown, b);
    expect(checkResponsiveEvidence(unknown, contract)[0]).toContain(
      'responsive exception names "magic" — no such behaviour',
    );
  });

  it("fails duplicate exception rows for one behaviour, and drops the repeat from the count", () => {
    const root = makeTree();
    const sidecar = completeSidecar() as { responsive: Record<string, unknown> };
    sidecar.responsive.evidence = {};
    sidecar.responsive.behaviour = ["intrinsic-collapse", "band-scale"];
    sidecar.responsive.exceptions = [
      { behaviour: "intrinsic-collapse", because: "no spec yet" },
      { behaviour: "intrinsic-collapse", because: "still no spec" },
      { behaviour: "band-scale", because: "no spec yet either" },
    ];
    writeSidecar(root, sidecar);
    expect(checkResponsiveEvidence(root, contract)[0]).toContain(
      "responsive exceptions name intrinsic-collapse twice",
    );
    // The duplicate is dropped, not tallied: the summary is the number of
    // record, and a repeated row must not inflate it.
    expect(responsiveExceptionSummary(root)).toEqual({
      count: 2,
      components: 1,
      byBehaviour: { "intrinsic-collapse": 1, "band-scale": 1 },
    });
  });

  it("fails each malformed claim shape instead of reading past it", () => {
    const cases: { name: string; responsive: unknown; fragment: string }[] = [
      {
        name: "a blank basis",
        responsive: { behaviour: ["intrinsic-collapse"], basis: "   " },
        fragment: "Grid: responsive claim carries no basis",
      },
      {
        name: "a claim that is not an object",
        responsive: "intrinsic-collapse",
        fragment: "Grid: packages/composition/grid/a11y.json carries no responsive claim",
      },
      {
        name: "an unknown contract value",
        responsive: { contract: "fluid", basis: "flows" },
        fragment: 'responsive contract "fluid" — the only contract value is "none"',
      },
      {
        name: "no behaviour named",
        responsive: { basis: "wraps" },
        fragment: "Grid: responsive claim names no behaviour",
      },
      {
        name: "an empty behaviour array",
        responsive: { behaviour: [], basis: "wraps" },
        fragment: "Grid: responsive claim names no behaviour",
      },
      {
        name: "an evidence bag that is not an object",
        responsive: { behaviour: ["intrinsic-collapse"], basis: "wraps", evidence: ["harness"] },
        fragment: "Grid: responsive evidence must be an object keyed by tier",
      },
      {
        name: "a tier whose value is not an array",
        responsive: {
          behaviour: ["intrinsic-collapse"],
          basis: "wraps",
          evidence: { harness: "x" },
        },
        fragment: "Grid: responsive evidence.harness must be an array",
      },
      {
        name: "an entry of the wrong shape",
        responsive: {
          behaviour: ["intrinsic-collapse"],
          basis: "wraps",
          evidence: { harness: [7] },
        },
        fragment:
          "Grid: responsive evidence.harness carries an entry that is neither a path nor { path, because }",
      },
      {
        name: "exceptions that are not an array",
        responsive: { behaviour: ["intrinsic-collapse"], basis: "wraps", exceptions: "none" },
        fragment: "Grid: responsive exceptions must be an array",
      },
      {
        name: "an exception entry that is not an object",
        responsive: { behaviour: ["intrinsic-collapse"], basis: "wraps", exceptions: [42] },
        fragment: "Grid: responsive exception names null — no such behaviour",
      },
    ];
    for (const testCase of cases) {
      const root = makeTree();
      writeSidecar(root, {
        role: "region",
        basis: "renders a labelled region",
        responsive: testCase.responsive,
      });
      // First failure, not the whole list: a malformed shape can also leave a
      // behaviour unanswered, and the shape fault is what this case is for.
      expect(checkResponsiveEvidence(root, contract)[0], testCase.name).toContain(
        testCase.fragment,
      );
    }
  });

  it("fails an unknown claim key instead of reading past it", () => {
    const root = makeTree();
    const sidecar = completeSidecar() as { responsive: Record<string, unknown> };
    sidecar.responsive.behaviors = ["intrinsic-collapse"];
    writeSidecar(root, sidecar);
    expect(checkResponsiveEvidence(root, contract)).toEqual([
      'Grid: responsive claim carries unknown key "behaviors" — extend the contract and this gate together',
    ]);
  });

  it("fails evidence declared under a tier the contract does not name", () => {
    const root = makeTree();
    const sidecar = completeSidecar() as { responsive: Record<string, unknown> };
    sidecar.responsive.evidence = { browserless: ["packages/composition/grid/e2e/grid.e2e.ts"] };
    writeSidecar(root, sidecar);
    // The misplaced entry answers nothing either, so the declared behaviour
    // comes back unanswered right behind it.
    expect(checkResponsiveEvidence(root, contract)).toEqual([
      expect.stringContaining('responsive evidence under "browserless" — no such tier'),
      "Grid: behaviour intrinsic-collapse has no viewport-bearing evidence and no exception recorded",
    ]);
  });

  it("fails malformed JSON instead of reading a claim out of it", () => {
    const root = makeTree();
    mkdirSync(join(root, "packages", "composition", "grid"), { recursive: true });
    writeFileSync(join(root, "packages", "composition", "grid", "a11y.json"), "{ role: ");
    expect(checkResponsiveEvidence(root, contract)[0]).toEqual(
      expect.stringContaining("does not parse as JSON"),
    );
  });

  it("counts exceptions per component and per behaviour word, skipping sidecars it cannot parse", () => {
    const root = makeTree();
    const sidecar = completeSidecar() as { responsive: Record<string, unknown> };
    sidecar.responsive.evidence = {};
    sidecar.responsive.behaviour = ["intrinsic-collapse", "band-scale"];
    sidecar.responsive.exceptions = [
      { behaviour: "intrinsic-collapse", because: "no spec yet" },
      { behaviour: "band-scale", because: "no spec yet either" },
    ];
    writeSidecar(root, sidecar);
    mkdirSync(join(root, "packages", "composition", "stack"), { recursive: true });
    writeFileSync(join(root, "packages", "composition", "stack", "a11y.json"), "{");
    mkdirSync(join(root, "packages", "composition", "center"), { recursive: true });
    writeFileSync(
      join(root, "packages", "composition", "center", "a11y.json"),
      JSON.stringify({
        role: "region",
        basis: "renders a labelled region",
        responsive: {
          behaviour: ["band-scale"],
          basis: "gutter steps",
          exceptions: [{ behaviour: "band-scale", because: "the spec is still unwritten" }],
        },
      }),
    );
    expect(responsiveExceptionSummary(root)).toEqual({
      count: 3,
      components: 2,
      byBehaviour: { "intrinsic-collapse": 1, "band-scale": 2 },
    });
  });
});

describe("namesAViewport and namesABand", () => {
  it("accepts both viewport idioms the tree writes", () => {
    expect(namesAViewport(HARNESS_SPEC)).toBe(true);
    expect(namesAViewport(CONFORMANCE_SPEC)).toBe(true);
    expect(namesAViewport('test("visible", async ({ page }) => { await page.goto("x"); });')).toBe(
      false,
    );
  });

  it("accepts a band literal only from the law's own record, and never from a height", () => {
    expect(namesABand(HARNESS_SPEC, contract.bands)).toBe(true);
    // 320 is the old hand-picked width and is no band of the law's — and the
    // habitual 800 in the height slot must not stand in for a width the spec
    // never sizes to.
    expect(namesABand("page.setViewportSize({ width: 320, height: 800 })", contract.bands)).toBe(
      false,
    );
    expect(namesABand("const W = 1024;", contract.bands)).toBe(false);
  });

  it("is comment-blind — coverage is not writable as a remark", () => {
    expect(namesAViewport("// await page.setViewportSize({ width: 360, height: 800 });")).toBe(
      false,
    );
    expect(namesAViewport("/* page.setViewportSize({ width: 360 }) */")).toBe(false);
    expect(namesAViewport(HARNESS_SPEC)).toBe(true);
    expect(namesABand("// we sweep the 360 band here", contract.bands)).toBe(false);
    expect(namesABand(HARNESS_SPEC, contract.bands)).toBe(true);
  });
});

describe("parseResponsiveContract", () => {
  it("reads the repository's own contract", () => {
    const parsed = readResponsiveContract(join(import.meta.dirname, ".."));
    expect(parsed.tiers).toEqual(["harness", "sweep"]);
    expect(parsed.behaviours).toHaveLength(7);
    expect(parsed.bands).toEqual({ narrow: 360, sm: 640, mid: 800, wide: 1920, ultrawide: 2000 });
  });

  it("is blind to comments — a docblock may mention bands without becoming law", () => {
    const parsed = parseResponsiveContract(`${CONTRACT}
/**
 * The {narrow: 999} example and the ["magic"] word above are prose, not law:
 * none of it may turn up in the parsed vocabulary.
 */
`);
    expect(parsed.bands).toEqual({ narrow: 360, mid: 800 });
  });

  it("throws on every structural fault instead of returning a partial law", () => {
    const fault = (source: string) => () => parseResponsiveContract(source);
    expect(
      fault(CONTRACT.replace(/export const RESPONSIVE_BEHAVIOURS[\s\S]*?as const;/, "")),
    ).toThrow(/exports no `const RESPONSIVE_BEHAVIOURS`/);
    expect(
      fault(
        CONTRACT.replace(
          '["intrinsic-collapse", "band-scale"] as const',
          '["intrinsic-collapse", "band-scale"',
        ),
      ),
    ).toThrow(/never closes/);
    expect(
      fault(
        CONTRACT.replace(
          'export const RESPONSIVE_BEHAVIOURS = ["intrinsic-collapse", "band-scale"] as const;',
          'export const RESPONSIVE_BEHAVIOURS = ["intrinsic-collapse", "intrinsic-collapse"] as const;',
        ),
      ),
    ).toThrow(/vocabulary repeats a word/);
    expect(
      fault(
        CONTRACT.replace(
          'export const RESPONSIVE_BEHAVIOURS = ["intrinsic-collapse", "band-scale"] as const;',
          'export const RESPONSIVE_BEHAVIOURS = ["intrinsic-collapse", "none"] as const;',
        ),
      ),
    ).toThrow(/"none" is a contract value, not a behaviour/);
    expect(
      fault(CONTRACT.replace('["harness", "sweep"]', '["harness", "sweep", "browserless"]')),
    ).toThrow(/browserless cannot be an evidence tier/);
    expect(
      fault(CONTRACT.replace("  narrow: 360,\n  mid: 800,", "  narrow: 360,\n  mid: 360,")),
    ).toThrow(/two bands claim one width/);
    expect(
      fault(CONTRACT.replace(/export const RESPONSIVE_VIEWPORT_BANDS[\s\S]*?as const;/, "")),
    ).toThrow(/exports no `const RESPONSIVE_VIEWPORT_BANDS`/);
    expect(
      fault(
        CONTRACT.replace(
          "export const RESPONSIVE_VIEWPORT_BANDS = {",
          "export const RESPONSIVE_VIEWPORT_BANDS = [",
        ),
      ),
    ).toThrow(/exports no `const RESPONSIVE_VIEWPORT_BANDS` record/);
  });
});
