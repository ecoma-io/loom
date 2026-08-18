import { devices, type Project } from "@playwright/test";

/**
 * The browser policy, defined once.
 *
 * Both Playwright configs — the root cross-cutting suite (`playwright.config.ts`)
 * and the component E2E harness (`playwright/harness/playwright.config.ts`) —
 * and CI's discovery step (`tools/e2e-plan.ts`) read this single module, so a
 * profile's browser set, the device each project drives, and the engine each
 * one needs can never drift between the configs and the matrix.
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

export type BrowserProjectId =
  "chromium" | "firefox" | "webkit" | "chromium-mobile" | "webkit-mobile";

/**
 * The engine `playwright install` downloads for each browser project. The two
 * mobile project ids alias their engine's browser — a Pixel 5 is a Chromium,
 * an iPhone 13 a WebKit — so the install name is not always the project id.
 * Lives here rather than in CI's discovery step so the whole browser policy
 * (which projects a profile selects, and what running one requires) has a
 * single module.
 */
export const ENGINE_FOR_PROJECT: Record<BrowserProjectId, "chromium" | "firefox" | "webkit"> = {
  chromium: "chromium",
  firefox: "firefox",
  webkit: "webkit",
  "chromium-mobile": "chromium",
  "webkit-mobile": "webkit",
};

// The device behind each project id — one desktop and one mobile device per
// engine that ships one, matching ENGINE_FOR_PROJECT above.
const PROJECT_DEVICES: Record<BrowserProjectId, (typeof devices)[string]> = {
  chromium: devices["Desktop Chrome"],
  firefox: devices["Desktop Firefox"],
  webkit: devices["Desktop Safari"],
  "chromium-mobile": devices["Pixel 5"],
  "webkit-mobile": devices["iPhone 13"],
};

/**
 * The `projects` array a Playwright config declares for a profile. Throws on
 * an unknown profile name so a typo'd `PW_PROFILE` fails the run loudly
 * instead of silently selecting nothing.
 */
export function projectsForProfile(profile: string): Project[] {
  if (!(profile in PROFILE_PROJECTS)) {
    throw new Error(
      `Unknown PW_PROFILE ${JSON.stringify(profile)}. Expected one of ${Object.keys(PROFILE_PROJECTS).join(", ")}.`,
    );
  }
  return PROFILE_PROJECTS[profile as BrowserProfile].map((name) => ({
    name,
    use: { ...PROJECT_DEVICES[name] },
  }));
}
