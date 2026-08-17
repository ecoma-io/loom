import { test, expect, type Page } from "@playwright/test";

/**
 * The role of whatever currently holds focus, or `null` outside a styled
 * control. Read through `document.activeElement` rather than a `:focus`
 * locator: the harness mounts no chrome, so once Tab leaves the group focus
 * falls on `<body>`, which a strict `:focus` locator cannot even match as a
 * resolvable element — the old form waited on nothing and timed out.
 */
async function focusedRole(page: Page): Promise<string | null> {
  return page.evaluate(() => document.activeElement?.getAttribute("role") ?? null);
}

test("Tabs' trigger row is a single real Tab stop, so Tab leaves the row instead of walking to the next trigger", async ({
  page,
}) => {
  await page.goto("/?component=tabs");
  const activity = page.getByRole("tab", { name: "Activity" });
  await activity.click();
  await expect(activity).toBeFocused();

  // If every trigger carried `tabindex=0`, this real Tab press would land on
  // the next trigger. jsdom does not resolve tab order, so only a browser can
  // pin it.
  await page.keyboard.press("Tab");
  expect(await focusedRole(page)).not.toBe("tab");
});
