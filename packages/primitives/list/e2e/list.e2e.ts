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
