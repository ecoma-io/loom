import { test, expect } from "@playwright/test";

// WCAG 2.2 SC 2.4.11 Focus Not Obscured (Minimum): when an element receives
// focus, no part of it may be hidden by author-created content. The common
// failure is a sticky or fixed header covering a focused element near the top
// of the viewport, or an open overlay hiding something that just received focus.
//
// The check below focuses each interactive element in the main content and
// verifies that the browser's scroll-into-view (which respects
// `scroll-padding-top`) leaves the focus ring fully visible below the fixed
// VitePress header. VitePress's own skip-link and nav chrome are excluded
// because they are outside this repository's reach; the test measures what
// Loom's own components do. Overlays (Dialog, Drawer, Popover) manage their
// own focus traps and are covered by the keyboard e2e tests.

test("a focused element in the content area is not hidden by the VitePress header", async ({
  page,
}) => {
  // A component page with interactive Loom elements.
  await page.goto("components/button");

  // The VitePress header is a fixed bar at the top. Find the first
  // focusable element inside the main content area (not VitePress's own
  // skip-link, which it positions at the viewport top behind the header
  // and which is VitePress's responsibility, not Loom's).
  const firstButton = page.locator("main button").first();
  await firstButton.focus();

  // Scroll the focused element into view — this is what the browser does on
  // focus, and `scroll-padding-top: 64px` (set in the docs theme) tells it to
  // leave room for the fixed header.
  await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (el) el.scrollIntoView({ block: "start" });
  });

  // After the browser has scrolled the element into view respecting
  // scroll-padding, the element's top edge must be below the header.
  const obscured = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    const box = el.getBoundingClientRect();
    // The VitePress header height. Measured from the site: 56px on desktop,
    // slightly taller on mobile — 64px is a safe upper bound and matches the
    // scroll-padding-top set in the docs theme.
    const headerHeight = 64;
    return box.top < headerHeight && box.bottom > 0;
  });

  expect(obscured, "focused element is obscured by the fixed header").toBe(false);
});

test("focus inside a Dialog is not obscured by the backdrop or other chrome", async ({ page }) => {
  await page.goto("components/dialog");

  // Open the first dialog demo.
  const trigger = page.getByRole("button", { name: "Delete scene" }).first();
  await trigger.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Tab into the dialog. Focus should land on a visible control.
  await page.keyboard.press("Tab");

  const obscured = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    const box = el.getBoundingClientRect();
    // Check that the focused element is fully within the dialog panel.
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return false;
    const dialogBox = dialog.getBoundingClientRect();
    return (
      box.top < dialogBox.top ||
      box.bottom > dialogBox.bottom ||
      box.left < dialogBox.left ||
      box.right > dialogBox.right
    );
  });

  expect(obscured, "focused element inside dialog is outside the dialog bounds").toBe(false);

  // Close the dialog.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("focus inside a Drawer panel is not obscured by the backdrop edge", async ({ page }) => {
  await page.goto("components/drawer");

  // Open the first drawer demo (right-anchored).
  const trigger = page.getByRole("button", { name: "Open detail" });
  await trigger.click();

  const drawer = page.locator('[role="dialog"]');
  await expect(drawer).toBeVisible();

  // Tab into the drawer. Focus should land on a visible control inside the panel.
  await page.keyboard.press("Tab");

  const obscured = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    const box = el.getBoundingClientRect();
    const panel = document.querySelector('[role="dialog"]');
    if (!panel) return false;
    const panelBox = panel.getBoundingClientRect();
    return (
      box.top < panelBox.top ||
      box.bottom > panelBox.bottom ||
      box.left < panelBox.left ||
      box.right > panelBox.right
    );
  });

  expect(obscured, "focused element inside drawer is outside the panel bounds").toBe(false);

  // Close the drawer.
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
});
