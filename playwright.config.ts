import { defineConfig } from "@playwright/test";
import { BASE } from "./docs/.vitepress/base";
import { projectsForProfile } from "./playwright/profiles";

// The one port every piece below has to agree on: the URL Playwright polls
// before starting a test, the `baseURL` every relative `page.goto` resolves
// against, and the port the preview server is told to bind. Named once so
// none of those three can drift from the other two.
const PREVIEW_PORT = 4173;

// `vitepress preview` serves the built site under the same base path
// production does (see `docs/.vitepress/base.ts` for why that path is a
// single source of truth rather than restated per consumer) — so every URL
// the suite navigates to has to carry it, or it lands on the 404 that a
// request for `/` produces under a non-root base.
const BASE_URL = `http://localhost:${String(PREVIEW_PORT)}${BASE}`;

// Profile -> projects (and the device each drives) is the shared browser
// policy in playwright/profiles.ts; an unknown PW_PROFILE throws there.
const projects = projectsForProfile(process.env.PW_PROFILE ?? "standard");

// End-to-end tests drive a real browser against the rendered component
// documentation. Cross-cutting checks live in `e2e/`; component-owned checks
// live in `packages/**/e2e/`. Both remain separate from unit tests so either
// browser evidence can run without turning a package's unit suite into E2E.
export default defineConfig({
  testDir: ".",
  // Only the cross-cutting suite. Component-owned specs under
  // `packages/**/e2e/` are driven by the harness config
  // (`playwright/harness/playwright.config.ts`) — they mount one demo through
  // a Vite dev server instead of building the whole VitePress site, and
  // collecting them here too would run each twice against two different
  // servers.
  //
  // `testMatch` is a glob matched against the whole relative path, and its
  // `**` crosses directory boundaries — `e2e/**/*.e2e.ts` would otherwise
  // also pick up every `packages/*/e2e/*.e2e.ts`, because the `**` slurps the
  // `packages/<tier>/<name>/` prefix. The ignore below is what actually keeps
  // the component-owned specs out, so it is explicit rather than relying on
  // the glob's anchor holding.
  testMatch: ["e2e/**/*.e2e.ts"],
  testIgnore: ["**/node_modules/**", "**/dist/**", "**/coverage/**", "packages/**"],

  // A test that depends on another test's leftovers is a test that will pass
  // alone and fail in CI; full isolation makes that impossible rather than
  // unlikely.
  fullyParallel: true,

  // `test.only` reaching CI silences the rest of the suite while still
  // reporting green.
  forbidOnly: !!process.env.CI,

  // Retries buy tolerance for genuine browser flake in CI, and none locally so
  // that flake is visible where it is introduced.
  retries: process.env.CI ? 2 : 0,
  // Set rather than defaulted to `undefined`: under `exactOptionalPropertyTypes`
  // an explicit `undefined` is not the same as an absent key, and absent is what
  // hands the choice back to Playwright's own heuristic.
  ...(process.env.CI ? { workers: 1 } : {}),

  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  // The documentation site is the only built application in this repository,
  // and it renders every primitive and block live — so it is what the suite
  // drives rather than a purpose-built test harness. `docs:build` runs first
  // because `docs:preview` only serves whatever is already on disk; without
  // it the suite would happily pass against yesterday's build.
  //
  // `PW_PREBUILT_DOCS` skips that build for a leg that has already been handed
  // the built site: CI's sharded matrix builds it once in one job and each leg
  // downloads the artifact, so rebuilding here would repeat identical work
  // once per leg — the duplication measured at ~75 seconds a leg before the
  // seam existed. Locally the variable stays unset and the build runs.
  //
  // `reuseExistingServer` is `false` in CI on purpose: a runner that reused a
  // leftover process from a previous, unrelated job would be testing that
  // job's build under this one's name.
  webServer: {
    command: process.env.PW_PREBUILT_DOCS
      ? `pnpm docs:preview --port ${String(PREVIEW_PORT)}`
      : `pnpm docs:build && pnpm docs:preview --port ${String(PREVIEW_PORT)}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  projects,
});
