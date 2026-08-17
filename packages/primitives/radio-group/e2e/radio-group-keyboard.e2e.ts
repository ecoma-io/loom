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

test("RadioGroup's arrow key skips a disabled row and wraps, and the group is a single real Tab stop", async ({
  page,
}) => {
  await page.goto("/?component=radio-group");
  // The demos bind a literal model value and snap back after interaction;
  // the harness mounts the page, so the radios themselves are the scoping root.
  const enterprise = page.getByRole("radio", { name: "Enterprise" });
  await enterprise.click();
  await expect(enterprise).toBeFocused();

  // Reka commits roving selection from a setTimeout(0) while a held-key flag is
  // set. The short delay models a real press; a default instantaneous press
  // races its own keyup and can lose the selection.
  await page.keyboard.press("ArrowDown", { delay: 50 });
  const free = page.getByRole("radio", { name: "Free" });
  await expect(free).toBeFocused();
  await expect(free).toHaveAttribute("aria-checked", "true");

  await page.keyboard.press("Tab");
  expect(await focusedRole(page)).not.toBe("radio");
});
