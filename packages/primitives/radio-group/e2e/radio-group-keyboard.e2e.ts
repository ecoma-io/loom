import { test, expect, type Page } from "@playwright/test";

/** The role of whatever currently holds focus, or `null` outside a styled control. */
async function focusedRole(page: Page): Promise<string | null> {
  return page.locator(":focus").getAttribute("role");
}

test("RadioGroup's arrow key skips a disabled row and wraps, and the group is a single real Tab stop", async ({
  page,
}) => {
  await page.goto("components/radio-group");
  // Static examples bind a literal model value and snap back after interaction;
  // the interactive demo is the behavior a browser must drive.
  const demo = page.locator("figure").filter({ hasText: "Every state" });
  const enterprise = demo.getByRole("radio", { name: "Enterprise" });
  await enterprise.click();
  await expect(enterprise).toBeFocused();

  // Reka commits roving selection from a setTimeout(0) while a held-key flag is
  // set. The short delay models a real press; a default instantaneous press
  // races its own keyup and can lose the selection.
  await page.keyboard.press("ArrowDown", { delay: 50 });
  const free = demo.getByRole("radio", { name: "Free" });
  await expect(free).toBeFocused();
  await expect(free).toHaveAttribute("aria-checked", "true");

  await page.keyboard.press("Tab");
  expect(await focusedRole(page)).not.toBe("radio");
});
