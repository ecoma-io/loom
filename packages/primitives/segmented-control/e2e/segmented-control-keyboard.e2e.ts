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

test("SegmentedControl's arrow key skips a disabled segment and wraps, and the group is a single real Tab stop", async ({
  page,
}) => {
  await page.goto("/?component=segmented-control");
  // The demos bind a literal model value and snap back after interaction; the
  // harness mounts the page, so the controls themselves are the scoping root.
  const cozy = page.getByRole("radio", { name: "Cozy", exact: true });
  await cozy.click();
  await expect(cozy).toBeFocused();

  // Reka's commit timer needs a real held-key interval; see the matching Radio
  // Group case for why a zero-duration synthetic press loses this race.
  await page.keyboard.press("ArrowRight", { delay: 50 });
  const compact = page.getByRole("radio", { name: "Compact", exact: true });
  await expect(compact).toBeFocused();
  await expect(compact).toHaveAttribute("aria-checked", "true");

  await page.keyboard.press("Tab");
  expect(await focusedRole(page)).not.toBe("radio");
});
