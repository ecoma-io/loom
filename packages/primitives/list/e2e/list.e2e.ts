import { test, expect } from "@playwright/test";

// List's browser-only facts: activation through real hit targets on the
// whole row, and selection that reads without colour.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=list");
  await expect(page.getByRole("list").first()).toBeVisible();
});

test("an interactive row activates from its full width and moves selection", async ({ page }) => {
  const hobby = page.getByRole("button", { name: /Hobby/ });
  await hobby.click();
  await expect(hobby).toHaveAttribute("aria-current", "true");

  const balanced = page.getByRole("button", { name: /Balanced/ });
  await balanced.click();
  await expect(balanced).toHaveAttribute("aria-current", "true");
  await expect(hobby).not.toHaveAttribute("aria-current");
});

test("disabled plans stay announced but refuse activation", async ({ page }) => {
  const scale = page.getByRole("button", { name: /Scale/ });
  await expect(scale).toBeDisabled();
});

test("link rows are anchors that navigate", async ({ page }) => {
  const anchor = page.getByRole("link", { name: /#4821 · api/ });
  await anchor.click();
  await expect(page).toHaveURL(/#deploy-4821$/);
});

test("Tab walks the interactive rows in document order and skips the disabled one", async ({
  page,
}) => {
  // List is a container — it operates nothing itself — so its keyboard-operate
  // duty is passage through the surface: focus must walk the slotted rows'
  // real buttons in DOM order and leave the list without a trap. Seated by
  // script at the first stop, then asserted per stop by identity.
  const hobby = page.getByRole("button", { name: /Hobby/ });
  await hobby.focus();
  await expect(hobby).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: /Balanced/ })).toBeFocused();

  // Scale is a disabled row: drained and announced but never a stop.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: /#4821 · api/ })).toBeFocused();
  await expect(page.getByRole("button", { name: /Scale/ })).not.toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: /#4820 · web/ })).toBeFocused();

  // The deployment list's rows are the last focusables, and the walk must hand
  // focus out to the harness's trailing stop rather than trap inside the list.
  await page.keyboard.press("Tab");
  await expect(page.locator("#harness-sentinel")).toBeFocused();
});
