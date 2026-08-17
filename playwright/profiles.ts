/**
 * The browser matrix, defined once.
 *
 * Both Playwright configs — the root cross-cutting suite (`playwright.config.ts`)
 * and the component E2E harness (`playwright/harness/playwright.config.ts`) —
 * select from this single map, so a profile's set of projects can never drift
 * across the two in the component-owned direction.
 *
 * A profile is a name -> list of project ids. The ids are Playwright's own
 * browser names AND the `projects` entries into which both configs expand.
 */
export const PROFILE_PROJECTS = {
  smoke: ["chromium"],
  standard: ["chromium", "firefox", "webkit"],
  mobile: ["chromium-mobile", "webkit-mobile"],
  full: ["chromium", "firefox", "webkit", "chromium-mobile", "webkit-mobile"],
} as const;

export type BrowserProfile = keyof typeof PROFILE_PROJECTS;

export const BROWSER_PROFILES = Object.keys(PROFILE_PROJECTS) as BrowserProfile[];

export type BrowserProjectId =
  "chromium" | "firefox" | "webkit" | "chromium-mobile" | "webkit-mobile";

/** Every supported browser project id, used to validate a profile selection. */
export const BROWSER_PROJECT_IDS: readonly BrowserProjectId[] = [
  "chromium",
  "firefox",
  "webkit",
  "chromium-mobile",
  "webkit-mobile",
];
