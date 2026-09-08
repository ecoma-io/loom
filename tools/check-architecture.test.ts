// @vitest-environment node
//
// Node rather than the project-wide jsdom, because these tests exercise the
// architecture checker against fixture trees on the filesystem — the same
// reason docs/.vitepress/sidebar.test.ts opts out of jsdom.
//
// The architecture checker is itself tested because a check that always
// passes is not a check. Each case builds a minimal `packages/` fixture with
// exactly the shape needed to trip one rule — an upward edge, a facade
// import, a cycle, a missing moon.yml, an undeclared dependency — and asserts
// that runChecks() reports it. The fixtures are also how the rules are kept
// honest in the other direction: a valid tree that satisfies every rule must
// report zero violations, so a future over-eager rule fails loudly rather
// than quietly blocking every component.
import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runChecks } from "./check-architecture.ts";

/** A minimal but valid package tree: a primitive that imports only core. */
function writeFixture(root: string): void {
  const buttonDir = join(root, "packages", "primitives", "button");
  const coreDir = join(root, "packages", "core");
  // Every tier directory must exist so internalPackages() can enumerate them;
  // the fixed packages (core, labels, theme-core, loom) also live under packages/.
  for (const tier of ["primitives", "composition", "layouts", "patterns"]) {
    mkdirSync(join(root, "packages", tier), { recursive: true });
  }
  for (const fixed of ["core", "labels", "theme-core", "loom"]) {
    mkdirSync(join(root, "packages", fixed, "src"), { recursive: true });
  }
  mkdirSync(join(buttonDir, "src"), { recursive: true });

  writeFileSync(
    join(buttonDir, "package.json"),
    JSON.stringify({
      name: "@ecoma-io/loom-button",
      exports: {},
      dependencies: { "@ecoma-io/loom-core": "workspace:*" },
    }),
  );
  writeFileSync(join(buttonDir, "moon.yml"), "project:\n  name: button\n");
  writeFileSync(
    join(buttonDir, "src", "Button.vue"),
    'import { cn } from "@ecoma-io/loom-core";\n',
  );
  writeFileSync(
    join(coreDir, "package.json"),
    JSON.stringify({ name: "@ecoma-io/loom-core", exports: {} }),
  );
  writeFileSync(join(coreDir, "src", "cn.ts"), "export const cn = () => '';\n");
  writeFileSync(join(root, "packages", "labels", "src", "index.ts"), "");
  writeFileSync(join(root, "packages", "loom", "src", "index.ts"), "");
}

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "loom-arch-"));
  writeFixture(root);
  return root;
}

/**
 * The zero-engine-bytes shape, exactly as the real tree carries it: the engine
 * whose own index re-exports its internals, one composition whose adapter at
 * `src/layout.ts` imports the engine, and a facade that re-exports neither.
 * This fixture is check 8's green case — every allow-list entry is present and
 * the tree must still report zero violations.
 */
function writeEngineFixture(root: string): void {
  const engineDir = join(root, "packages", "layout-engine");
  mkdirSync(join(engineDir, "src"), { recursive: true });
  writeFileSync(
    join(engineDir, "package.json"),
    JSON.stringify({ name: "@ecoma-io/loom-layout-engine", exports: {} }),
  );
  writeFileSync(join(engineDir, "src", "index.ts"), 'export { layout } from "./layout";\n');
  writeFileSync(join(engineDir, "src", "layout.ts"), "export const layout = () => ({});\n");

  const stackDir = join(root, "packages", "composition", "stack");
  mkdirSync(join(stackDir, "src"), { recursive: true });
  writeFileSync(
    join(stackDir, "package.json"),
    JSON.stringify({
      name: "@ecoma-io/loom-stack",
      exports: {},
      dependencies: { "@ecoma-io/loom-layout-engine": "workspace:*" },
    }),
  );
  writeFileSync(join(stackDir, "moon.yml"), "project:\n  name: stack\n");
  writeFileSync(
    join(stackDir, "src", "layout.ts"),
    'import { layout } from "@ecoma-io/loom-layout-engine";\nexport { layout };\n',
  );
  writeFileSync(join(stackDir, "src", "index.ts"), 'export { default } from "./Stack.vue";\n');
  writeFileSync(join(stackDir, "src", "Stack.vue"), "<template><div /></template>\n");
  // The adapter being proved, exactly as the real tree carries it: its
  // co-located unit test and its e2e conformance case import it relatively.
  // These are rule (d)'s allowance, and their presence here is what makes the
  // green case below prove the allowance rather than assume it.
  writeFileSync(
    join(stackDir, "src", "layout.test.ts"),
    'import { STACK_GAP_STEPS, stackLayout } from "./layout";\n',
  );
  mkdirSync(join(stackDir, "e2e"), { recursive: true });
  writeFileSync(
    join(stackDir, "e2e", "conformance.cases.ts"),
    'import { layout, stackLayout } from "../src/layout";\n',
  );
}

describe("runChecks", () => {
  it("reports zero violations for a tree that satisfies every rule", () => {
    const root = makeRoot();
    try {
      expect(runChecks(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags an upward edge: a primitive importing a pattern", () => {
    const root = makeRoot();
    try {
      mkdirSync(join(root, "packages", "patterns", "app-header", "src"), { recursive: true });
      writeFileSync(
        join(root, "packages", "patterns", "app-header", "package.json"),
        JSON.stringify({ name: "@ecoma-io/loom-app-header", exports: {} }),
      );
      writeFileSync(join(root, "packages", "patterns", "app-header", "src", "AppHeader.vue"), "");
      // button now imports app-header — an upward edge.
      writeFileSync(
        join(root, "packages", "primitives", "button", "src", "Button.vue"),
        'import AppHeader from "@ecoma-io/loom-app-header";\n',
      );
      writeFileSync(
        join(root, "packages", "primitives", "button", "package.json"),
        JSON.stringify({
          name: "@ecoma-io/loom-button",
          exports: {},
          dependencies: { "@ecoma-io/loom-app-header": "workspace:*" },
        }),
      );

      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("above"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags an import of the public facade from an internal package", () => {
    const root = makeRoot();
    try {
      writeFileSync(
        join(root, "packages", "primitives", "button", "src", "Button.vue"),
        'import { Button } from "@ecoma-io/loom";\n',
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("public facade"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a non-composition importing the layout engine — a primitive is not its consumer", () => {
    const root = makeRoot();
    try {
      // The engine package must exist for the spec to resolve, and a non-composition
      // (here a primitive) importing it is exactly the D3/M1 edge.
      mkdirSync(join(root, "packages", "layout-engine", "src"), { recursive: true });
      writeFileSync(
        join(root, "packages", "layout-engine", "package.json"),
        JSON.stringify({ name: "@ecoma-io/loom-layout-engine", exports: {} }),
      );
      writeFileSync(join(root, "packages", "layout-engine", "src", "index.ts"), "");
      writeFileSync(
        join(root, "packages", "primitives", "button", "src", "Button.vue"),
        'import { layout } from "@ecoma-io/loom-layout-engine";\n',
      );
      writeFileSync(
        join(root, "packages", "primitives", "button", "package.json"),
        JSON.stringify({
          name: "@ecoma-io/loom-button",
          exports: {},
          dependencies: { "@ecoma-io/loom-layout-engine": "workspace:*" },
        }),
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("layout engine"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("permits a composition adapter to import the layout engine", () => {
    const root = makeRoot();
    try {
      writeEngineFixture(root);
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("layout engine"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps the zero-engine-bytes allow-list green: engine re-export, adapter import, clean facade", () => {
    const root = makeRoot();
    try {
      writeEngineFixture(root);
      // The engine's own `export { layout } from "./layout"` and the stack
      // adapter's engine import are both legitimate — the check must report
      // nothing for the exact shape the real tree carries.
      expect(runChecks(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails a plain same-package adapter import — the shape the barrel rule cannot see", () => {
    const root = makeRoot();
    try {
      writeEngineFixture(root);
      // The component naming its own adapter relatively is the hole the
      // re-export rule was blind to: no engine specifier appears anywhere in
      // the file, the import is not an export, and the render path pulls the
      // engine into every consumer bundle all the same.
      writeFileSync(
        join(root, "packages", "composition", "stack", "src", "Stack.vue"),
        '<script lang="ts">\nimport { layout } from "./layout";\n</script>\n<template><div /></template>\n',
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("imports the layout adapter"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps allowing the adapter's own tests and e2e to import it", () => {
    const root = makeRoot();
    try {
      writeEngineFixture(root);
      // The allowance arm of rule (d): the co-located unit test and the e2e
      // conformance case import the adapter relatively — writeEngineFixture
      // writes both — and none of that enters the published module graph.
      // Asserting the specific files stay clean is what keeps the rule from
      // being "fixed" later by banning the proof along with the leak.
      expect(runChecks(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps allowing the dotted spelling of the same proof imports", () => {
    const root = makeRoot();
    try {
      writeEngineFixture(root);
      // The allowance is keyed on the resolved shape of the specifier, not on
      // its prettiness: the same two proof files writing the adapter with its
      // extension must stay blessed, or the widened grammar turns the real
      // tree red the day someone names the file fully.
      writeFileSync(
        join(root, "packages", "composition", "stack", "src", "layout.test.ts"),
        'import { STACK_GAP_STEPS, stackLayout } from "./layout.ts";\n',
      );
      writeFileSync(
        join(root, "packages", "composition", "stack", "e2e", "conformance.cases.ts"),
        'import { layout, stackLayout } from "../src/layout.ts";\n',
      );
      expect(runChecks(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails a non-test file under an `e2e-extra/` sibling — the allow-list prefix is directory-bounded", () => {
    const root = makeRoot();
    try {
      writeEngineFixture(root);
      // `join(dir, "e2e", "")` dropped its empty segment, so the exemption
      // prefix was `…/stack/e2e` and `e2e-extra/` rode the allow-list on a
      // shared prefix. The separator is appended by hand now; this is the
      // shape that got loud.
      mkdirSync(join(root, "packages", "composition", "stack", "e2e-extra"), { recursive: true });
      writeFileSync(
        join(root, "packages", "composition", "stack", "e2e-extra", "case.ts"),
        'import { layout } from "../src/layout";\n',
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("imports the layout adapter"))).toBe(true);
      expect(failures.some((f) => f.includes("e2e-extra/case.ts"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails a foreign package's adapter import hiding in a .test.ts file — the allowance is the package's own adapter", () => {
    const root = makeRoot();
    try {
      writeEngineFixture(root);
      // The allowance used to key on the filename alone, so any `.test.ts`
      // under the package blessed any relative `…/src/layout` — including a
      // sibling composition's, which is a cross-package reach with a test
      // file's name as camouflage.
      mkdirSync(join(root, "packages", "composition", "stack", "tests"), { recursive: true });
      writeFileSync(
        join(root, "packages", "composition", "stack", "tests", "foreign.test.ts"),
        'import { layout } from "../inline/src/layout";\n',
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("imports the layout adapter"))).toBe(true);
      expect(failures.some((f) => f.includes("tests/foreign.test.ts"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails a pattern reaching a composition's adapter by relative path", () => {
    const root = makeRoot();
    try {
      writeEngineFixture(root);
      // The cross-package spelling of the same reach: relative, so check 5's
      // specifier grammar never sees it, and an import, so the re-export rule
      // never sees it either.
      mkdirSync(join(root, "packages", "patterns", "title-bar", "src"), { recursive: true });
      writeFileSync(
        join(root, "packages", "patterns", "title-bar", "package.json"),
        JSON.stringify({ name: "@ecoma-io/loom-title-bar", exports: {} }),
      );
      writeFileSync(
        join(root, "packages", "patterns", "title-bar", "src", "TitleBar.vue"),
        'import { layout } from "../../composition/stack/src/layout";\n',
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("imports the layout adapter"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails an engine import sheltering in a non-composition's src/layout.ts", () => {
    const root = makeRoot();
    try {
      writeEngineFixture(root);
      // The allow-list used to key on the file path alone, so any package
      // could open a src/layout.ts and import the engine past this rule while
      // the message said "composition adapters". The tier is part of the
      // allow-list now; this is the shape that got quieter.
      writeFileSync(
        join(root, "packages", "primitives", "button", "src", "Button.vue"),
        'import { cn } from "@ecoma-io/loom-core";\n',
      );
      writeFileSync(
        join(root, "packages", "primitives", "button", "src", "layout.ts"),
        'import { layout } from "@ecoma-io/loom-layout-engine";\n',
      );
      writeFileSync(
        join(root, "packages", "primitives", "button", "package.json"),
        JSON.stringify({
          name: "@ecoma-io/loom-button",
          exports: {},
          dependencies: { "@ecoma-io/loom-layout-engine": "workspace:*" },
        }),
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("imports the layout engine"))).toBe(true);
      expect(failures.some((f) => f.includes("button/src/layout.ts"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails a composition barrel re-exporting its layout adapter — the chain that passed both readers", () => {
    const root = makeRoot();
    try {
      writeEngineFixture(root);
      // The adapter is legal where it lives; handing it to consumers through
      // the package index drags the engine into the facade's bundle while
      // naming no engine specifier anywhere in the barrel.
      writeFileSync(
        join(root, "packages", "composition", "stack", "src", "index.ts"),
        'export { default } from "./Stack.vue";\nexport { layout } from "./layout";\n',
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("re-exports a layout adapter"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails an engine import outside the adapter file, even inside a composition", () => {
    const root = makeRoot();
    try {
      writeEngineFixture(root);
      // The seam the contract names is the file src/layout.ts, not the
      // composition tier: the component reaching the engine directly is the
      // same published-bytes edge with the row's blessing as camouflage.
      writeFileSync(
        join(root, "packages", "composition", "stack", "src", "Stack.vue"),
        'import { layout } from "@ecoma-io/loom-layout-engine";\n<template><div /></template>\n',
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("src/layout.ts"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails a prettier-wrapped re-export of the adapter — the export…from gap crosses lines", () => {
    const root = makeRoot();
    try {
      writeEngineFixture(root);
      // The same re-export the rule exists for, spelled the way prettier
      // prints it once the braces wrap: the old `[^;\n]` gap could not cross
      // the newline and the clause sailed through.
      writeFileSync(
        join(root, "packages", "composition", "stack", "src", "index.ts"),
        'export {\n  layout,\n} from "./layout";\n',
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("re-exports a layout adapter"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails a multi-segment relative re-export of the adapter", () => {
    const root = makeRoot();
    try {
      writeEngineFixture(root);
      // Two climbs, then path segments, then the adapter: the old
      // `\.{1,2}/`-once grammar stopped at the second `..`.
      writeFileSync(
        join(root, "packages", "composition", "stack", "src", "index.ts"),
        'export { layout } from "../../composition/stack/src/layout";\n',
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("re-exports a layout adapter"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails a deep package-specifier re-export of the adapter — no ./layout text needed", () => {
    const root = makeRoot();
    try {
      writeEngineFixture(root);
      // Naming the adapter through the package's own deep specifier resolves
      // to the same file while never spelling `./layout`, and check 5's
      // single-segment subpath group cannot see the spelling either — so
      // without this arm the re-export escapes every reader.
      writeFileSync(
        join(root, "packages", "composition", "stack", "src", "index.ts"),
        'export { layout } from "@ecoma-io/loom-stack/src/layout";\n',
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("re-exports a layout adapter"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails a dotted deep-specifier re-export of the adapter — the file's own name resolves identically", () => {
    const root = makeRoot();
    try {
      writeEngineFixture(root);
      // The re-export rule's package form carried the same extensionless
      // grammar as everything else, so `…/loom-stack/src/layout.ts` — the
      // specifier a consumer writes when naming the file rather than the
      // module — re-exported the adapter past every reader.
      writeFileSync(
        join(root, "packages", "composition", "stack", "src", "index.ts"),
        'export { layout } from "@ecoma-io/loom-stack/src/layout.ts";\n',
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("re-exports a layout adapter"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails a relative engine import — the spelling that needs no tsconfig entry", () => {
    const root = makeRoot();
    try {
      writeEngineFixture(root);
      // A relative climb into the engine compiles today with no paths entry
      // and names no engine specifier, so the package-form rule never saw it.
      writeFileSync(
        join(root, "packages", "composition", "stack", "src", "Stack.vue"),
        'import { layout } from "../../layout-engine/src/index";\n<template><div /></template>\n',
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("imports the layout engine"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails an engine import whose subpath carries a file extension — …/src/pure.ts is still the engine", () => {
    const root = makeRoot();
    try {
      writeEngineFixture(root);
      // The extensionless grammar the engine rule shared with checks 2 and 5
      // stopped at the dot: `…/src/pure.ts` is how the file is actually named
      // on disk, and it compiled unseen until the segments carried dots.
      writeFileSync(
        join(root, "packages", "composition", "stack", "src", "Stack.vue"),
        'import { pure } from "@ecoma-io/loom-layout-engine/src/pure.ts";\n<template><div /></template>\n',
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("imports the layout engine"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails an engine import at a subpath — …/src/pure is still the engine", () => {
    const root = makeRoot();
    try {
      writeEngineFixture(root);
      // The engine rule watched only the package root, so a two-segment
      // subpath resolved past it.
      writeFileSync(
        join(root, "packages", "composition", "stack", "src", "Stack.vue"),
        'import { pure } from "@ecoma-io/loom-layout-engine/src/pure";\n<template><div /></template>\n',
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("imports the layout engine"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails an engine import from a package's tests tree — the seam is a file, not a directory", () => {
    const root = makeRoot();
    try {
      writeEngineFixture(root);
      // Check 8 walks whole package directories on purpose; a test file
      // reaching the engine relatively is the same forbidden edge as the
      // component's own source spelling it.
      mkdirSync(join(root, "packages", "composition", "stack", "tests"), { recursive: true });
      writeFileSync(
        join(root, "packages", "composition", "stack", "tests", "layout.test.ts"),
        'import { layout } from "../../layout-engine/src/index";\n',
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("imports the layout engine"))).toBe(true);
      expect(failures.some((f) => f.includes("tests/layout.test.ts"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails a facade module reaching ./layout — the barrel chain into the bundle root", () => {
    const root = makeRoot();
    try {
      writeFileSync(join(root, "packages", "loom", "src", "layout.ts"), "export const x = 1;\n");
      writeFileSync(
        join(root, "packages", "loom", "src", "index.ts"),
        'export { x } from "./layout";\n',
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("reaches a layout adapter"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reads a block-form tags list carrying `e2e` — the shape tree-view's moon.yml already has", () => {
    const root = makeRoot();
    try {
      const buttonDir = join(root, "packages", "primitives", "button");
      mkdirSync(join(buttonDir, "e2e"), { recursive: true });
      writeFileSync(join(buttonDir, "e2e", "button.e2e.ts"), "export const case = 1;\n");
      writeFileSync(
        join(buttonDir, "moon.yml"),
        "deps:\n  - core\ntags:\n  - layer-primitives\n  - e2e\nproject:\n  name: button\n",
      );
      const failures = runChecks(root);
      // The inline-only reader reported this correct block-form list as
      // "tags omit `e2e`" (#269 finding 9) — fail-loud on the wrong line.
      expect(failures.some((f) => f.includes("tags omit"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("still fails a block-form tags list whose `e2e` tag is genuinely missing", () => {
    const root = makeRoot();
    try {
      const buttonDir = join(root, "packages", "primitives", "button");
      mkdirSync(join(buttonDir, "e2e"), { recursive: true });
      writeFileSync(join(buttonDir, "e2e", "button.e2e.ts"), "export const case = 1;\n");
      writeFileSync(
        join(buttonDir, "moon.yml"),
        "deps:\n  - core\ntags:\n  - layer-primitives\nproject:\n  name: button\n",
      );
      const failures = runChecks(root);
      // Supporting the block form must not read it as tagged: a block
      // sequence without `e2e` fails exactly like the inline one does.
      expect(failures.some((f) => f.includes("tags omit `e2e`"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps reading the inline flow tags form", () => {
    const root = makeRoot();
    try {
      const buttonDir = join(root, "packages", "primitives", "button");
      mkdirSync(join(buttonDir, "e2e"), { recursive: true });
      writeFileSync(join(buttonDir, "e2e", "button.e2e.ts"), "export const case = 1;\n");
      writeFileSync(join(buttonDir, "moon.yml"), "tags: [layer-primitives, e2e]\n");
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("tags omit"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("says when a tags shape is unparsable instead of only claiming the tag is absent", () => {
    const root = makeRoot();
    try {
      const buttonDir = join(root, "packages", "primitives", "button");
      mkdirSync(join(buttonDir, "e2e"), { recursive: true });
      writeFileSync(join(buttonDir, "e2e", "button.e2e.ts"), "export const case = 1;\n");
      // A flow map carries `e2e` in its text; "tags omit `e2e`" on its own
      // would read as nonsense to the author who wrote exactly that. The
      // second clause names the real repair — reshape the key.
      writeFileSync(join(buttonDir, "moon.yml"), "tags: {e2e: true}\n");
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("cannot parse"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a facade *subpath* import — @ecoma-io/loom/theme is still the facade", () => {
    const root = makeRoot();
    try {
      writeFileSync(
        join(root, "packages", "primitives", "button", "src", "Button.vue"),
        'import { useTheme } from "@ecoma-io/loom/theme";\n',
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("public facade"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a *dashed* facade subpath — the \\w-only group was blind to @ecoma-io/loom/theme-css", () => {
    const root = makeRoot();
    try {
      writeFileSync(
        join(root, "packages", "primitives", "button", "src", "Button.vue"),
        'import { tokens } from "@ecoma-io/loom/theme-css";\n',
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("public facade"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a bare side-effect import of the facade — no `from`, no call parens", () => {
    const root = makeRoot();
    try {
      writeFileSync(
        join(root, "packages", "primitives", "button", "src", "Button.vue"),
        'import "@ecoma-io/loom";\n',
      );
      const failures = runChecks(root);
      // This spelling escapes check 5's `from`/`import(` grammar entirely, so
      // check 2 is the only reader that can report it — the assertion below is
      // what makes the ownership claim true rather than aspirational.
      const facadeFailures = failures.filter((f) => f.includes("public facade"));
      expect(facadeFailures).toHaveLength(1);
      expect(facadeFailures[0]).toContain("Button.vue");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a two-segment facade subpath — the one-segment caps were blind to it", () => {
    const root = makeRoot();
    try {
      writeFileSync(
        join(root, "packages", "primitives", "button", "src", "Button.vue"),
        'import "@ecoma-io/loom/styles/global.css";\n',
      );
      const failures = runChecks(root);
      // #269 finding 10: `@ecoma-io/loom/styles/global.css` is the documented
      // stylesheet spelling, and `(?:/[\w-]+)?` stopped after one segment.
      expect(failures.some((f) => f.includes("public facade"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("maps a two-segment internal subpath through check 5's unknown-specifier report", () => {
    const root = makeRoot();
    try {
      writeFileSync(
        join(root, "packages", "primitives", "button", "src", "Button.vue"),
        'import { deep } from "@ecoma-io/loom-core/src/internal/deep";\n',
      );
      const failures = runChecks(root);
      // Check 5's cap shared the same one-segment ceiling; a multi-segment
      // specifier of an internal package now reaches the specifier lookup
      // (and fails there, because no such module is a known package) instead
      // of passing unseen.
      expect(failures.some((f) => f.includes("not a known internal package"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("maps a *dotted* deep internal subpath through check 5's unknown-specifier report too", () => {
    const root = makeRoot();
    try {
      writeFileSync(
        join(root, "packages", "primitives", "button", "src", "Button.vue"),
        'import { theme } from "@ecoma-io/loom-core/src/theme.ts";\n',
      );
      const failures = runChecks(root);
      // The same deep path spelled with the file's extension: before the
      // specifier segments carried dots, this import compiled without any
      // reader seeing it — no unknown-specifier report, no declared-dependency
      // demand, nothing.
      expect(failures.some((f) => f.includes("not a known internal package"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports a facade import exactly once — check 2 owns the edge, check 5 stays silent", () => {
    const root = makeRoot();
    try {
      writeFileSync(
        join(root, "packages", "primitives", "button", "src", "Button.vue"),
        'import { Button } from "@ecoma-io/loom";\n',
      );
      const failures = runChecks(root);
      // Before 2G this one import drew three reports: check 2's facade rule,
      // check 5's facade rule, and check 7 demanding a package.json entry for
      // a dependency no internal package may declare. One edge, one report.
      expect(failures.filter((f) => f.includes("facade"))).toHaveLength(1);
      expect(failures.some((f) => f.includes("does not declare"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags an `export … from` spelling of the facade — the statement-anchored form still reads it", () => {
    const root = makeRoot();
    try {
      writeFileSync(
        join(root, "packages", "primitives", "button", "src", "Button.vue"),
        'export { Button } from "@ecoma-io/loom";\n',
      );
      const failures = runChecks(root);
      // The anchor that silences string-literal lookalikes is keyed on
      // `import`/`export` at a statement start, so re-exporting the facade —
      // the wrapped-barrel shape — must survive the anchor.
      expect(failures.some((f) => f.includes("public facade"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not report a string literal that quotes a facade import (#269 finding 5)", () => {
    const root = makeRoot();
    try {
      writeFileSync(
        join(root, "packages", "primitives", "button", "src", "Button.vue"),
        `throw new Error('import from "@ecoma-io/loom" instead');\n`,
      );
      const failures = runChecks(root);
      // The exact probe shape from #269: the `from "…"` fragment inside a
      // string used to satisfy the regex and report one facade violation
      // sourced from prose. Comments are stripped and statements are
      // anchored, so nothing here is an edge.
      expect(failures).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not report a string literal quoting an internal-package import", () => {
    const root = makeRoot();
    try {
      writeFileSync(
        join(root, "packages", "primitives", "button", "src", "Button.vue"),
        `const hint = 'x; import { cn } from "@ecoma-io/loom-core";';\n`,
      );
      const failures = runChecks(root);
      // Check 5's flavour of the same defect, in the shape that defeated the
      // first anchor attempt: a single-line string whose content holds
      // `; import … from "…"` — every statement-start character the anchor
      // could key on, all inside the string. A single- or double-quoted
      // string cannot contain a line break, which is what finally separates
      // this prose from a real import.
      expect(failures).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not report a string literal quoting check 8's adapter and engine edges", () => {
    const root = makeRoot();
    try {
      writeEngineFixture(root);
      // Check 8's rows read the same statements checks 2 and 5 read, so they
      // carried the same unanchored flaw: a module that *quotes* the forbidden
      // spelling — an error message teaching the rule — reported as the edge
      // it names. All three rows are statement-anchored now; this file quotes
      // one shape per row and must stay clean.
      writeFileSync(
        join(root, "packages", "composition", "stack", "src", "notes.ts"),
        [
          "const advice = [",
          "  'import { layout } from \"./layout\" would ship engine bytes;',",
          "  'export { layout } from \"../src/layout\" is the barrel chain;',",
          "  'import { pure } from \"@ecoma-io/loom-layout-engine/src/pure.ts\" is worse;',",
          '].join("\\n");',
        ].join("\n") + "\n",
      );
      expect(runChecks(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a backtick template-literal dynamic import", () => {
    const root = makeRoot();
    try {
      writeFileSync(
        join(root, "packages", "primitives", "button", "src", "Button.vue"),
        "const m = await import(`@ecoma-io/loom-button`);\n",
      );
      writeFileSync(
        join(root, "packages", "primitives", "button", "package.json"),
        JSON.stringify({
          name: "@ecoma-io/loom-button",
          exports: {},
          dependencies: { "@ecoma-io/loom-button": "workspace:*" },
        }),
      );
      const failures = runChecks(root);
      // A self-import is a known internal package — no "unknown" failure — and
      // a backtick specifier must still be counted as an edge, surfacing as a
      // cycle or no violation? A self-import creates a self-cycle.
      expect(failures.some((f) => f.startsWith("cycle:") || f.includes("facade"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a dependency cycle between two primitives", () => {
    const root = makeRoot();
    try {
      mkdirSync(join(root, "packages", "primitives", "chip", "src"), { recursive: true });
      writeFileSync(
        join(root, "packages", "primitives", "chip", "package.json"),
        JSON.stringify({
          name: "@ecoma-io/loom-chip",
          exports: {},
          dependencies: { "@ecoma-io/loom-button": "workspace:*" },
        }),
      );
      writeFileSync(
        join(root, "packages", "primitives", "chip", "src", "Chip.vue"),
        'import Button from "@ecoma-io/loom-button";\n',
      );
      // button → chip AND chip → button: a two-node cycle.
      writeFileSync(
        join(root, "packages", "primitives", "button", "src", "Button.vue"),
        'import Chip from "@ecoma-io/loom-chip";\n',
      );
      writeFileSync(
        join(root, "packages", "primitives", "button", "package.json"),
        JSON.stringify({
          name: "@ecoma-io/loom-button",
          exports: {},
          dependencies: { "@ecoma-io/loom-chip": "workspace:*" },
        }),
      );

      const failures = runChecks(root);
      expect(failures.some((f) => f.startsWith("cycle:"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags an import of an undeclared internal dependency", () => {
    const root = makeRoot();
    try {
      mkdirSync(join(root, "packages", "primitives", "chip", "src"), { recursive: true });
      writeFileSync(
        join(root, "packages", "primitives", "chip", "package.json"),
        JSON.stringify({ name: "@ecoma-io/loom-chip", exports: {} }),
      );
      writeFileSync(
        join(root, "packages", "primitives", "chip", "src", "Chip.vue"),
        'import Button from "@ecoma-io/loom-button";\n',
      );
      // button does not declare chip, so the edge is not mirrored into moon.
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("does not declare"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a component directory that is missing its moon.yml", () => {
    const root = makeRoot();
    try {
      mkdirSync(join(root, "packages", "primitives", "orphan", "src"), { recursive: true });
      writeFileSync(
        join(root, "packages", "primitives", "orphan", "package.json"),
        JSON.stringify({ name: "@ecoma-io/loom-orphan", exports: {} }),
      );
      writeFileSync(join(root, "packages", "primitives", "orphan", "src", "Orphan.vue"), "");
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("missing moon.yml"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a pattern importing a layout — Pattern below Layout in the text reader, so the edge is upward", () => {
    const root = makeRoot();
    try {
      // A pattern (rank 4) importing a layout (rank 5)
      // is the exact edge the inverted ranks forbid. `LAYERS` maps
      // patterns: 4, layouts: 5, so the text reader must report it.
      mkdirSync(join(root, "packages", "patterns", "title-bar", "src"), { recursive: true });
      writeFileSync(
        join(root, "packages", "patterns", "title-bar", "package.json"),
        JSON.stringify({ name: "@ecoma-io/loom-title-bar", exports: {} }),
      );
      writeFileSync(join(root, "packages", "patterns", "title-bar", "src", "TitleBar.vue"), "");
      mkdirSync(join(root, "packages", "layouts", "app-shell", "src"), { recursive: true });
      writeFileSync(
        join(root, "packages", "layouts", "app-shell", "package.json"),
        JSON.stringify({ name: "@ecoma-io/loom-app-shell", exports: {} }),
      );
      writeFileSync(join(root, "packages", "layouts", "app-shell", "src", "AppShell.vue"), "");
      // title-bar now imports app-shell — a pattern reaching up to a layout.
      writeFileSync(
        join(root, "packages", "patterns", "title-bar", "src", "TitleBar.vue"),
        'import AppShell from "@ecoma-io/loom-app-shell";\n',
      );
      writeFileSync(
        join(root, "packages", "patterns", "title-bar", "package.json"),
        JSON.stringify({
          name: "@ecoma-io/loom-title-bar",
          exports: {},
          dependencies: { "@ecoma-io/loom-app-shell": "workspace:*" },
        }),
      );

      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("imports the public facade"))).toBe(false);
      expect(failures.some((f) => f.includes("above"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
