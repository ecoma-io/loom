import { test, expect } from "@playwright/test";

// Menubar is a roving-tabindex bar: only one trigger carries tabindex="0",
// the rest carry tabindex="-1". Arrow keys move between triggers and open
// menus; Enter/Space opens the focused trigger; Escape closes the open menu
// and returns focus to its trigger. These interactions are built on Reka UI's
// Menubar primitives and cannot be fully verified in jsdom, which does not
// run a real tab-order resolution.

test("Tab lands on exactly one menubar trigger; the rest carry tabindex=-1", async ({ page }) => {
  await page.goto("components/menubar");

  // Find the interactive demo figure.
  const demo = page.locator("figure").filter({ hasText: "File" });
  const trigger = demo.getByRole("menubar").getByRole("menuitem").first();
  await trigger.click();
  await expect(trigger).toBeFocused();

  // Tab away and back: only one trigger should be in the tab order.
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).not.toHaveAttribute("role", "menuitem");

  // Shift+Tab back should land on the same trigger.
  await page.keyboard.press("Shift+Tab");
  await expect(trigger).toBeFocused();
});

test("ArrowRight moves focus across triggers without opening the menus", async ({ page }) => {
  await page.goto("components/menubar");

  const demo = page.locator("figure").filter({ hasText: "File" });
  const triggers = demo.getByRole("menubar").getByRole("menuitem");
  const file = triggers.filter({ hasText: "File" });
  const view = triggers.filter({ hasText: "View" });

  await file.click();
  await expect(file).toBeFocused();

  // Close any open menu first.
  await page.keyboard.press("Escape");

  // ArrowRight should move focus to the next trigger without opening it.
  await page.keyboard.press("ArrowRight");
  await expect(view).toBeFocused();

  // No menu should be open.
  const openMenus = demo.locator('[role="menu"][data-state="open"]');
  await expect(openMenus).toHaveCount(0);
});

test("ArrowLeft wraps from the first trigger to the last", async ({ page }) => {
  await page.goto("components/menubar");

  const demo = page.locator("figure").filter({ hasText: "File" });
  const triggers = demo.getByRole("menubar").getByRole("menuitem");
  const file = triggers.filter({ hasText: "File" });
  const help = triggers.filter({ hasText: "Help" });

  await file.click();
  await expect(file).toBeFocused();
  await page.keyboard.press("Escape");

  await page.keyboard.press("ArrowLeft");
  await expect(help).toBeFocused();
});

test("Enter opens the focused trigger's menu; Escape closes it and returns focus", async ({
  page,
}) => {
  await page.goto("components/menubar");

  const demo = page.locator("figure").filter({ hasText: "File" });
  const file = demo.getByRole("menubar").getByRole("menuitem").filter({ hasText: "File" });

  await file.click();
  await expect(file).toBeFocused();
  // Close first so we can test Enter explicitly.
  await page.keyboard.press("Escape");

  // Enter opens the menu.
  await page.keyboard.press("Enter");
  const menu = demo.locator('[role="menu"]');
  await expect(menu).toBeVisible();

  // The first item in the menu should receive focus.
  const firstItem = menu.getByRole("menuitem").first();
  await expect(firstItem).toBeFocused();

  // Escape closes the menu and returns focus to the trigger.
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(file).toBeFocused();
});

test("ArrowDown opens the focused trigger's menu and moves to the first item", async ({ page }) => {
  await page.goto("components/menubar");

  const demo = page.locator("figure").filter({ hasText: "File" });
  const file = demo.getByRole("menubar").getByRole("menuitem").filter({ hasText: "File" });

  await file.click();
  await expect(file).toBeFocused();
  await page.keyboard.press("Escape");

  // ArrowDown should open the menu and focus the first item.
  await page.keyboard.press("ArrowDown");
  const menu = demo.locator('[role="menu"]');
  await expect(menu).toBeVisible();

  const firstItem = menu.getByRole("menuitem").first();
  await expect(firstItem).toBeFocused();
});

test("ArrowRight from an open menu moves to the next trigger's menu", async ({ page }) => {
  await page.goto("components/menubar");

  const demo = page.locator("figure").filter({ hasText: "File" });
  const file = demo.getByRole("menubar").getByRole("menuitem").filter({ hasText: "File" });
  const view = demo.getByRole("menubar").getByRole("menuitem").filter({ hasText: "View" });

  // Open File menu.
  await file.click();
  const fileMenu = demo.locator('[role="menu"]').first();
  await expect(fileMenu).toBeVisible();

  // ArrowRight should close the File menu, open the View menu, and focus the
  // View trigger.
  await page.keyboard.press("ArrowRight");
  await expect(view).toBeFocused();
});

test("ArrowDown and ArrowUp navigate items within an open menu", async ({ page }) => {
  await page.goto("components/menubar");

  const demo = page.locator("figure").filter({ hasText: "File" });
  const file = demo.getByRole("menubar").getByRole("menuitem").filter({ hasText: "File" });

  await file.click();
  const menu = demo.locator('[role="menu"]');
  await expect(menu).toBeVisible();

  const items = menu.getByRole("menuitem");
  const firstItem = items.first();

  // ArrowDown from the trigger should land on the first item.
  // (Menu is already open from the click, first item should be focused.)
  await expect(firstItem).toBeFocused();

  // ArrowDown moves to the next non-separator item.
  // reka-ui uses delay: 50 to avoid race with roving focus timer.
  await page.keyboard.press("ArrowDown", { delay: 50 });
  const secondItem = items.nth(1);
  await expect(secondItem).toBeFocused();

  // ArrowUp moves back.
  await page.keyboard.press("ArrowUp", { delay: 50 });
  await expect(firstItem).toBeFocused();
});
