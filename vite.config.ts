/// <reference types="vitest/config" />
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    // Library mode: consumers bundle this package, so nothing here is minified
    // for them and the peer framework is never inlined.
    lib: {
      entry: fileURLToPath(new URL("src/index.ts", import.meta.url)),
      formats: ["es"],
      fileName: "index",
    },
    minify: false,
    sourcemap: true,
    rollupOptions: {
      external: ["vue"],
    },
  },
  test: {
    globals: false,
    include: ["src/**/*.test.ts"],
    // The default `node` environment is correct while the package exports no
    // component. A DOM environment (`jsdom`) is installed together with the
    // first component test that needs one.
    coverage: {
      provider: "v8",
      include: ["src/**"],
    },
  },
});
