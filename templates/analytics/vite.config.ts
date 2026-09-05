import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

// A consumer's Vite config carries no aliases — it installs the package and
// resolution is node_modules. Inside this repository the published specifiers
// resolve to source instead, which is what this map substitutes for the
// install. It deliberately names only the published specifiers: an import of
// an internal `@ecoma-io/loom-*` package matches none of them, so the dev
// server or build fails here, in the template, where reaching past the public
// surface is a defect. Delete this block after copying the template into a
// real project.
const published = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      // Subpath before the bare package: a string alias also matches the
      // specifier it prefixes, so `@ecoma-io/loom` must come last or it
      // swallows the subpath this map exists to serve.
      //
      // The `/theme` subpath is absent on purpose, though it is published: the
      // starter imports `useTheme` from the root specifier instead (see
      // App.vue), and in-tree the subpath's alias lands on the core package —
      // an edge the layer-templates row would judge as a reach past the
      // facade. A consumer hits none of this: in `node_modules` both spellings
      // resolve to the installed package.
      "@ecoma-io/loom/styles/global.css": published("packages/theme-core/src/global.css"),
      "@ecoma-io/loom": published("packages/loom/src/index.ts"),
    },
  },
});
