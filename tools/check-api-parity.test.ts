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
  writeFileSync(join(root, "packages", "loom", "src", "index.ts"), "export {};\n");
  writeFileSync(join(root, "packages", "loom", "src", "a11y.ts"), "export {};\n");
  writeFileSync(join(root, "packages", "loom", "src", "theme.ts"), "export {};\n");
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
      const failures = runChecks(root);
      // The exports map, build, declarations, styles and consumer docs all
      // agree; the only mention of the removed subpath lives in
      // docs/architecture/baseline.md, which must not resurrect it.
      expect(failures).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
