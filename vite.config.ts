/// <reference types="vitest/config" />
import { cp } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";

const pkg = (path: string) => fileURLToPath(new URL(`packages/${path}`, import.meta.url));

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
      await cp(pkg("theme-core/src"), fileURLToPath(new URL("dist/styles", import.meta.url)), {
        recursive: true,
      });
    },
  };
}

export default defineConfig({
  plugins: [vue(), copyStylesheets()],
  resolve: {
    // Internal workspace packages are resolved to source so Vite (and Vitest)
    // can follow the imports without needing them installed in node_modules.
    // These aliases mirror the tsconfig paths and must stay in sync.
    alias: {
      // The testing subpath is listed before the bare package: a string alias
      // also matches the specifier it prefixes, and without this line
      // `@ecoma-io/loom-core/testing` would resolve to `index.ts/testing`.
      "@ecoma-io/loom-core/testing": pkg("core/src/testing/attach-to-body.ts"),
      // The a11y subpath is listed before the bare package for the same reason.
      "@ecoma-io/loom/a11y": pkg("loom/src/a11y.ts"),
      "@ecoma-io/loom-core": pkg("core/src/index.ts"),
      "@ecoma-io/loom-labels": pkg("labels/src/index.ts"),
      "@ecoma-io/loom-layout-engine": pkg("layout-engine/src/index.ts"),
      // Component package aliases. These are needed by Vitest so it can follow
      // imports without node_modules installation. The library build does not
      // use these paths (it starts from the loom entry and follows relative
      // imports). Each component package alias is added as it migrates.
      "@ecoma-io/loom-hover-card": pkg("primitives/hover-card/src/index.ts"),
      "@ecoma-io/loom-progress": pkg("primitives/progress/src/index.ts"),
      "@ecoma-io/loom-radial-progress": pkg("primitives/radial-progress/src/index.ts"),
      "@ecoma-io/loom-scroll-area": pkg("primitives/scroll-area/src/index.ts"),
      "@ecoma-io/loom-separator": pkg("primitives/separator/src/index.ts"),
      "@ecoma-io/loom-alert": pkg("primitives/alert/src/index.ts"),
      "@ecoma-io/loom-carousel": pkg("primitives/carousel/src/index.ts"),
      "@ecoma-io/loom-list": pkg("primitives/list/src/index.ts"),
      "@ecoma-io/loom-kbd": pkg("primitives/kbd/src/index.ts"),
      "@ecoma-io/loom-timeline": pkg("primitives/timeline/src/index.ts"),
      "@ecoma-io/loom-table": pkg("primitives/table/src/index.ts"),
      "@ecoma-io/loom-collapse": pkg("primitives/collapse/src/index.ts"),
      "@ecoma-io/loom-card": pkg("primitives/card/src/index.ts"),
      "@ecoma-io/loom-skeleton": pkg("primitives/skeleton/src/index.ts"),
      "@ecoma-io/loom-skip-link": pkg("primitives/skip-link/src/index.ts"),
      "@ecoma-io/loom-spinner": pkg("primitives/spinner/src/index.ts"),
      "@ecoma-io/loom-surface": pkg("primitives/surface/src/index.ts"),
      "@ecoma-io/loom-accordion": pkg("primitives/accordion/src/index.ts"),
      "@ecoma-io/loom-avatar": pkg("primitives/avatar/src/index.ts"),
      "@ecoma-io/loom-badge": pkg("primitives/badge/src/index.ts"),
      "@ecoma-io/loom-breadcrumb": pkg("primitives/breadcrumb/src/index.ts"),
      "@ecoma-io/loom-button": pkg("primitives/button/src/index.ts"),
      "@ecoma-io/loom-calendar": pkg("primitives/calendar/src/index.ts"),
      "@ecoma-io/loom-chip": pkg("primitives/chip/src/index.ts"),
      "@ecoma-io/loom-context-menu": pkg("primitives/context-menu/src/index.ts"),
      "@ecoma-io/loom-dropdown-menu": pkg("primitives/dropdown-menu/src/index.ts"),
      "@ecoma-io/loom-icon-button": pkg("primitives/icon-button/src/index.ts"),
      "@ecoma-io/loom-inline-error": pkg("primitives/inline-error/src/index.ts"),
      "@ecoma-io/loom-link": pkg("primitives/link/src/index.ts"),
      "@ecoma-io/loom-menubar": pkg("primitives/menubar/src/index.ts"),
      "@ecoma-io/loom-navigation-menu": pkg("primitives/navigation-menu/src/index.ts"),
      "@ecoma-io/loom-popover": pkg("primitives/popover/src/index.ts"),
      "@ecoma-io/loom-speed-dial": pkg("primitives/speed-dial/src/index.ts"),
      "@ecoma-io/loom-tabs": pkg("primitives/tabs/src/index.ts"),
      "@ecoma-io/loom-tooltip": pkg("primitives/tooltip/src/index.ts"),
      "@ecoma-io/loom-alert-dialog": pkg("primitives/alert-dialog/src/index.ts"),
      "@ecoma-io/loom-avatar-group": pkg("primitives/avatar-group/src/index.ts"),
      "@ecoma-io/loom-checkbox": pkg("primitives/checkbox/src/index.ts"),
      "@ecoma-io/loom-color-picker": pkg("primitives/color-picker/src/index.ts"),
      "@ecoma-io/loom-dialog": pkg("primitives/dialog/src/index.ts"),
      "@ecoma-io/loom-drawer": pkg("primitives/drawer/src/index.ts"),
      "@ecoma-io/loom-field": pkg("primitives/field/src/index.ts"),
      "@ecoma-io/loom-fieldset": pkg("primitives/fieldset/src/index.ts"),
      "@ecoma-io/loom-indicator": pkg("primitives/indicator/src/index.ts"),
      "@ecoma-io/loom-number-field": pkg("primitives/number-field/src/index.ts"),
      "@ecoma-io/loom-otp-input": pkg("primitives/otp-input/src/index.ts"),
      "@ecoma-io/loom-radio-group": pkg("primitives/radio-group/src/index.ts"),
      "@ecoma-io/loom-rating": pkg("primitives/rating/src/index.ts"),
      "@ecoma-io/loom-segmented-control": pkg("primitives/segmented-control/src/index.ts"),
      "@ecoma-io/loom-select": pkg("primitives/select/src/index.ts"),
      "@ecoma-io/loom-slider": pkg("primitives/slider/src/index.ts"),
      "@ecoma-io/loom-stepper": pkg("primitives/stepper/src/index.ts"),
      "@ecoma-io/loom-switch": pkg("primitives/switch/src/index.ts"),
      "@ecoma-io/loom-toast": pkg("primitives/toast/src/index.ts"),
      "@ecoma-io/loom-window-controls": pkg("primitives/window-controls/src/index.ts"),
      "@ecoma-io/loom-combobox": pkg("primitives/combobox/src/index.ts"),
      "@ecoma-io/loom-data-grid": pkg("primitives/data-grid/src/index.ts"),
      "@ecoma-io/loom-date-picker": pkg("primitives/date-picker/src/index.ts"),
      "@ecoma-io/loom-date-range-picker": pkg("primitives/date-range-picker/src/index.ts"),
      "@ecoma-io/loom-date-time-picker": pkg("primitives/date-time-picker/src/index.ts"),
      "@ecoma-io/loom-date-time-range-picker": pkg(
        "primitives/date-time-range-picker/src/index.ts",
      ),
      "@ecoma-io/loom-editable": pkg("primitives/editable/src/index.ts"),
      "@ecoma-io/loom-file-upload": pkg("primitives/file-upload/src/index.ts"),
      "@ecoma-io/loom-pagination": pkg("primitives/pagination/src/index.ts"),
      "@ecoma-io/loom-tags-input": pkg("primitives/tags-input/src/index.ts"),
      "@ecoma-io/loom-textarea": pkg("primitives/textarea/src/index.ts"),
      "@ecoma-io/loom-text-field": pkg("primitives/text-field/src/index.ts"),
      "@ecoma-io/loom-time-picker": pkg("primitives/time-picker/src/index.ts"),
      "@ecoma-io/loom-tree-view": pkg("primitives/tree-view/src/index.ts"),
      // Compositions.
      "@ecoma-io/loom-center": pkg("composition/center/src/index.ts"),
      "@ecoma-io/loom-frame": pkg("composition/frame/src/index.ts"),
      "@ecoma-io/loom-grid": pkg("composition/grid/src/index.ts"),
      "@ecoma-io/loom-inline": pkg("composition/inline/src/index.ts"),
      "@ecoma-io/loom-scroll-reel": pkg("composition/scroll-reel/src/index.ts"),
      "@ecoma-io/loom-sidebar": pkg("composition/sidebar/src/index.ts"),
      "@ecoma-io/loom-split": pkg("composition/split/src/index.ts"),
      "@ecoma-io/loom-stack": pkg("composition/stack/src/index.ts"),
      // Layouts.
      "@ecoma-io/loom-app-shell": pkg("layouts/app-shell/src/index.ts"),
      "@ecoma-io/loom-centered": pkg("layouts/centered/src/index.ts"),
      "@ecoma-io/loom-dashboard": pkg("layouts/dashboard/src/index.ts"),
      "@ecoma-io/loom-form-layout": pkg("layouts/form-layout/src/index.ts"),
      "@ecoma-io/loom-master-detail": pkg("layouts/master-detail/src/index.ts"),
      "@ecoma-io/loom-reading": pkg("layouts/reading/src/index.ts"),
      "@ecoma-io/loom-settings": pkg("layouts/settings/src/index.ts"),
      "@ecoma-io/loom-split-layout": pkg("layouts/split-layout/src/index.ts"),
      // Blocks.
      "@ecoma-io/loom-app-header": pkg("blocks/app-header/src/index.ts"),
      "@ecoma-io/loom-dashboard-grid": pkg("blocks/dashboard-grid/src/index.ts"),
      "@ecoma-io/loom-desktop-app-shell": pkg("blocks/desktop-app-shell/src/index.ts"),
      "@ecoma-io/loom-empty-state": pkg("blocks/empty-state/src/index.ts"),
      "@ecoma-io/loom-error-state": pkg("blocks/error-state/src/index.ts"),
      "@ecoma-io/loom-form-actions": pkg("blocks/form-actions/src/index.ts"),
      "@ecoma-io/loom-form-section": pkg("blocks/form-section/src/index.ts"),
      "@ecoma-io/loom-loading-state": pkg("blocks/loading-state/src/index.ts"),
      "@ecoma-io/loom-metric-card": pkg("blocks/metric-card/src/index.ts"),
      "@ecoma-io/loom-page-header": pkg("blocks/page-header/src/index.ts"),
      "@ecoma-io/loom-row-actions": pkg("blocks/row-actions/src/index.ts"),
      "@ecoma-io/loom-sidebar-nav": pkg("blocks/sidebar-nav/src/index.ts"),
      "@ecoma-io/loom-title-bar": pkg("blocks/title-bar/src/index.ts"),
      "@ecoma-io/loom-toast-stack": pkg("blocks/toast-stack/src/index.ts"),
      // Needed by packages/labels/src/label-registry.ts, which imports
      // component label types from the public surface. The alias points to
      // source so Vitest can follow it; the library build does not use this
      // path (it starts from src/index.ts and follows relative imports).
      "@ecoma-io/loom": pkg("loom/src/index.ts"),
    },
  },
  build: {
    // Library mode: consumers bundle this package, so nothing is minified for
    // them and no peer framework is ever inlined.
    lib: {
      entry: {
        index: pkg("loom/src/index.ts"),
        a11y: pkg("loom/src/a11y.ts"),
        theme: pkg("loom/src/theme.ts"),
      },
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
        preserveModulesRoot: "packages/loom/src",
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
    //
    // `packages/` is included so that Moon can run `vitest run` against
    // individual foundation packages (core, labels, theme-core) and find their
    // tests. The legacy `src/` tree is gone; coverage now guards the packages.
    include: ["packages/**/*.test.ts", "docs/**/*.test.ts", "tools/**/*.test.ts"],
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
      include: ["packages/**/*.{ts,vue}"],
      // A demo is documentation that happens to compile. The docs site renders
      // it and the end-to-end suite drives it, so it is covered where covering
      // it means something — not by a unit test asserting a gallery renders.
      // Playwright specs are the same class of thing and exclude themselves.
      exclude: [
        "packages/**/*.test.ts",
        "packages/**/*Demo.vue",
        "packages/**/*.d.ts",
        "packages/**/e2e/**",
      ],
      // Set just under what the suite actually reaches (measured: 96.65 lines /
      // 94.94 functions / 91.83 branches / 95.27 statements), not at a round
      // number well below it. A floor with fifteen points of headroom cannot go
      // red: whole components could arrive untested and the gate would still
      // pass, which makes it a report rather than a check. The small gap left
      // here absorbs a legitimate refactor without demanding the numbers be
      // edited in the same commit; a drop past it means coverage was lost, and
      // the fix is a test, not a lower floor.
      thresholds: { lines: 95, functions: 93, branches: 90, statements: 94 },
    },
  },
});
