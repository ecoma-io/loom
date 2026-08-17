import { mergeConfig, defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import rootConfig from "../../vite.config.ts";

/**
 * The component E2E harness's Vite config.
 *
 * The root `vite.config.ts` already resolves every internal `@ecoma-io/loom-*`
 * package to source, so those aliases are reused rather than copied a third
 * time — a package accepted into Loom is immediately mountable here with no
 * extra wiring. What the root config does not have is Tailwind: the harness
 * builds its own stylesheet entry (`styles.css`) so component classes actually
 * resolve, and only the VitePress site's `build.lib` plugin is not applicable
 * to this entry (it applies on `apply: "build"` and would otherwise try to
 * bundle the harness as a library).
 */
export default defineConfig(
  mergeConfig(rootConfig, {
    // The harness lives in its own directory, so it roots itself there; the
    // port is named in the harness Playwright config's webServer, which starts
    // this same file. The root config is not run with this config file, so
    // neither value conflicts with VitePress's own.
    root: new URL(".", import.meta.url).pathname,
    plugins: [tailwindcss()],
    build: {
      // The harness is never published; nothing here needs the stylesheet
      // copy or the library bundle the root config performs.
      lib: false,
    },
  }),
);
