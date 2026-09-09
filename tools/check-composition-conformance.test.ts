// @vitest-environment node
//
// Node rather than the project-wide jsdom, because these tests exercise the
// composition conformance gate against fixture trees on the filesystem — the
// same reason check-a11y-evidence.test.ts opts out of jsdom.
//
// The gate is itself tested because a check that always passes is not a
// check. Each case builds a minimal `packages/composition/` tree with exactly
// the shape needed to trip one rule — a missing adapter, a cases module that
// lost a contract export, a duplicate case name, an exception row without a
// reason — and asserts the reported failure names the composition. Three
// cases run the opposite direction: a tree whose one composition carries the
// full evidence set must report zero failures; a tree of five evidence-less
// compositions must pass entirely on exception rows; and the repository's own
// four case modules must parse — so a future over-eager rule, a quietly
// emptied law or a parser that stopped reading the real spelling fails loudly
// instead of passing everything.
import { afterAll, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  checkCompositionConformance,
  conformanceSummary,
  parseCaseModule,
} from "./check-composition-conformance.ts";
import type { CompositionConformanceException } from "./composition-conformance.exceptions.ts";

/** `demo` → `Demo`, the component and adapter function name. */
function toPascal(name: string): string {
  return name.replace(/(^|[-_])([a-z])/g, (_match, _sep, char: string) => char.toUpperCase());
}

/** The adapter file: the mapping function plus the engine re-export. */
function adapterSource(name: string): string {
  const pascal = toPascal(name);
  return [
    `import { layout } from "@ecoma-io/loom-layout-engine";`,
    `export { layout };`,
    `export function ${pascal}Layout() {`,
    `  return { id: "root", style: {}, children: [] };`,
    `}`,
    "",
  ].join("\n");
}

/** The cases module: the four-name contract and `count` well-formed cases. */
function casesSource(name: string, count = 2): string {
  const pascal = toPascal(name);
  const entries = Array.from(
    { length: count },
    (_unused, i) =>
      `{ name: "${name}-case-${String(i)}", props: {}, children: [], viewports: [360, 800] },`,
  );
  return [
    `import type { Component } from "vue";`,
    `import ${pascal} from "../src/${pascal}.vue";`,
    `import { layout, ${pascal}Layout } from "../src/layout";`,
    `export const component: Component = ${pascal};`,
    `export const adapter = ${pascal}Layout;`,
    `export { layout };`,
    `export const cases = [`,
    ...entries.map((entry) => `  ${entry}`),
    `];`,
    "",
  ].join("\n");
}

/** The spec file: presence is the contract; its body is Playwright's business. */
const SPEC_SOURCE = `import { expect, test } from "@playwright/test";\n`;

/** The floor test: the describe title the gate requires, over a trivial case. */
function floorSource(name: string): string {
  const pascal = toPascal(name);
  return [
    `import { describe, expect, it } from "vitest";`,
    `import { cases } from "../e2e/conformance.cases";`,
    `describe("${pascal}Layout", () => {`,
    `  it("maps props onto the tree", () => {`,
    `    expect(cases.length).toBeGreaterThan(0);`,
    `  });`,
    `});`,
    `describe("case coverage floor", () => {`,
    `  it("covers every modeled value", () => {`,
    `    expect(cases.length).toBeGreaterThan(0);`,
    `  });`,
    `});`,
    "",
  ].join("\n");
}

const roots: string[] = [];
function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "loom-composition-conformance-"));
  roots.push(root);
  mkdirSync(join(root, "packages", "composition"), { recursive: true });
  return root;
}
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

/** One composition carrying the complete evidence set, or the overrides trip one rule. */
function writeComposition(
  root: string,
  name: string,
  overrides: { cases?: string; floor?: string; adapter?: string; specless?: boolean } = {},
): void {
  const dir = join(root, "packages", "composition", name);
  mkdirSync(join(dir, "src"), { recursive: true });
  mkdirSync(join(dir, "e2e"), { recursive: true });
  writeFileSync(join(dir, "src", "layout.ts"), overrides.adapter ?? adapterSource(name));
  writeFileSync(join(dir, "e2e", "conformance.cases.ts"), overrides.cases ?? casesSource(name));
  if (overrides.specless !== true) {
    writeFileSync(join(dir, "e2e", "layout-conformance.e2e.ts"), SPEC_SOURCE);
  }
  writeFileSync(join(dir, "src", "layout.test.ts"), overrides.floor ?? floorSource(name));
}

/** An empty composition directory: no evidence at all. */
function writeEmptyComposition(root: string, name: string): void {
  mkdirSync(join(root, "packages", "composition", name), { recursive: true });
}

function exception(row: Partial<CompositionConformanceException>): CompositionConformanceException {
  return {
    composition: row.composition ?? "demo",
    reason: row.reason ?? "not modeled yet",
    owner: row.owner ?? "Phase 4A (composition twins)",
    removal: row.removal ?? "Phase 4A",
  };
}

describe("checkCompositionConformance", () => {
  it("reports zero failures for a tree whose composition carries the full evidence set", () => {
    const root = makeRoot();
    writeComposition(root, "demo");
    expect(checkCompositionConformance(root, [])).toEqual([]);
  });

  it("reports zero failures for a family held up entirely on exception rows", () => {
    // The bimodal tree the gate was written for: five compositions with no
    // evidence and five rows carrying reason, owner and remover.
    const root = makeRoot();
    const names = ["grid", "sidebar", "split", "scroll-reel", "dashboard-grid"];
    for (const name of names) writeEmptyComposition(root, name);
    const exceptions = names.map((name) => exception({ composition: name }));
    expect(checkCompositionConformance(root, exceptions)).toEqual([]);
  });

  it("fails a composition with neither evidence nor an exception — the hole M6 named", () => {
    const root = makeRoot();
    writeEmptyComposition(root, "sidebar");
    expect(checkCompositionConformance(root, [])).toEqual([
      "sidebar: missing packages/composition/sidebar/src/layout.ts",
      "sidebar: missing packages/composition/sidebar/e2e/conformance.cases.ts",
      "sidebar: missing packages/composition/sidebar/e2e/layout-conformance.e2e.ts",
      "sidebar: missing packages/composition/sidebar/src/layout.test.ts",
      "sidebar: no adapter-and-cases evidence and no exception row — land the evidence set or record the exception with reason, owner and removal milestone",
    ]);
  });

  it("excuses a composition's evidence set once a row names it, whatever the row's other faults", () => {
    // A row with a blank reason fails on its own face — and it still names
    // an exception, so the verdict stays truthful about which of the two is
    // missing instead of adding a false "no exception row" line.
    const root = makeRoot();
    writeEmptyComposition(root, "demo");
    const row = exception({ composition: "demo" });
    row.reason = "  ";
    expect(checkCompositionConformance(root, [row])).toEqual([
      'the exception row for "demo" carries no reason — an unexplained exception is indistinguishable from a forgotten one',
    ]);
  });

  // A composition whose evidence set is incomplete and unexcepted owes the
  // specific misses AND the closing verdict — the M6 line names the other way
  // out, so it follows every evidence fault below.
  const owed = (misses: string[]): string[] => [
    ...misses,
    "demo: no adapter-and-cases evidence and no exception row — land the evidence set or record the exception with reason, owner and removal milestone",
  ];

  it("reports each missing artifact independently, so one PR lands the whole set", () => {
    const root = makeRoot();
    writeComposition(root, "demo", { specless: true });
    expect(checkCompositionConformance(root, [])).toEqual(
      owed(["demo: missing packages/composition/demo/e2e/layout-conformance.e2e.ts"]),
    );
  });

  it("fails an adapter file that lost the engine re-export or the adapter function", () => {
    const reexportGone = makeRoot();
    writeComposition(reexportGone, "demo", {
      adapter: `export function DemoLayout() { return {}; }\n`,
    });
    expect(checkCompositionConformance(reexportGone, [])).toEqual(
      owed([
        "demo: packages/composition/demo/src/layout.ts does not re-export `layout` — the route reaches the engine only through this package's own module",
      ]),
    );

    const adapterGone = makeRoot();
    writeComposition(adapterGone, "demo", {
      adapter: `import { layout } from "@ecoma-io/loom-layout-engine";\nexport { layout };\n`,
    });
    expect(checkCompositionConformance(adapterGone, [])).toEqual(
      owed(["demo: packages/composition/demo/src/layout.ts exports no adapter function"]),
    );
  });

  it("fails a cases module that lost one of the four contract exports", () => {
    const root = makeRoot();
    writeComposition(root, "demo", {
      cases: casesSource("demo").replace("export const adapter = DemoLayout;\n", ""),
    });
    expect(checkCompositionConformance(root, [])).toEqual(
      owed([
        "demo: packages/composition/demo/e2e/conformance.cases.ts exports no `const adapter` — the route's module contract is component, adapter, layout and cases",
      ]),
    );
  });

  it("fails a cases module that declares no case at all", () => {
    const root = makeRoot();
    writeComposition(root, "demo", { cases: casesSource("demo", 0) });
    expect(checkCompositionConformance(root, [])).toEqual(
      owed(["demo: packages/composition/demo/e2e/conformance.cases.ts declares no case"]),
    );
  });

  it("fails a case that declares no viewport — a case the spec never drives proves nothing", () => {
    const root = makeRoot();
    writeComposition(root, "demo", {
      cases: casesSource("demo").replaceAll("viewports: [360, 800]", "viewports: []"),
    });
    expect(checkCompositionConformance(root, [])).toEqual(
      owed([
        'demo: packages/composition/demo/e2e/conformance.cases.ts case "demo-case-0" declares no viewport — a case the spec never navigates to proves nothing',
        'demo: packages/composition/demo/e2e/conformance.cases.ts case "demo-case-1" declares no viewport — a case the spec never navigates to proves nothing',
      ]),
    );
  });

  it("fails a duplicate case name within one module — first match would be compared twice", () => {
    const root = makeRoot();
    const shared = `{ name: "shared", props: {}, children: [], viewports: [360] },`;
    writeComposition(root, "demo", {
      cases: [
        `import { layout, DemoLayout } from "../src/layout";`,
        `export const component = {};`,
        `export const adapter = DemoLayout;`,
        `export { layout };`,
        `export const cases = [`,
        `  ${shared}`,
        `  ${shared}`,
        `];`,
        "",
      ].join("\n"),
    });
    expect(checkCompositionConformance(root, [])).toEqual(
      owed([
        'demo: packages/composition/demo/e2e/conformance.cases.ts repeats the case name "shared" — the comparator locates a case by name and would compare the first section twice',
      ]),
    );
  });

  it("fails a duplicate case name across two compositions — case names are global identity", () => {
    const root = makeRoot();
    const cases = (adapter: string): string =>
      [
        `import { layout, ${adapter} } from "../src/layout";`,
        `export const component = {};`,
        `export const adapter = ${adapter};`,
        `export { layout };`,
        `export const cases = [`,
        `  { name: "shared", props: {}, children: [], viewports: [360] },`,
        `];`,
        "",
      ].join("\n");
    writeComposition(root, "demo", { cases: cases("DemoLayout") });
    writeComposition(root, "widget", { cases: cases("WidgetLayout") });
    expect(checkCompositionConformance(root, [])).toEqual([
      'widget: case "shared" is already declared by demo — case names are global identity across the route\'s registry',
      "widget: no adapter-and-cases evidence and no exception row — land the evidence set or record the exception with reason, owner and removal milestone",
    ]);
  });

  it("fails a floor test that exists but lost the coverage-floor describe", () => {
    const root = makeRoot();
    writeComposition(root, "demo", { floor: `import { describe } from "vitest";\n` });
    expect(checkCompositionConformance(root, [])).toEqual(
      owed([
        'demo: packages/composition/demo/src/layout.test.ts carries no "case coverage floor" describe — the case matrix has no coverage floor',
      ]),
    );
  });

  it("fails an exception row missing any of reason, owner or removal", () => {
    for (const field of ["reason", "owner", "removal"] as const) {
      const root = makeRoot();
      writeEmptyComposition(root, "demo");
      const row = exception({ composition: "demo" });
      row[field] = "  ";
      expect(checkCompositionConformance(root, [row]), field).toEqual([
        `the exception row for "demo" carries no ${field} — an unexplained exception is indistinguishable from a forgotten one`,
      ]);
    }
  });

  it("fails an exception row naming a composition that does not exist", () => {
    const root = makeRoot();
    writeComposition(root, "demo");
    expect(checkCompositionConformance(root, [exception({ composition: "wizard" })])).toEqual([
      'the exception row names "wizard", which no composition directory carries — an exception for a composition that does not exist is noise in the record',
    ]);
  });

  it("fails an exception whose composition has since landed the full set — rows expire", () => {
    // The failure mode the gate exists to prevent, on both sides: the row
    // reads as an allowance the evidence has already replaced, so the row —
    // not the evidence — is what the gate fails.
    const root = makeRoot();
    writeComposition(root, "demo");
    expect(checkCompositionConformance(root, [exception({ composition: "demo" })])).toEqual([
      "demo: an exception row stands but the composition now owns the full evidence set — delete the row; exceptions expire when the evidence lands",
    ]);
  });

  it("fails a second exception row naming a composition already excepted", () => {
    const root = makeRoot();
    writeEmptyComposition(root, "demo");
    const failures = checkCompositionConformance(root, [
      exception({ composition: "demo" }),
      exception({ composition: "demo", reason: "also deferred" }),
    ]);
    expect(failures).toEqual([
      'a second exception row names "demo" — one row per composition, or the record disagrees with itself',
    ]);
  });

  it("stops at a tree whose composition tier is missing, never reading it as an empty one", () => {
    const root = mkdtempSync(join(tmpdir(), "loom-composition-conformance-"));
    roots.push(root);
    expect(() => checkCompositionConformance(root, [])).toThrow(/packages\/composition is missing/);
  });

  it("counts the family from the tree, not from the exception rows", () => {
    const root = makeRoot();
    writeComposition(root, "demo");
    writeEmptyComposition(root, "pending");
    const summary = conformanceSummary(root, [exception({ composition: "pending" })]);
    expect(summary).toEqual({ total: 2, complete: 1, excepted: 1 });
  });
});

describe("parseCaseModule", () => {
  it("reads the repository's own case modules and finds every declared name", () => {
    // The real modules are the parser's acceptance test: if this spelling
    // ever stops parsing, the gate stops seeing the case matrix.
    for (const name of ["center", "frame", "inline", "stack"]) {
      const source = readFileSync(
        join(
          import.meta.dirname,
          "..",
          "packages",
          "composition",
          name,
          "e2e",
          "conformance.cases.ts",
        ),
        "utf8",
      );
      const parsed = parseCaseModule(name, "e2e/conformance.cases.ts", source, []);
      expect(parsed?.names.length, name).toBeGreaterThan(0);
      expect(new Set(parsed?.names).size, name).toBe(parsed?.names.length);
    }
  });

  it("is blind to comments — a docblock may name a field without becoming law", () => {
    const failures: string[] = [];
    const parsed = parseCaseModule(
      "demo",
      "e2e/conformance.cases.ts",
      [
        `// export const cases = []; — prose, not law`,
        `/** export const adapter */`,
        `export const component = {};`,
        `export const adapter = DemoLayout;`,
        `export { layout };`,
        `export const cases = [`,
        `  { name: "one", props: {}, children: [], viewports: [360] },`,
        `];`,
      ].join("\n"),
      failures,
    );
    expect(failures).toEqual([]);
    expect(parsed?.names).toEqual(["one"]);
  });

  it("fails a case with no parseable name instead of silently skipping it", () => {
    const failures: string[] = [];
    const parsed = parseCaseModule(
      "demo",
      "e2e/conformance.cases.ts",
      [
        `export const component = {};`,
        `export const adapter = DemoLayout;`,
        `export { layout };`,
        `export const cases = [`,
        `  { props: {}, children: [], viewports: [360] },`,
        `];`,
      ].join("\n"),
      failures,
    );
    expect(failures).toEqual([
      "demo: e2e/conformance.cases.ts carries a case with no parseable name — the comparator locates cases by name",
      "demo: e2e/conformance.cases.ts declares no case",
    ]);
    expect(parsed?.names).toEqual([]);
  });

  it("fails a module whose cases declaration never opens an array", () => {
    const failures: string[] = [];
    const parsed = parseCaseModule(
      "demo",
      "e2e/conformance.cases.ts",
      [
        `export const component = {};`,
        `export const adapter = DemoLayout;`,
        `export { layout };`,
        `export const cases = buildCases();`,
      ].join("\n"),
      failures,
    );
    expect(failures).toEqual([
      "demo: e2e/conformance.cases.ts declares no parseable `cases` array",
    ]);
    expect(parsed).toBeNull();
  });
});
