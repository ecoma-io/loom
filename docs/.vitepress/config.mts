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
        "@ecoma-io/loom": fileURLToPath(new URL("../../src/index.ts", import.meta.url)),
      },
    },
  },
});
