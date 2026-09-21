import { test, expect } from "@playwright/test";

// SkipLink exists for exactly one gesture: Enter moves a keyboard reader past
// the page's blocks and into its content. The demo's destination carries
// tabindex="-1" — the component's documented placement contract — so following
// the link must MOVE focus there, not merely scroll, and document.activeElement
// is the fact the reader experiences. No transition is involved; the
// assertions are immediate.

test("Enter moves focus and the hash to the bypass target", async ({ page }) => {
  await page.goto("/?component=skip-link");

  const link = page.getByRole("link", { name: "Skip to main content" });
  await link.focus();
  await expect(link).toBeFocused();

  await page.keyboard.press("Enter");

  await expect
    .poll(() => page.evaluate(() => document.activeElement?.id ?? ""))
    .toBe("skip-link-demo-content");
  expect(new URL(page.url()).hash).toBe("#skip-link-demo-content");
});
