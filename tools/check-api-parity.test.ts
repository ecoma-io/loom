// @vitest-environment node
//
// Node rather than the project-wide jsdom, because these tests exercise the
// api-parity gate against fixture trees on the filesystem — the same reason
// docs/.vitepress/sidebar.test.ts opts out of jsdom.
//
// The parity gate is itself tested because a check that always passes is not
// a check. Each case builds a minimal tree with exactly the shape needed to
// trip one rule — a subpath absent from the build, a documented reference the
// exports map never lists, an exports entry whose source file does not exist
// — and asserts that runChecks() reports it. The fixtures are also how the
// rule is kept honest in the other direction: a tree where the exports map,
// the vite build entries, the declarations and the docs agree must report
// zero violations, so a future over-eager rule fails loudly rather than
// quietly blocking every component.
import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runChecks } from "./check-api-parity.ts";

/** A minimal but valid tree: every JS unit, stylesheet and docs reference in parity. */
function writeFixture(root: string): void {
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "@ecoma-io/loom",
      exports: {
        ".": { types: "./dist/index.d.ts", default: "./dist/index.js" },
        "./a11y": { types: "./dist/a11y.d.ts", default: "./dist/a11y.js" },
        "./theme": { types: "./dist/theme.d.ts", default: "./dist/theme.js" },
        "./styles/global.css": "./dist/styles/global.css",
        "./styles/theme.css": "./dist/styles/theme.css",
        "./styles/fonts.css": "./dist/styles/fonts.css",
        "./package.json": "./package.json",
      },
    }),
  );
  writeFileSync(
    join(root, "vite.config.ts"),
    [
      "export default defineConfig({",
      "  build: {",
      "    lib: {",
      "      entry: {",
      '        index: pkg("loom/src/index.ts"),',
      '        a11y: pkg("loom/src/a11y.ts"),',
      '        theme: pkg("loom/src/theme.ts"),',
      "      },",
      "      formats: ['es'],",
      "    },",
      "  },",
      "})",
    ].join("\n"),
  );
  mkdirSync(join(root, "packages", "loom", "src"), { recursive: true });
  writeFileSync(
    join(root, "packages", "loom", "src", "index.ts"),
    [
      "// The facade surface, plus the register the parity gate parses. Every",
      "// name re-exported here must be mentioned in a docs/ page, and every",
      "// barrel export withheld here must carry one of the records below.",
      'export { default as StubDefault, Stub, useStubTheme } from "@ecoma-io/loom-stub";',
      "// @internal stubInternal — package-side helper; the facade ships the composed behaviour",
      "// @internal stubExtra — star-expanded helper module the facade deliberately withholds",
      "// @internal-doc StubNode — internal sub-component rendered by Stub; not independently importable",
      "",
    ].join("\n"),
  );
  writeFileSync(join(root, "packages", "loom", "src", "a11y.ts"), "export {};\n");
  writeFileSync(join(root, "packages", "loom", "src", "theme.ts"), "export {};\n");
  // The facade manifest and the tsconfig paths: the two extra copies of the
  // subpath set that the mirror leg holds to the root exports map.
  writeFacadeManifest(root, ["a11y", "theme"]);
  writeTsconfigPaths(root, ["a11y", "theme"]);
  // A sibling barrel with the export shapes the identifier legs judge: a
  // default binding, a named clause, and a star the gate must expand.
  mkdirSync(join(root, "packages", "primitives", "stub", "src"), { recursive: true });
  writeFileSync(
    join(root, "packages", "primitives", "stub", "package.json"),
    JSON.stringify({ name: "@ecoma-io/loom-stub" }),
  );
  writeStubBarrel(root);
  writeFileSync(
    join(root, "packages", "primitives", "stub", "src", "more.ts"),
    "export const stubExtra = 1;\n",
  );
  mkdirSync(join(root, "packages", "theme-core", "src"), { recursive: true });
  writeFileSync(join(root, "packages", "theme-core", "src", "global.css"), "");
  writeFileSync(join(root, "packages", "theme-core", "src", "theme.css"), "");
  writeFileSync(join(root, "packages", "theme-core", "src", "fonts.css"), "");
  mkdirSync(join(root, "docs", ".vitepress"), { recursive: true });
  writeFileSync(
    join(root, "docs", ".vitepress", "config.mts"),
    [
      "export default defineConfig({",
      "  vite: {",
      "    resolve: {",
      "      alias: {",
      '        "@ecoma-io/loom/a11y": fileURLToPath(new URL("../../packages/loom/src/a11y.ts", import.meta.url)),',
      '        "@ecoma-io/loom/theme": fileURLToPath(new URL("../../packages/loom/src/theme.ts", import.meta.url)),',
      '        "@ecoma-io/loom": fileURLToPath(new URL("../../packages/loom/src/index.ts", import.meta.url)),',
      "      },",
      "    },",
      "  },",
      "})",
    ].join("\n"),
  );
  mkdirSync(join(root, "docs", "components"), { recursive: true });
  writeFileSync(
    join(root, "docs", "components", "toast.md"),
    [
      'import { useTheme } from "@ecoma-io/loom/theme";',
      'import "@ecoma-io/loom/styles/global.css";',
      'import "@ecoma-io/loom/styles/theme.css";',
      'import "@ecoma-io/loom/styles/fonts.css";',
      'import { WCAG_TAGS } from "@ecoma-io/loom/a11y";',
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(root, "docs", "components", "stub.md"),
    [
      "`Stub` renders with `useStubTheme`; the barrel's default binding ships",
      "through the facade as `StubDefault`.",
      "",
      "<!-- @api Stub -->",
      "<!-- @api StubNode -->",
      "",
    ].join("\n"),
  );
}

/** The barrel every identifier case starts from — rewritten whole by the mutations. */
function writeStubBarrel(root: string, extra: string[] = []): void {
  writeFileSync(
    join(root, "packages", "primitives", "stub", "src", "index.ts"),
    [
      'export { default } from "./Stub.vue";',
      'export { default as Stub } from "./Stub.vue";',
      'export { useStubTheme, stubInternal } from "./helpers.ts";',
      'export * from "./more.ts";',
      ...extra,
      "",
    ].join("\n"),
  );
}

/** The facade manifest's `exports` map: the bare entry plus the given subpaths. */
function writeFacadeManifest(root: string, subpaths: string[]): void {
  const exports: Record<string, unknown> = {
    ".": { types: "./dist/index.d.ts", default: "./dist/index.js" },
  };
  for (const name of subpaths) {
    exports[`./${name}`] = { types: `./dist/${name}.d.ts`, default: `./dist/${name}.js` };
  }
  writeFileSync(
    join(root, "packages", "loom", "package.json"),
    JSON.stringify({ name: "@ecoma-io/loom-facade", exports }),
  );
}

/** The tsconfig `paths` table: the bare facade key plus the given subpaths. */
function writeTsconfigPaths(root: string, subpaths: string[]): void {
  const paths: Record<string, string[]> = {
    "@ecoma-io/loom": ["./packages/loom/src/index.ts"],
  };
  for (const name of subpaths) {
    paths[`@ecoma-io/loom/${name}`] = [`./packages/loom/src/${name}.ts`];
  }
  writeFileSync(
    join(root, "tsconfig.base.json"),
    JSON.stringify({ compilerOptions: { paths } }, null, 2),
  );
}

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "loom-parity-"));
  writeFixture(root);
  return root;
}

describe("runChecks", () => {
  it("reports zero violations for a tree where every surface agrees", () => {
    const root = makeRoot();
    try {
      expect(runChecks(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a subpath in exports that has no vite build entry", () => {
    const root = makeRoot();
    try {
      // exports still carries ./theme but the build no longer emits it.
      writeFileSync(
        join(root, "vite.config.ts"),
        [
          "export default defineConfig({",
          "  build: {",
          "    lib: {",
          "      entry: {",
          '        index: pkg("loom/src/index.ts"),',
          "      },",
          "    },",
          "  },",
          "})",
        ].join("\n"),
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes('entry named "theme"'))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a documented @ecoma-io/loom/theme reference missing from exports", () => {
    const root = makeRoot();
    try {
      // docs/ still demonstrate the theme import but the exports map dropped it.
      writeFileSync(
        join(root, "package.json"),
        JSON.stringify({
          name: "@ecoma-io/loom",
          exports: {
            ".": { types: "./dist/index.d.ts", default: "./dist/index.js" },
            "./a11y": { types: "./dist/a11y.d.ts", default: "./dist/a11y.js" },
            "./styles/global.css": "./dist/styles/global.css",
            "./styles/theme.css": "./dist/styles/theme.css",
            "./styles/fonts.css": "./dist/styles/fonts.css",
            "./package.json": "./package.json",
          },
        }),
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("@ecoma-io/loom/theme"))).toBe(true);
      expect(failures.some((f) => f.includes("does not list ./theme"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags an exports ./theme whose declaration file is missing", () => {
    const root = makeRoot();
    try {
      // exports and the build both name theme, but the declaration went away.
      rmSync(join(root, "packages", "loom", "src", "theme.ts"));
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("theme.ts declaration"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags an exports ./styles/*.css whose source stylesheet is missing", () => {
    const root = makeRoot();
    try {
      // exports lists fonts.css but theme-core/src has no such stylesheet.
      rmSync(join(root, "packages", "theme-core", "src", "fonts.css"));
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("fonts.css"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a build entry and declaration that were never added to exports", () => {
    const root = makeRoot();
    try {
      // The other direction: the build and source carry `markdown`, but the
      // exports map never lists it, so consumers can never reach it.
      writeFileSync(
        join(root, "package.json"),
        JSON.stringify({
          name: "@ecoma-io/loom",
          exports: {
            ".": { types: "./dist/index.d.ts", default: "./dist/index.js" },
            "./a11y": { types: "./dist/a11y.d.ts", default: "./dist/a11y.js" },
            "./theme": { types: "./dist/theme.d.ts", default: "./dist/theme.js" },
            "./styles/global.css": "./dist/styles/global.css",
            "./styles/theme.css": "./dist/styles/theme.css",
            "./styles/fonts.css": "./dist/styles/fonts.css",
            "./package.json": "./package.json",
          },
        }),
      );
      writeFileSync(
        join(root, "vite.config.ts"),
        [
          "export default defineConfig({",
          "  build: {",
          "    lib: {",
          "      entry: {",
          '        index: pkg("loom/src/index.ts"),',
          '        markdown: pkg("loom/src/markdown.ts"),',
          "      },",
          "    },",
          "  },",
          "})",
        ].join("\n"),
      );
      mkdirSync(join(root, "packages", "loom", "src"), { recursive: true });
      writeFileSync(join(root, "packages", "loom", "src", "markdown.ts"), "export {};\n");
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes('vite build entry "markdown" is not exported'))).toBe(
        true,
      );
      expect(failures.some((f) => f.includes("./markdown"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags an exported subpath that has no docs alias in the VitePress config", () => {
    const root = makeRoot();
    try {
      // exports, build, declaration and docs all carry `a11y`, but the docs
      // config never aliases it — a snippet on the site could not resolve.
      writeFileSync(
        join(root, "docs", ".vitepress", "config.mts"),
        [
          "export default defineConfig({",
          "  vite: {",
          "    resolve: {",
          "      alias: {",
          '        "@ecoma-io/loom/theme": fileURLToPath(new URL("../../packages/loom/src/theme.ts", import.meta.url)),',
          '        "@ecoma-io/loom": fileURLToPath(new URL("../../packages/loom/src/index.ts", import.meta.url)),',
          "      },",
          "    },",
          "  },",
          "})",
        ].join("\n"),
      );
      const failures = runChecks(root);
      expect(
        failures.some((f) => f.includes("./a11y has no alias in docs/.vitepress/config.mts")),
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a subpath alias listed after the bare entry (shadowed and unresolvable)", () => {
    const root = makeRoot();
    try {
      // The injective case that actually shipped once: the bare `@ecoma-io/loom`
      // alias precedes the subpath, so Vite's first-match prefix resolves
      // `@ecoma-io/loom/theme` to `index.ts/theme`.
      writeFileSync(
        join(root, "docs", ".vitepress", "config.mts"),
        [
          "export default defineConfig({",
          "  vite: {",
          "    resolve: {",
          "      alias: {",
          '        "@ecoma-io/loom/a11y": fileURLToPath(new URL("../../packages/loom/src/a11y.ts", import.meta.url)),',
          '        "@ecoma-io/loom": fileURLToPath(new URL("../../packages/loom/src/index.ts", import.meta.url)),',
          '        "@ecoma-io/loom/theme": fileURLToPath(new URL("../../packages/loom/src/theme.ts", import.meta.url)),',
          "      },",
          "    },",
          "  },",
          "})",
        ].join("\n"),
      );
      const failures = runChecks(root);
      // Only the mis-ordered one is flagged: theme (after the bare) is
      // shadowed, so it can never resolve; a11y (before the bare) is fine.
      expect(
        failures.some((f) => f.includes("@ecoma-io/loom/theme is listed after the bare")),
      ).toBe(true);
      expect(failures.some((f) => f.includes("@ecoma-io/loom/a11y is listed after the bare"))).toBe(
        false,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a re-added internal-package alias in the docs config", () => {
    const root = makeRoot();
    try {
      // The B1 relapse: a dash-form internal alias back in the docs config.
      // The facade-ordering legs cannot see it — their reader matches the
      // facade and its subpaths only — so this failure is its own leg.
      writeFileSync(
        join(root, "docs", ".vitepress", "config.mts"),
        [
          "export default defineConfig({",
          "  vite: {",
          "    resolve: {",
          "      alias: {",
          '        "@ecoma-io/loom/a11y": fileURLToPath(new URL("../../packages/loom/src/a11y.ts", import.meta.url)),',
          '        "@ecoma-io/loom/theme": fileURLToPath(new URL("../../packages/loom/src/theme.ts", import.meta.url)),',
          '        "@ecoma-io/loom-accordion": fileURLToPath(new URL("../../packages/primitives/accordion/src/index.ts", import.meta.url)),',
          '        "@ecoma-io/loom": fileURLToPath(new URL("../../packages/loom/src/index.ts", import.meta.url)),',
          "      },",
          "    },",
          "  },",
          "})",
        ].join("\n"),
      );
      const failures = runChecks(root);
      expect(
        failures.some((f) => f.includes("@ecoma-io/loom-accordion is an internal-package alias")),
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("ignores subpath mentions inside docs/architecture/ (the frozen audit record)", () => {
    const root = makeRoot();
    try {
      // A historical mention in an audit/migration doc must not become a
      // binding contract on today's exports map.
      const architecture = join(root, "docs", "architecture");
      mkdirSync(architecture, { recursive: true });
      writeFileSync(
        join(architecture, "baseline.md"),
        'Assume a legacy subpath "theme" was referenced as @ecoma-io/loom/theme.\n',
      );
      // toast.md (a consumer-facing page) must also drop the theme import, so
      // the removed subpath is mentioned only inside docs/architecture/.
      writeFileSync(
        join(root, "docs", "components", "toast.md"),
        [
          'import "@ecoma-io/loom/styles/global.css";',
          'import "@ecoma-io/loom/styles/theme.css";',
          'import "@ecoma-io/loom/styles/fonts.css";',
          'import { WCAG_TAGS } from "@ecoma-io/loom/a11y";',
          "",
        ].join("\n"),
      );
      // Instead of adding a new entry, drop the exports/theme and its docs
      // mention — everything else stays in parity.
      writeFileSync(
        join(root, "package.json"),
        JSON.stringify({
          name: "@ecoma-io/loom",
          exports: {
            ".": { types: "./dist/index.d.ts", default: "./dist/index.js" },
            "./a11y": { types: "./dist/a11y.d.ts", default: "./dist/a11y.js" },
            "./styles/global.css": "./dist/styles/global.css",
            "./styles/theme.css": "./dist/styles/theme.css",
            "./styles/fonts.css": "./dist/styles/fonts.css",
            "./package.json": "./package.json",
          },
        }),
      );
      mkdirSync(join(root, "packages", "loom", "src"), { recursive: true });
      rmSync(join(root, "packages", "loom", "src", "theme.ts"));
      writeFileSync(
        join(root, "vite.config.ts"),
        [
          "export default defineConfig({",
          "  build: {",
          "    lib: {",
          "      entry: {",
          '        index: pkg("loom/src/index.ts"),',
          '        a11y: pkg("loom/src/a11y.ts"),',
          "      },",
          "    },",
          "  },",
          "})",
        ].join("\n"),
      );
      // The docs config still aliases theme — without the exports entry, that
      // would be flagged too. Keep it consistent with the removal.
      writeFileSync(
        join(root, "docs", ".vitepress", "config.mts"),
        [
          "export default defineConfig({",
          "  vite: {",
          "    resolve: {",
          "      alias: {",
          '        "@ecoma-io/loom/a11y": fileURLToPath(new URL("../../packages/loom/src/a11y.ts", import.meta.url)),',
          '        "@ecoma-io/loom": fileURLToPath(new URL("../../packages/loom/src/index.ts", import.meta.url)),',
          "      },",
          "    },",
          "  },",
          "})",
        ].join("\n"),
      );
      // The two mirror files the subpath leg reads have to drop the subpath
      // with the exports map — that is the leg's own rule.
      writeFacadeManifest(root, ["a11y"]);
      writeTsconfigPaths(root, ["a11y"]);
      const failures = runChecks(root);
      // The exports map, build, declarations, styles and consumer docs all
      // agree; the only mention of the removed subpath lives in
      // docs/architecture/baseline.md, which must not resurrect it.
      expect(failures).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a barrel export no facade entry re-exports and no record withholds", () => {
    const root = makeRoot();
    try {
      // A new export appears in the barrel and nowhere else — exactly the
      // silent-public-surface growth the identifier legs exist to catch.
      writeStubBarrel(root, ["export const stubSurprise = 1;"]);
      const failures = runChecks(root);
      expect(
        failures.some(
          (f) =>
            f.includes('exports "stubSurprise"') && f.includes("no facade entry re-exports it"),
        ),
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a register record whose identifier a facade entry re-exports", () => {
    const root = makeRoot();
    try {
      // The other direction: the record survives a re-export that resolved it.
      writeFileSync(
        join(root, "packages", "loom", "src", "index.ts"),
        [
          'export { default as StubDefault, Stub, useStubTheme } from "@ecoma-io/loom-stub";',
          "// @internal stubInternal — package-side helper; the facade ships the composed behaviour",
          "// @internal stubExtra — star-expanded helper module the facade deliberately withholds",
          "// @internal Stub — recorded before the facade started re-exporting it",
          "// @internal-doc StubNode — internal sub-component rendered by Stub; not independently importable",
          "",
        ].join("\n"),
      );
      const failures = runChecks(root);
      expect(
        failures.some(
          (f) =>
            f.includes("@internal Stub") &&
            f.includes("records a withheld identifier, but a facade entry exports it"),
        ),
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a withheld-default record once the facade re-exports that default", () => {
    const root = makeRoot();
    try {
      // The facade now re-exports the stub's default, so the scoped record
      // describes a decision that was unmade.
      writeFileSync(
        join(root, "packages", "loom", "src", "index.ts"),
        [
          'export { default as StubDefault, Stub, useStubTheme } from "@ecoma-io/loom-stub";',
          "// @internal stubInternal — package-side helper; the facade ships the composed behaviour",
          "// @internal stubExtra — star-expanded helper module the facade deliberately withholds",
          "// @internal stub:default — recorded before the facade named the default",
          "// @internal-doc StubNode — internal sub-component rendered by Stub; not independently importable",
          "",
        ].join("\n"),
      );
      const failures = runChecks(root);
      expect(
        failures.some(
          (f) =>
            f.includes("@internal stub:default") &&
            f.includes(
              "records a withheld default, but a facade entry re-exports that package's default",
            ),
        ),
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a register record no barrel export justifies any more", () => {
    const root = makeRoot();
    try {
      // A record for a name nothing exports: stale prose reading as deliberate.
      writeFileSync(
        join(root, "packages", "loom", "src", "index.ts"),
        [
          'export { default as StubDefault, Stub, useStubTheme } from "@ecoma-io/loom-stub";',
          "// @internal stubInternal — package-side helper; the facade ships the composed behaviour",
          "// @internal stubExtra — star-expanded helper module the facade deliberately withholds",
          "// @internal ghostExport — withheld from a barrel that no longer exports it",
          "// @internal-doc StubNode — internal sub-component rendered by Stub; not independently importable",
          "",
        ].join("\n"),
      );
      const failures = runChecks(root);
      expect(
        failures.some(
          (f) => f.includes("@internal ghostExport") && f.includes("no package barrel exports it"),
        ),
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags an @api marker naming a component no consumer can import", () => {
    const root = makeRoot();
    try {
      // The generated-table leg, unrecorded direction: a marker whose table
      // promises props for surface the facade never shipped.
      writeFileSync(
        join(root, "docs", "components", "stub.md"),
        [
          "`Stub` renders with `useStubTheme`; the barrel's default binding ships",
          "through the facade as `StubDefault`.",
          "",
          "<!-- @api Stub -->",
          "<!-- @api StubNode -->",
          "<!-- @api StubUnimported -->",
          "",
        ].join("\n"),
      );
      const failures = runChecks(root);
      expect(
        failures.some(
          (f) =>
            f.includes("docs/components/stub.md") && f.includes('@api marker for "StubUnimported"'),
        ),
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags an @internal-doc record whose name the facade exports", () => {
    const root = makeRoot();
    try {
      // The recorded direction of the marker leg: the exception outlived the
      // withholding it justified.
      writeFileSync(
        join(root, "packages", "loom", "src", "index.ts"),
        [
          'export { default as StubDefault, Stub, useStubTheme } from "@ecoma-io/loom-stub";',
          "// @internal stubInternal — package-side helper; the facade ships the composed behaviour",
          "// @internal stubExtra — star-expanded helper module the facade deliberately withholds",
          "// @internal-doc StubNode — internal sub-component rendered by Stub; not independently importable",
          "// @internal-doc Stub — recorded before Stub became importable",
          "",
        ].join("\n"),
      );
      const failures = runChecks(root);
      expect(
        failures.some(
          (f) => f.includes("@internal-doc Stub ") && f.includes("but the facade exports it"),
        ),
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a facade export no docs page mentions", () => {
    const root = makeRoot();
    try {
      // The docs-coverage leg: surface reached the facade without a word of
      // consumer-facing documentation.
      writeFileSync(
        join(root, "packages", "loom", "src", "index.ts"),
        [
          'export { default as StubDefault, Stub, useStubTheme } from "@ecoma-io/loom-stub";',
          "export const stubOrphan = 1;",
          "// @internal stubInternal — package-side helper; the facade ships the composed behaviour",
          "// @internal stubExtra — star-expanded helper module the facade deliberately withholds",
          "// @internal-doc StubNode — internal sub-component rendered by Stub; not independently importable",
          "",
        ].join("\n"),
      );
      const failures = runChecks(root);
      expect(
        failures.some(
          (f) => f.includes('"stubOrphan"') && f.includes("mentioned in no docs/ page"),
        ),
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a subpath the facade manifest drops while the other copies keep it", () => {
    const root = makeRoot();
    try {
      // Workspace resolution breaks on the manifest alone; the published
      // files, the build and the type-checker all still agree.
      writeFacadeManifest(root, ["a11y"]);
      const failures = runChecks(root);
      expect(
        failures.some(
          (f) => f.includes("./theme") && f.includes("missing from packages/loom/package.json"),
        ),
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a tsconfig paths entry mirroring no exported subpath", () => {
    const root = makeRoot();
    try {
      // The type-checker can resolve a subpath the package never exports —
      // the one copy of the surface the published files cannot see.
      writeTsconfigPaths(root, ["a11y", "theme", "markdown"]);
      const failures = runChecks(root);
      expect(
        failures.some(
          (f) => f.includes("./markdown") && f.includes("carried by tsconfig.base.json"),
        ),
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a facade entry whose export clause does not parse", () => {
    const root = makeRoot();
    try {
      // The facade-side parser must honour the same fail-closed contract the
      // barrel side does: a clause it cannot read fails by file and clause,
      // it does not silently contribute nothing.
      writeFileSync(
        join(root, "packages", "loom", "src", "theme.ts"),
        'export { useTheme as } from "@ecoma-io/loom-core";\n',
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("theme.ts: unparseable export specifier"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a destructuring export in a facade entry", () => {
    const root = makeRoot();
    try {
      // `export const { a, b } = …` publishes names no clause-shaped reader
      // can see; the parser records it as unread instead of letting both
      // names walk past every identifier leg.
      writeFileSync(
        join(root, "packages", "loom", "src", "theme.ts"),
        [
          "const probeSource = { GhostA: 1, GhostB: 2 };",
          "export const { GhostA, GhostB } = probeSource;",
          "",
        ].join("\n"),
      );
      const failures = runChecks(root);
      expect(failures.some((f) => f.includes("theme.ts: destructuring export"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("expands a relative star export in a facade entry into the surface it publishes", () => {
    const root = makeRoot();
    try {
      // A star re-export is real surface: a11y.ts's export reaches consumers
      // through theme.ts's star, so it joins the facade names and falls under
      // the docs-coverage leg like any other export.
      writeFileSync(
        join(root, "packages", "loom", "src", "a11y.ts"),
        "export const stubA11y = 1;\n",
      );
      writeFileSync(
        join(root, "packages", "loom", "src", "theme.ts"),
        ['export * from "./a11y.ts";', ""].join("\n"),
      );
      // Undocumented, the expanded name fails exactly like a named one.
      const undocumented = runChecks(root);
      expect(
        undocumented.some(
          (f) => f.includes('"stubA11y"') && f.includes("mentioned in no docs/ page"),
        ),
      ).toBe(true);
      // Documented, the same tree is clean — expansion, not exemption.
      writeFileSync(
        join(root, "docs", "components", "stub.md"),
        [
          "`Stub` renders with `useStubTheme`; the barrel's default binding ships",
          "through the facade as `StubDefault`. The a11y entry's own export is",
          "`stubA11y`.",
          "",
          "<!-- @api Stub -->",
          "<!-- @api StubNode -->",
          "",
        ].join("\n"),
      );
      expect(runChecks(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags a facade star re-export the gate cannot expand", () => {
    const root = makeRoot();
    try {
      // A star of a bare package specifier publishes whatever the source
      // exports today; the gate cannot read that surface, so it fails named
      // instead of waving the entry through.
      writeFileSync(
        join(root, "packages", "loom", "src", "theme.ts"),
        [
          'export { useTheme, themeScript } from "@ecoma-io/loom-core";',
          'export * from "@ecoma-io/loom-core";',
          "",
        ].join("\n"),
      );
      const failures = runChecks(root);
      expect(
        failures.some(
          (f) =>
            f.includes('re-exports * from "@ecoma-io/loom-core"') &&
            f.includes("expands relative star exports only"),
        ),
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
