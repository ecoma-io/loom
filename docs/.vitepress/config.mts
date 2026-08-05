import { fileURLToPath } from "node:url";
import { defineConfig, type UserConfig } from "vitepress";
import tailwindcss from "@tailwindcss/vite";
import { componentApi } from "./plugins/component-api";

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

// The site is served from a sub-path of ecoma.io, not from a domain root, so
// every generated asset URL has to carry that prefix. Getting this wrong is
// invisible in `docs:dev` — the dev server serves from `/` regardless — and
// shows up only as a blank page in production, which is why `docs:preview`
// exists and why the deployment job runs a built preview rather than the dev
// server.
const BASE = "/docs/contribute/design-system/";

export default defineConfig({
  title: "Loom",
  description: "The design system behind Ecoma — primitives, tokens and motion for Vue.",
  lang: "en-US",
  base: BASE,
  cleanUrls: true,
  lastUpdated: true,

  // Loom has one palette, not two, and it is the paper-light one: `theme.css`
  // is light-first by design, and a symmetric dark theme is a reserved seam.
  // Leaving VitePress's toggle on would offer a dark mode the components
  // underneath do not have, so the chrome would go dark while every demo on the
  // page stayed on paper. `false` removes the toggle rather than shipping a
  // control that half-works — and it also keeps the `.dark` class off the
  // document, which matters more than the switch does: VitePress's own `.dark`
  // rules outrank the `:root` block that maps its variables onto Loom's tokens,
  // so under a forced dark the site would quietly stop wearing them.
  appearance: false,

  themeConfig: {
    nav: [
      { text: "Components", link: "/components/button" },
      { text: "GitHub", link: "https://github.com/ecoma-io/loom" },
    ],
    sidebar: [
      { text: "Overview", link: "/" },
      {
        text: "Primitives",
        items: [{ text: "Button", link: "/components/button" }],
      },
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
    plugins: [componentApi(), ...(tailwindcss() as unknown as VitePlugins)],
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
