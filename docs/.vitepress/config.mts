import { fileURLToPath } from "node:url";
import { defineConfig, type UserConfig } from "vitepress";
import tailwindcss from "@tailwindcss/vite";
import { componentApi } from "./plugins/component-api";
import { designTokens } from "./plugins/design-tokens";
import { pagesIn } from "./sidebar";
import { BASE } from "./base";

// VitePress 1.x pins its own Vite 5 and drives it directly, while the library
// build runs on the repository's Vite 8 — two copies in the tree, each doing a
// separate job. They agree at runtime and disagree in the type system, because
// `Plugin` is nominally distinct between the two installations.
//
// The alternatives were worse: forcing VitePress onto Vite 8 through a package
// manager override runs a stable tool against a major it was never tested on,
// and VitePress 2 — the release that takes a modern Vite — is still an alpha,
// which is not what a published site's build should stand on. So the mismatch
// is confined to this one conversion, where it is visible.
type VitePlugins = NonNullable<NonNullable<UserConfig["vite"]>["plugins"]>;

// The component pages, read off the directory. The nav's "Components" entry
// needs somewhere to land, and naming one component there would make that
// component's page the one nobody may rename; the first alphabetically is
// arbitrary in a way that costs nothing.
const COMPONENTS = pagesIn("components");

// Composition primitives are a separate tier between primitives and blocks.
// They answer "how are things arranged?" — layout intent, not content or
// control configuration. A curated order puts the most fundamental patterns
// first: vertical flow, horizontal flow, grid, then the special-purpose
// compositions.
const COMPOSITION = pagesIn("composition", [
  "stack",
  "inline",
  "grid",
  "split",
  "center",
  "sidebar",
  "frame",
  "scroll-reel",
]);

// Blocks are a separate directory and a separate sidebar group because they
// answer a different question. A reader looking for a primitive knows the name
// of the control they want; a reader looking for a block knows the shape of the
// screen they are building and not what it is called here. Folding the two into
// one alphabetical list would bury the second reader's eight pages among the
// first reader's twenty-seven.
const BLOCKS = pagesIn("blocks");

// Layouts compose composition primitives into ready-made responsive
// application shells — the "flagship" tier. A curated order puts the
// most universal shells first: the app shell every product starts from,
// then the specialised patterns.
const LAYOUTS = pagesIn("layouts", [
  "app-shell",
  "master-detail",
  "centered",
  "dashboard",
  "settings",
  "split",
  "form",
  "reading",
]);

// Foundations have a genuine reading order — colour and type before the
// layout and behaviour that compose them — that alphabetical destroys, so
// this is the one directory `pagesIn` is given a curated order for.
const FOUNDATIONS = pagesIn("foundations", [
  "colour",
  "typography",
  "shape",
  "elevation",
  "motion",
  "layout",
  "responsive-design",
  "iconography",
  "accessibility",
  "cross-platform",
  "theming",
]);

// Patterns are worked examples that cross component boundaries — compositions
// a reader is more likely to reach for by shape ("a form") than by name.
const PATTERNS = pagesIn("patterns", ["forms"]);

export default defineConfig({
  title: "Loom",
  description:
    "An opinionated UI system and composition library for cross-platform web applications — primitives, tokens and motion for Vue.",
  lang: "en-US",
  base: BASE,
  cleanUrls: true,
  lastUpdated: true,

  // Flash prevention: set Loom's `data-theme` before the first paint. VitePress
  // already prevents its own chrome from flashing by reading its localStorage key
  // and toggling `.dark` inline — but Loom's components read `data-theme`, so
  // without this the chrome would arrive dark while every demo stayed light until
  // Vue hydrated. The script reads the same key VitePress uses, because that is
  // the one the toggle in the nav writes to.
  head: [
    [
      "script",
      {},
      `(()=>{const t=localStorage.getItem("vitepress-theme-appearance");document.documentElement.setAttribute("data-theme",(t==="dark"||((!t||t==="auto")&&matchMedia("(prefers-color-scheme:dark)").matches))?"dark":"light")})()`,
    ],
  ],

  // Loom ships a symmetric dark theme under `:root[data-theme="dark"]`. VitePress's
  // toggle adds a `.dark` class to `<html>`, and Layout.vue mirrors that onto
  // Loom's `data-theme` attribute, so every demo on the page follows the same
  // switch the chrome does. The toggle is on so a reader can see both themes.
  appearance: true,

  markdown: {
    // Dual themes, because the site now supports both light and dark. The light
    // theme is `github-light-high-contrast` — all ten of its syntax colours
    // clear the 4.5:1 AA floor on the code-block background, which is more than
    // the default `github-light` can say. The dark theme follows the same
    // principle: `github-dark-high-contrast` clears the floor on the dark
    // card surface.
    theme: {
      light: "github-light-high-contrast",
      dark: "github-dark-high-contrast",
    },
  },

  themeConfig: {
    nav: [
      { text: "Components", link: COMPONENTS[0]?.link ?? "/" },
      { text: "GitHub", link: "https://github.com/ecoma-io/loom" },
    ],
    sidebar: [
      { text: "Overview", link: "/" },
      { text: "Foundations", items: FOUNDATIONS },
      { text: "Primitives", items: COMPONENTS },
      { text: "Composition", items: COMPOSITION },
      { text: "Blocks", items: BLOCKS },
      { text: "Layouts", items: LAYOUTS },
      { text: "Patterns", items: PATTERNS },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/ecoma-io/loom" }],
    editLink: {
      pattern: "https://github.com/ecoma-io/loom/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },
    search: { provider: "local" },
    outline: [2, 3],
  },

  vite: {
    plugins: [componentApi(), designTokens(), ...(tailwindcss() as unknown as VitePlugins)],
    resolve: {
      alias: {
        // The documentation imports Loom the way a consumer does. A relative
        // `../../src` import would work and would also quietly document a path
        // no consumer can write; the alias keeps every snippet on this site
        // copy-pasteable into a real application.
        "@ecoma-io/loom": fileURLToPath(
          new URL("../../packages/loom/src/index.ts", import.meta.url),
        ),
        // Internal workspace packages, resolved to source so the VitePress dev
        // server and build can follow imports without node_modules. These mirror
        // the tsconfig paths and the root Vite config aliases. Each component
        // package alias is added as it migrates.
        "@ecoma-io/loom-core": fileURLToPath(
          new URL("../../packages/core/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-labels": fileURLToPath(
          new URL("../../packages/labels/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-hover-card": fileURLToPath(
          new URL("../../packages/primitives/hover-card/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-progress": fileURLToPath(
          new URL("../../packages/primitives/progress/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-radial-progress": fileURLToPath(
          new URL("../../packages/primitives/radial-progress/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-scroll-area": fileURLToPath(
          new URL("../../packages/primitives/scroll-area/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-separator": fileURLToPath(
          new URL("../../packages/primitives/separator/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-alert": fileURLToPath(
          new URL("../../packages/primitives/alert/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-carousel": fileURLToPath(
          new URL("../../packages/primitives/carousel/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-collapse": fileURLToPath(
          new URL("../../packages/primitives/collapse/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-list": fileURLToPath(
          new URL("../../packages/primitives/list/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-kbd": fileURLToPath(
          new URL("../../packages/primitives/kbd/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-timeline": fileURLToPath(
          new URL("../../packages/primitives/timeline/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-table": fileURLToPath(
          new URL("../../packages/primitives/table/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-card": fileURLToPath(
          new URL("../../packages/primitives/card/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-skeleton": fileURLToPath(
          new URL("../../packages/primitives/skeleton/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-skip-link": fileURLToPath(
          new URL("../../packages/primitives/skip-link/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-spinner": fileURLToPath(
          new URL("../../packages/primitives/spinner/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-surface": fileURLToPath(
          new URL("../../packages/primitives/surface/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-accordion": fileURLToPath(
          new URL("../../packages/primitives/accordion/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-avatar": fileURLToPath(
          new URL("../../packages/primitives/avatar/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-badge": fileURLToPath(
          new URL("../../packages/primitives/badge/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-breadcrumb": fileURLToPath(
          new URL("../../packages/primitives/breadcrumb/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-button": fileURLToPath(
          new URL("../../packages/primitives/button/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-calendar": fileURLToPath(
          new URL("../../packages/primitives/calendar/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-chip": fileURLToPath(
          new URL("../../packages/primitives/chip/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-context-menu": fileURLToPath(
          new URL("../../packages/primitives/context-menu/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-dropdown-menu": fileURLToPath(
          new URL("../../packages/primitives/dropdown-menu/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-icon-button": fileURLToPath(
          new URL("../../packages/primitives/icon-button/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-inline-error": fileURLToPath(
          new URL("../../packages/primitives/inline-error/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-link": fileURLToPath(
          new URL("../../packages/primitives/link/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-menubar": fileURLToPath(
          new URL("../../packages/primitives/menubar/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-navigation-menu": fileURLToPath(
          new URL("../../packages/primitives/navigation-menu/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-popover": fileURLToPath(
          new URL("../../packages/primitives/popover/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-speed-dial": fileURLToPath(
          new URL("../../packages/primitives/speed-dial/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-tabs": fileURLToPath(
          new URL("../../packages/primitives/tabs/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-tooltip": fileURLToPath(
          new URL("../../packages/primitives/tooltip/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-alert-dialog": fileURLToPath(
          new URL("../../packages/primitives/alert-dialog/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-avatar-group": fileURLToPath(
          new URL("../../packages/primitives/avatar-group/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-checkbox": fileURLToPath(
          new URL("../../packages/primitives/checkbox/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-color-picker": fileURLToPath(
          new URL("../../packages/primitives/color-picker/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-dialog": fileURLToPath(
          new URL("../../packages/primitives/dialog/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-drawer": fileURLToPath(
          new URL("../../packages/primitives/drawer/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-field": fileURLToPath(
          new URL("../../packages/primitives/field/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-fieldset": fileURLToPath(
          new URL("../../packages/primitives/fieldset/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-indicator": fileURLToPath(
          new URL("../../packages/primitives/indicator/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-number-field": fileURLToPath(
          new URL("../../packages/primitives/number-field/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-otp-input": fileURLToPath(
          new URL("../../packages/primitives/otp-input/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-radio-group": fileURLToPath(
          new URL("../../packages/primitives/radio-group/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-rating": fileURLToPath(
          new URL("../../packages/primitives/rating/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-segmented-control": fileURLToPath(
          new URL("../../packages/primitives/segmented-control/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-select": fileURLToPath(
          new URL("../../packages/primitives/select/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-slider": fileURLToPath(
          new URL("../../packages/primitives/slider/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-stepper": fileURLToPath(
          new URL("../../packages/primitives/stepper/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-switch": fileURLToPath(
          new URL("../../packages/primitives/switch/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-toast": fileURLToPath(
          new URL("../../packages/primitives/toast/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-window-controls": fileURLToPath(
          new URL("../../packages/primitives/window-controls/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-combobox": fileURLToPath(
          new URL("../../packages/primitives/combobox/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-date-picker": fileURLToPath(
          new URL("../../packages/primitives/date-picker/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-date-range-picker": fileURLToPath(
          new URL("../../packages/primitives/date-range-picker/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-date-time-picker": fileURLToPath(
          new URL("../../packages/primitives/date-time-picker/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-date-time-range-picker": fileURLToPath(
          new URL("../../packages/primitives/date-time-range-picker/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-editable": fileURLToPath(
          new URL("../../packages/primitives/editable/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-file-upload": fileURLToPath(
          new URL("../../packages/primitives/file-upload/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-pagination": fileURLToPath(
          new URL("../../packages/primitives/pagination/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-tags-input": fileURLToPath(
          new URL("../../packages/primitives/tags-input/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-textarea": fileURLToPath(
          new URL("../../packages/primitives/textarea/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-text-field": fileURLToPath(
          new URL("../../packages/primitives/text-field/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-time-picker": fileURLToPath(
          new URL("../../packages/primitives/time-picker/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-tree-view": fileURLToPath(
          new URL("../../packages/primitives/tree-view/src/index.ts", import.meta.url),
        ),
        // Compositions.
        "@ecoma-io/loom-center": fileURLToPath(
          new URL("../../packages/composition/center/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-frame": fileURLToPath(
          new URL("../../packages/composition/frame/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-grid": fileURLToPath(
          new URL("../../packages/composition/grid/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-inline": fileURLToPath(
          new URL("../../packages/composition/inline/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-scroll-reel": fileURLToPath(
          new URL("../../packages/composition/scroll-reel/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-sidebar": fileURLToPath(
          new URL("../../packages/composition/sidebar/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-split": fileURLToPath(
          new URL("../../packages/composition/split/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-stack": fileURLToPath(
          new URL("../../packages/composition/stack/src/index.ts", import.meta.url),
        ),
        // Layouts.
        "@ecoma-io/loom-app-shell": fileURLToPath(
          new URL("../../packages/layouts/app-shell/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-centered": fileURLToPath(
          new URL("../../packages/layouts/centered/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-dashboard": fileURLToPath(
          new URL("../../packages/layouts/dashboard/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-form-layout": fileURLToPath(
          new URL("../../packages/layouts/form-layout/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-master-detail": fileURLToPath(
          new URL("../../packages/layouts/master-detail/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-reading": fileURLToPath(
          new URL("../../packages/layouts/reading/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-settings": fileURLToPath(
          new URL("../../packages/layouts/settings/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-split-layout": fileURLToPath(
          new URL("../../packages/layouts/split-layout/src/index.ts", import.meta.url),
        ),
        // Blocks.
        "@ecoma-io/loom-app-header": fileURLToPath(
          new URL("../../packages/blocks/app-header/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-dashboard-grid": fileURLToPath(
          new URL("../../packages/blocks/dashboard-grid/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-desktop-app-shell": fileURLToPath(
          new URL("../../packages/blocks/desktop-app-shell/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-empty-state": fileURLToPath(
          new URL("../../packages/blocks/empty-state/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-error-state": fileURLToPath(
          new URL("../../packages/blocks/error-state/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-form-actions": fileURLToPath(
          new URL("../../packages/blocks/form-actions/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-form-section": fileURLToPath(
          new URL("../../packages/blocks/form-section/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-loading-state": fileURLToPath(
          new URL("../../packages/blocks/loading-state/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-metric-card": fileURLToPath(
          new URL("../../packages/blocks/metric-card/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-page-header": fileURLToPath(
          new URL("../../packages/blocks/page-header/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-row-actions": fileURLToPath(
          new URL("../../packages/blocks/row-actions/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-sidebar-nav": fileURLToPath(
          new URL("../../packages/blocks/sidebar-nav/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-title-bar": fileURLToPath(
          new URL("../../packages/blocks/title-bar/src/index.ts", import.meta.url),
        ),
        "@ecoma-io/loom-toast-stack": fileURLToPath(
          new URL("../../packages/blocks/toast-stack/src/index.ts", import.meta.url),
        ),
      },
    },
  },
});
