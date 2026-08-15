import { test, expect, type Page } from "@playwright/test";

/** The role of whatever currently holds focus, or `null` outside a styled control. */
async function focusedRole(page: Page): Promise<string | null> {
  return page.locator(":focus").getAttribute("role");
}

test("SegmentedControl's arrow key skips a disabled segment and wraps, and the group is a single real Tab stop", async ({
  page,
}) => {
  await page.goto("components/segmented-control");
  // Static examples bind a literal model value and snap back after interaction;
  // the interactive demo is the behavior a browser must drive.
  const demo = page.locator("figure").filter({ hasText: "Every state" });
  const cozy = demo.getByRole("radio", { name: "Cozy", exact: true });
  await cozy.click();
  await expect(cozy).toBeFocused();

  // Reka's commit timer needs a real held-key interval; see the matching Radio
  // Group case for why a zero-duration synthetic press loses this race.
  await page.keyboard.press("ArrowRight", { delay: 50 });
  const compact = demo.getByRole("radio", { name: "Compact", exact: true });
  await expect(compact).toBeFocused();
  await expect(compact).toHaveAttribute("aria-checked", "true");

  await page.keyboard.press("Tab");
  expect(await focusedRole(page)).not.toBe("radio");
});
