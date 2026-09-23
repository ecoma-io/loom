import { expect, test, type Locator, type Page } from "@playwright/test";

// TitleBar is a host of controls it does not own — a Menubar strip and a
// WindowControls cluster in one drag strip — so its keyboard-operate duty, as
// the sidecar states it, is keyboard passage between the hosted controls:
// the walk must cross from the menu triggers onto the window buttons and out
// of the bar without a trap, and each hosted cluster must answer the
// keyboard through the bar exactly as it does alone.
//
// The demo mounts one bar (File / View / Help menus, Windows chrome) above a
// platform radio strip and a "Last event" readout. The walk is seated on the
// File trigger by script because the radios before the bar are three
// ungrouped native radios whose per-engine tab semantics are demo chrome,
// not the pattern's contract.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=title-bar");
  await expect(menubar(page)).toBeVisible({ timeout: 20_000 });
});

/** The hosted Menubar strip. */
function menubar(page: Page): Locator {
  return page.getByRole("menubar");
}

/** One hosted menu trigger, by its label. */
function menuTrigger(page: Page, named: string): Locator {
  return menubar(page).getByRole("menuitem").filter({ hasText: named });
}

/** The window-control button the cluster keys by testid (its label flips). */
function control(page: Page, testid: string): Locator {
  return page.getByTestId(testid);
}

/** The demo's "Last event" readout. */
function lastEvent(page: Page): Locator {
  return page.locator("code.tabular");
}

test("the walk crosses the hosted clusters: menu triggers, then window controls, then out", async ({
  page,
}) => {
  await menuTrigger(page, "File").focus();
  await expect(menuTrigger(page, "File")).toBeFocused();

  // Across the strip's own triggers…
  await page.keyboard.press("Tab");
  await expect(menuTrigger(page, "View")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(menuTrigger(page, "Help")).toBeFocused();

  // …then onto the hosted window cluster, in its DOM order…
  await page.keyboard.press("Tab");
  await expect(control(page, "win-minimize")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(control(page, "win-maximize")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(control(page, "win-close")).toBeFocused();

  // …and out of the bar entirely: nothing in the drag strip caught the walk.
  await page.keyboard.press("Tab");
  await expect(page.locator("#harness-sentinel")).toBeFocused();
});

test("Enter opens the hosted menu onto its first row, and choosing it fires the bar's select", async ({
  page,
}) => {
  await menuTrigger(page, "File").focus();
  await page.keyboard.press("Enter");

  // The menu is the trigger's own panel, scoped by the label it is given.
  const menu = page.getByRole("menu", { name: "File" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Open project…" })).toBeFocused();

  // Choosing from the keyboard closes the panel, hands focus back to the
  // owning trigger, and the demo's readout carries the command through the
  // bar's re-emitted select.
  await page.keyboard.press("Enter");
  await expect(menu).toBeHidden();
  await expect(menuTrigger(page, "File")).toBeFocused();
  await expect(lastEvent(page)).toHaveText("file.open");
});

test("Enter on the hosted window controls flips maximize to restore and fires each intent", async ({
  page,
}) => {
  // Addressed by testid because the activation the test performs is what
  // changes the accessible name.
  const maximize = control(page, "win-maximize");
  await maximize.focus();
  await page.keyboard.press("Enter");
  await expect(maximize).toHaveAccessibleName("Restore");
  await expect(lastEvent(page)).toHaveText("window.maximize");

  // The flip is the maximize/restore state itself: the same key returns it.
  await page.keyboard.press("Enter");
  await expect(maximize).toHaveAccessibleName("Maximize");

  await control(page, "win-close").focus();
  await page.keyboard.press("Enter");
  await expect(lastEvent(page)).toHaveText("window.close");
});
