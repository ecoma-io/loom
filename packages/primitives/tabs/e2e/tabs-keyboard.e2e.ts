import { test, expect, type Page } from "@playwright/test";

/** The role of whatever currently holds focus, or `null` outside a styled control. */
async function focusedRole(page: Page): Promise<string | null> {
  return page.locator(":focus").getAttribute("role");
}

test("Tabs' trigger row is a single real Tab stop, so Tab leaves the row instead of walking to the next trigger", async ({
  page,
}) => {
  await page.goto("components/tabs");
  const activity = page.getByRole("tab", { name: "Activity" });
  await activity.click();
  await expect(activity).toBeFocused();

  // If every trigger carried `tabindex=0`, this real Tab press would land on
  // Settings. jsdom does not resolve tab order, so only a browser can pin it.
  await page.keyboard.press("Tab");
  expect(await focusedRole(page)).not.toBe("tab");
});
