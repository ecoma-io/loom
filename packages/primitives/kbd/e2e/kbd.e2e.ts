import { test, expect } from "@playwright/test";

// Kbd is display-only; its browser-only facts are typographic (the mono face
// actually resolving) and contrast under both themes — the latter is swept
// site-wide by the root suites, so this spec pins the face.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=kbd");
  await expect(page.locator("kbd").first()).toBeVisible();
});

test("key caps render in the monospace face", async ({ page }) => {
  const face = await page
    .locator("kbd")
    .first()
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(face.toLowerCase()).toMatch(/mono/);
});
