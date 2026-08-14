import { test, expect } from "@playwright/test";

// Menubar is a hand-managed menu strip. Every trigger is a native <button>
// in the tab order; Tab walks each one individually when no menu is open.
// Arrow keys act when a menu is open: ArrowRight/Left switch menus,
// ArrowDown/Up navigate items. When a menu is open, Tab enters the menu
// items, not the next trigger. These interactions cannot be fully verified
// in jsdom, which does not run a real tab-order resolution.

test("Tab walks through each menubar trigger when no menu is open", async ({ page }) => {
  await page.goto("components/menubar");

  const demo = page.locator("figure").filter({ hasText: "File" });
  const triggers = demo.getByRole("menubar").getByRole("menuitem");
  const file = triggers.filter({ hasText: "File" });
  const view = triggers.filter({ hasText: "View" });
  const help = triggers.filter({ hasText: "Help" });

  // Click the first trigger, then close the menu so Tab walks triggers.
  await file.click();
  await page.keyboard.press("Escape");

  // Focus should be back on the File trigger (Escape returns focus).
  await expect(file).toBeFocused();

  // Tab moves to the next trigger.
  await page.keyboard.press("Tab");
  await expect(view).toBeFocused();

  // Tab again lands on the third trigger.
  await page.keyboard.press("Tab");
  await expect(help).toBeFocused();

  // Shift+Tab moves back.
  await page.keyboard.press("Shift+Tab");
  await expect(view).toBeFocused();
});

test("Enter opens the focused trigger's menu; Escape closes it and returns focus", async ({
  page,
}) => {
  await page.goto("components/menubar");

  const demo = page.locator("figure").filter({ hasText: "File" });
  const file = demo.getByRole("menubar").getByRole("menuitem").filter({ hasText: "File" });

  // Focus the trigger without opening the menu.
  await file.focus();

  // Enter opens the menu.
  await page.keyboard.press("Enter");
  const menu = demo.locator('[role="menu"]');
  await expect(menu).toBeVisible();

  // The first item in the menu should be highlighted (data-highlighted).
  const firstItem = menu.getByRole("menuitem").first();
  await expect(firstItem).toHaveAttribute("data-highlighted");

  // Escape closes the menu.
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
});

test("ArrowDown opens the focused trigger's menu and highlights the first item", async ({
  page,
}) => {
  await page.goto("components/menubar");

  const demo = page.locator("figure").filter({ hasText: "File" });
  const file = demo.getByRole("menubar").getByRole("menuitem").filter({ hasText: "File" });

  // Focus the trigger without opening the menu.
  await file.focus();

  // ArrowDown opens the menu and highlights the first item.
  await page.keyboard.press("ArrowDown");
  const menu = demo.locator('[role="menu"]');
  await expect(menu).toBeVisible();

  const firstItem = menu.getByRole("menuitem").first();
  await expect(firstItem).toHaveAttribute("data-highlighted");
});

test("ArrowRight switches to the next menu when a menu is open", async ({ page }) => {
  await page.goto("components/menubar");

  const demo = page.locator("figure").filter({ hasText: "File" });
  const file = demo.getByRole("menubar").getByRole("menuitem").filter({ hasText: "File" });
  const view = demo.getByRole("menubar").getByRole("menuitem").filter({ hasText: "View" });

  // Open File menu.
  await file.click();
  const fileMenu = demo.locator('[role="menu"]');
  await expect(fileMenu).toBeVisible();

  // ArrowRight should switch to the View menu.
  await page.keyboard.press("ArrowRight");
  // The View trigger should now show aria-expanded="true".
  await expect(view).toHaveAttribute("aria-expanded", "true");
});

test("ArrowDown and ArrowUp navigate items within an open menu", async ({ page }) => {
  await page.goto("components/menubar");

  const demo = page.locator("figure").filter({ hasText: "File" });
  const file = demo.getByRole("menubar").getByRole("menuitem").filter({ hasText: "File" });

  // Open the menu via keyboard so the first item is highlighted.
  // (Click opens the menu but does not highlight an item — activeIndex
  // stays -1 until a key event sets it.)
  await file.focus();
  await page.keyboard.press("ArrowDown");
  const menu = demo.locator('[role="menu"]');
  await expect(menu).toBeVisible();

  const items = menu.getByRole("menuitem");
  const firstItem = items.first();

  // First item should be highlighted after ArrowDown opens the menu.
  await expect(firstItem).toHaveAttribute("data-highlighted");

  // Move focus into the menu (the trigger retains focus after opening;
  // arrow-key navigation within the menu is handled by the menu div's
  // keydown listener, which requires the menu to be focused).
  await menu.focus();

  // ArrowDown highlights the next non-separator item.
  await page.keyboard.press("ArrowDown");
  const secondItem = items.nth(1);
  await expect(secondItem).toHaveAttribute("data-highlighted");
  await expect(firstItem).not.toHaveAttribute("data-highlighted");

  // ArrowUp moves back.
  await page.keyboard.press("ArrowUp");
  await expect(firstItem).toHaveAttribute("data-highlighted");
});
