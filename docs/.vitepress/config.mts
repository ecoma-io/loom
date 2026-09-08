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

// Composition primitives are a separate tier between primitives and patterns.
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

// The Pattern tier's reference pages and the worked examples share the
// `docs/patterns/` directory — the recorded naming collision between the
// shipped Pattern kind and the #216/#218 consumer vocabulary (artifact-model
// §Relationship). A reader looking for a pattern knows the shape of the
// screen they are building, not what it is called here; the worked examples
// (Forms, Menus) are ranked first, and the reference pages follow
// alphabetically.
const PATTERNS = pagesIn("patterns", ["forms", "menus"]);

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
  "split-layout",
  "form-layout",
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

// As above for Templates and Showcase — a directory whose only page is its
// landing reads better as one link than as a group whose header and sole item
// point at the same address, so the section becomes a multi-item group only
// when a real page joins the directory.
const TEMPLATES = pagesIn("templates");
const SHOWCASE = pagesIn("showcase");

// The architecture pages have a genuine reading order: the documentation
// model maps the set first, the constitution decides, the artifact model and
// interface contract elaborate the decision, the contract records the
// enforcement state it landed as, the audit and gap analysis measure it, the
// matrix classifies each artifact, and baseline is history. Alphabetical
// would open on "Artifact model" with no "why" — and would bury the one page
// that says what to read first.
const ARCHITECTURE = pagesIn("architecture", [
  "README",
  "constitution",
  "artifact-model",
  "interface-contract",
  "contract",
  "audit",
  "gap-analysis",
  "artifact-matrix",
  "baseline",
  "evolution-plan",
  "evolution-ledger",
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
      // The journey, left to right: pick a control, see how controls combine,
      // see what they produce together, then start from a page you can copy.
      // Showcase precedes Templates because that ordering is the principle
      // itself — look before you take.
      { text: "Components", link: COMPONENTS[0]?.link ?? "/" },
      { text: "Patterns", link: PATTERNS[0]?.link ?? "/" },
      { text: "Showcase", link: "/showcase/" },
      { text: "Templates", link: "/templates/" },
      { text: "GitHub", link: "https://github.com/ecoma-io/loom" },
    ],
    sidebar: [
      { text: "Overview", link: "/" },
      { text: "Getting started", link: "/getting-started" },
      { text: "Foundations", items: FOUNDATIONS },
      { text: "Primitives", items: COMPONENTS },
      { text: "Composition", items: COMPOSITION },
      { text: "Patterns", items: PATTERNS },
      { text: "Layouts", items: LAYOUTS },
      // Spread `items` only when the directory carries pages beyond its
      // landing: VitePress keys the group wrapper's `tabindex` and handlers
      // off `items` being present, so an entry with an empty items array
      // would render a focusable but inert wrapper — a dead keyboard tab
      // stop in the sidebar of every page.
      {
        text: "Showcase",
        link: "/showcase/",
        ...(SHOWCASE.length ? { items: SHOWCASE } : {}),
      },
      {
        text: "Templates",
        link: "/templates/",
        ...(TEMPLATES.length ? { items: TEMPLATES } : {}),
      },
      { text: "Architecture", items: ARCHITECTURE },
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
        //
        // The facade subpaths are listed before the bare `@ecoma-io/loom`
        // entry: Vite's alias resolution is first-match, and a string alias
        // also matches the specifier it prefixes, so a bare entry listed first
        // would swallow `@ecoma-io/loom/a11y` and `@ecoma-io/loom/theme` and
        // resolve them to `index.ts/theme` — a path that does not exist. This
        // is the same ordering the root vite.config.ts follows, and the reason
        // is why `check-api-parity.ts` pins the subpaths against this map.
        "@ecoma-io/loom/a11y": fileURLToPath(
          new URL("../../packages/loom/src/a11y.ts", import.meta.url),
        ),
        "@ecoma-io/loom/theme": fileURLToPath(
          new URL("../../packages/loom/src/theme.ts", import.meta.url),
        ),
        "@ecoma-io/loom": fileURLToPath(
          new URL("../../packages/loom/src/index.ts", import.meta.url),
        ),
        // Nothing else belongs in this map. The facade's source imports the
        // internal packages by bare specifier, and those resolve without an
        // alias: the pnpm workspace links under packages/loom/node_modules/
        // reach each package's `exports`, which points at its own
        // src/index.ts — the same resolution templates/*/vite.config.ts rely
        // on (and enforce, by aliasing only the published specifiers). The
        // three facade keys above cannot fall through that way, because
        // packages/loom carries no self-link, which is why they stay.
        // check-api-parity.ts reads this map and fails on a subpath alias
        // that is missing or listed after the bare entry.
      },
    },
  },
});
