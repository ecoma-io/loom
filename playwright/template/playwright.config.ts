import { defineConfig } from "@playwright/test";
import { projectsForProfile } from "../profiles";
import { templateTargets } from "./template-targets.ts";

/**
 * Template E2E harness Playwright config.
 *
 * Each template is a standalone Vite application under `templates/` — not a
 * VitePress page — so each one runs its own Vite dev server on a unique port.
 * Playwright's `webServer` array supports multiple entries: every entry is
 * polled before the first test starts, and every entry is killed after.
 *
 * Templates are discovered from the filesystem (see `templateTargets()`), so
 * a template added tomorrow is served and tested the moment its directory
 * exists — no config edit needed.
 *
 * The tests in `smoke.e2e.ts` iterate the same target list, loading each
 * template's URL and verifying it renders without JS errors.
 */
const profile = process.env.PW_PROFILE ?? "smoke";
const targets = templateTargets();

// Playwright needs at least one webServer entry. An empty targets list means
// no templates exist yet — the config still compiles, but no browser tests
// can meaningfully run. The `testIgnore` below keeps the suite quiet.
const webServer =
  targets.length > 0
    ? targets.map((t) => ({
        command: `pnpm exec vite --port ${String(t.port)} --strictPort`,
        cwd: t.path,
        url: `http://localhost:${String(t.port)}`,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      }))
    : // A dummy entry that will never start — the test file itself skips when
      // there are no targets, so this is a structural placeholder only.
      [{ command: "echo no-templates", url: "http://localhost:19999", timeout: 1_000 }];

const projects = projectsForProfile(profile);

export default defineConfig({
  testDir: "..",
  testMatch: ["playwright/template/**/*.e2e.ts"],
  testIgnore: ["**/node_modules/**", "**/dist/**", "**/coverage/**"],

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),

  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  webServer,

  projects,
});
