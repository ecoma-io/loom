import { defineConfig, devices } from "@playwright/test";
import { PROFILE_PROJECTS, type BrowserProfile } from "../profiles";

/**
 * Component E2E harness Playwright config.
 *
 * The webServer here is a Vite dev server on the harness entry (index.html →
 * main.ts), not a VitePress build — a browser spec for a component mounts via
 * `?component=<kebab>` in seconds rather than after a `docs:build`. Running a
 * component's own specs (category C) against this config is what makes a small
 * component change a seconds-scale browser verification.
 *
 * The cross-cutting suite (`e2e/`) keeps using the ROOT `playwright.config.ts`
 * — it drives the built docs site and must never run its webServer against the
 * harness. Both configs share `PROFILE_PROJECTS` so a profile means the same
 * browser set wherever it is selected.
 */
const HARNESS_PORT = 5183;
const BASE_URL = `http://localhost:${String(HARNESS_PORT)}`;

const profile = process.env.PW_PROFILE ?? "smoke";

if (!(profile in PROFILE_PROJECTS)) {
  throw new Error(
    `Unknown PW_PROFILE ${JSON.stringify(profile)}. Expected one of ${Object.keys(PROFILE_PROJECTS).join(", ")}.`,
  );
}

const selectedProjects = PROFILE_PROJECTS[profile as BrowserProfile];

const projects = {
  chromium: { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  firefox: { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  webkit: { name: "webkit", use: { ...devices["Desktop Safari"] } },
  "chromium-mobile": { name: "chromium-mobile", use: { ...devices["Pixel 5"] } },
  "webkit-mobile": { name: "webkit-mobile", use: { ...devices["iPhone 13"] } },
} as const;

export default defineConfig({
  // Component-owned specs live beside their components (`packages/**/e2e`),
  // so the harness discovers them from the workspace root — but `testMatch`
  // below keeps it scoped to those and its own smoke, never the cross-cutting
  // docs suite, which the ROOT config's webServer owns.
  testDir: "../..",
  testMatch: ["**/packages/**/e2e/*.e2e.ts", "playwright/harness/**/*.e2e.ts"],
  testIgnore: ["**/node_modules/**", "**/dist/**", "**/coverage/**"],

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),

  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  // Vite's dev server, not a build: Hot Module Replacement and source transforms
  // mean the first page load compiles `main.ts` and the requested demo on the
  // fly, which is what keeps the harness away from a `docs:build` entirely. The
  // path is relative to THIS config's directory (Playwright runs webServer from
  // the config's own folder), and the config file carries `root`; only the port
  // needs passing, and it must agree with the `HARNESS_PORT` above.
  webServer: {
    command: `vite --config vite.config.mts --port ${String(HARNESS_PORT)}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },

  projects: selectedProjects.map((name) => projects[name]),
});
