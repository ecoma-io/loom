import { defineConfig, devices } from "@playwright/test";

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
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
