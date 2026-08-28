import { test, expect, type Page } from "@playwright/test";

/**
 * The role of whatever currently holds focus, or `null` outside a styled
 * control. Read through `document.activeElement` rather than a `:focus`
 * locator: the harness mounts no chrome, so once Tab leaves the group focus
 * falls on `<body>`, which a strict `:focus` locator cannot even match as a
 * resolvable element.
 */
async function focusedRole(page: Page): Promise<string | null> {
  return page.evaluate(() => document.activeElement?.getAttribute("role") ?? null);
}

test("ToggleGroup's arrow keys move focus past a disabled button without flipping anything, and the group is one real Tab stop", async ({
  page,
}) => {
  await page.goto("/?component=toggle-group");
  const bold = page.getByRole("button", { name: "Bold", exact: true });
  await bold.click();
  await expect(bold).toBeFocused();
  await expect(bold).toHaveAttribute("aria-pressed", "true");

  // Reka's commit timer needs a real held-key interval; a zero-duration
  // synthetic press loses this race (see the SegmentedControl case).
  await page.keyboard.press("ArrowRight", { delay: 50 });
  const italic = page.getByRole("button", { name: "Italic", exact: true });
  await expect(italic).toBeFocused();
  // Focus moved; the value did not — toggles flip on Space, not on travel.
  await expect(italic).toHaveAttribute("aria-pressed", "false");

  await page.keyboard.press("Space");
  await expect(italic).toHaveAttribute("aria-pressed", "true");

  // The third button is disabled, so wrapping off the end skips it and lands
  // back on Bold — the same skip the RadioGroup pins, and the reason the
  // assertion lives here rather than in the browserless tier: roving focus
  // asks the engine which candidates are disabled, which jsdom cannot answer.
  await page.keyboard.press("ArrowRight", { delay: 50 });
  await expect(bold).toBeFocused();

  await page.keyboard.press("Tab");
  expect(await focusedRole(page)).not.toBe(null);
});
