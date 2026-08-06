/// <reference types="vitest/config" />
import { cp } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";

const src = (path: string) => fileURLToPath(new URL(`src/${path}`, import.meta.url));

/**
 * The stylesheets ship as authored, not as built.
 *
 * `theme.css` is a `@theme` block and `global.css` opens with
 * `@import "tailwindcss"`. Running either through this build would resolve
 * them against *our* Tailwind and freeze the result, which is the opposite of
 * what a theme is for — the consumer's own Tailwind has to see the source. So
 * the whole directory is copied verbatim, fonts and licence included.
 */
function copyStylesheets(): Plugin {
  return {
    name: "loom:copy-stylesheets",
    apply: "build",
    async closeBundle() {
      await cp(src("styles"), fileURLToPath(new URL("dist/styles", import.meta.url)), {
        recursive: true,
      });
    },
  };
}

export default defineConfig({
  plugins: [vue(), copyStylesheets()],
  build: {
    // Library mode: consumers bundle this package, so nothing is minified for
    // them and no peer framework is ever inlined.
    lib: {
      entry: { index: src("index.ts"), a11y: src("a11y.ts") },
      formats: ["es"],
    },
    minify: false,
    sourcemap: true,
    rollupOptions: {
      // Everything a consumer could plausibly already have, or would want to
      // deduplicate. Bundling Vue breaks reactivity outright; bundling Reka
      // would ship a second copy of its focus and portal machinery alongside
      // the consumer's.
      external: [
        "vue",
        "reka-ui",
        "@lucide/vue",
        "clsx",
        "tailwind-merge",
        "class-variance-authority",
      ],
      output: {
        // One output file per source module rather than one bundle. A consumer
        // importing `Button` alone should not pull a dialog's focus trap in
        // through a shared chunk, and preserved modules make that true without
        // depending on how clever their bundler is.
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].js",
      },
    },
  },
  test: {
    globals: false,
    environment: "jsdom",
    // Both co-located tiers, one runtime: `*.test.ts` (unit — every
    // project-internal collaborator stubbed) and `*.integration.test.ts` (real
    // collaborators, where the composition itself is the behaviour under
    // test). An integration file IS a `.test.ts`, so one glob covers both.
    // `docs/` is here because the documentation site is not only markdown: the
    // sidebar is derived from the page tree and the token tables are parsed out
    // of `theme.css`, and both are ordinary code that can be ordinarily wrong.
    // A defect there fails the same way a missing page does — the site builds,
    // nothing errors, and the only symptom is a reader seeing the wrong thing.
    include: ["src/**/*.test.ts", "docs/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    // One worker, deliberately. Creating a jsdom per isolated file dominates
    // the run, so several at once oversubscribe the machine and turn
    // timing-sensitive tests flaky rather than faster. The trade is wall-clock
    // for determinism. Raise it only with a measurement showing the contention
    // is gone, never because a run felt slow.
    maxWorkers: 1,
    // A contention budget, not a slow-test budget: a loaded machine stretches
    // a jsdom test far past Vitest's 5s default. A real hang never resolves
    // and still fails; a test whose idle cost approaches this is a defect to
    // fix, not a budget to raise.
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      enabled: true,
      include: ["src/**/*.{ts,vue}"],
      // A demo is documentation that happens to compile. The docs site renders
      // it and the end-to-end suite drives it, so it is covered where covering
      // it means something — not by a unit test asserting a gallery renders.
      exclude: ["src/**/*.test.ts", "src/**/*Demo.vue", "src/**/*.d.ts"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
