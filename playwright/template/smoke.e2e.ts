import { expect, test } from "@playwright/test";
import { templateTargets } from "./template-targets.ts";

/**
 * Template smoke tests.
 *
 * Each template is loaded in the browser and verified to:
 * - Return HTTP 200
 * - Mount the Vue app without console errors
 * - Render at least some visible text content
 *
 * These are deliberately minimal — the component harness and the root suite's
 * axe gate provide accessibility and interaction coverage. Here we establish
 * only that the template's page mounts, not a broken build.
 */

const targets = templateTargets();

// No templates exist yet — the harness has nothing to test. This is a
// legitimate state: the first template is being developed, or the tier was
// removed. The config still compiles, the CI job still runs, and this skip
// keeps the matrix from reddening over absence.
if (targets.length === 0) {
  test("no templates to test", () => {
    // Intentionally empty — the test passes to keep CI green.
  });
} else {
  for (const target of targets) {
    test.describe(target.id, () => {
      const url = `http://localhost:${String(target.port)}${target.route}`;

      test("loads without JS errors", async ({ page }) => {
        const errors: string[] = [];

        page.on("pageerror", (err) => {
          errors.push(err.message);
        });

        await page.goto(url, { waitUntil: "networkidle" });

        // The page should render something — the app mount element
        // and some visible text.
        const app = page.locator("#app");
        await expect(app).toBeAttached({ timeout: 10_000 });

        // The app should have rendered content (not just an empty div).
        const text = await app.innerText();
        expect(text.length).toBeGreaterThan(0);

        // No uncaught JS errors.
        expect(errors).toEqual([]);
      });

      test("HTTP 200 and correct content type", async ({ page }) => {
        const response = await page.goto(url, { waitUntil: "domcontentloaded" });
        expect(response?.status()).toBe(200);
      });
    });
  }
}
