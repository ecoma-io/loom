import { defineConfig, devices } from "@playwright/test";
import { BASE } from "./docs/.vitepress/base";

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

// End-to-end tests drive a real browser against the rendered component
// documentation. They live in `e2e/` and never beside the source — a browser
// test and a unit test fail for different reasons and must be runnable apart.
export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.e2e\.ts$/,

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
  // `reuseExistingServer` is `false` in CI on purpose: a runner that reused a
  // leftover process from a previous, unrelated job would be testing that
  // job's build under this one's name.
  webServer: {
    command: `pnpm docs:build && pnpm docs:preview --port ${String(PREVIEW_PORT)}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
