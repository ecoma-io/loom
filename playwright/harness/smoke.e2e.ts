import { test, expect } from "@playwright/test";

test("harness mounts a real demo and resolves the theme", async ({ page }) => {
  await page.goto("/?component=button");
  await expect(page.getByRole("button", { name: "Create composition" })).toBeVisible();

  // The theme must have actually applied — a styled button is what a component
  // e2e spec is asserting it renders, and a transparent one (the VitePress
  // unlayering failure mode) proves nothing.
  const background = await page
    .getByRole("button", { name: "Create composition" })
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(background).not.toBe("rgba(0, 0, 0, 0)");
});
