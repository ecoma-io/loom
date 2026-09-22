import { test, expect, type Locator, type Page } from "@playwright/test";

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
//
// The suite's population is a tree fact the evidence gate reads out of this
// file's literal `page.goto("components/<name>")` strings — a goto that lives
// in a comment or a skipped test would load no page, so every component below
// navigates through a plain literal route and nothing else. A shared helper
// operates only on page state AFTER navigation; it never supplies a route.

/**
 * Focus a component-owned control and prove it clears the fixed docs header.
 *
 * The VitePress header is measured from the rendered page rather than assumed:
 * `--vp-nav-height` is what the site actually paints, and reading the element
 * keeps the check honest even if that token moves. The header (`.VPNav`) is
 * `position: fixed` on the desktop viewports this suite drives; below 960px it
 * is in-flow, so a focused element scrolled into view never overlaps it — the
 * same assertion holds on both, because it compares real rectangles rather than
 * a hard-coded height.
 */
async function focusAndExpectClearOfDocsHeader(page: Page, target: Locator): Promise<void> {
  await target.focus();
  await expect(target).toBeFocused();

  // Force the browser's own scroll-into-view — the same action focus takes,
  // made explicit so the measurement is about the scroll the browser performs
  // (which respects `scroll-padding-top`), not a manual translation.
  await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (el) el.scrollIntoView({ block: "start" });
  });

  // The focused element is obscured when it overlaps the header on both axes.
  // A measurement that cannot see the header is fail-closed: a check that
  // cannot look must not read as one that looked and found nothing.
  const obscured = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return true;
    const box = el.getBoundingClientRect();
    const nav = document.querySelector(".VPNav");
    if (!nav) return true;
    const navBox = nav.getBoundingClientRect();
    return (
      box.left < navBox.right &&
      box.right > navBox.left &&
      box.top < navBox.bottom &&
      box.bottom > navBox.top
    );
  });

  expect(obscured, "focused element is obscured by the fixed docs header").toBe(false);
}

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

test("a focused Checkbox in the demo is not hidden by the VitePress header", async ({ page }) => {
  await page.goto("components/checkbox");

  // The full demo's indeterminate row: the accessible name is the visible
  // label text ("Partially selected" in the page's inline demo, this exact
  // string only in the full demo), and the box is the component's own
  // `<button role="checkbox">`.
  await focusAndExpectClearOfDocsHeader(
    page,
    page.getByRole("checkbox", { name: "Indeterminate (parent of a partial group)" }),
  );
});

test("a focused CopyButton in the demo is not hidden by the VitePress header", async ({ page }) => {
  await page.goto("components/copy-button");

  // The demo's first CopyButton carries the default `labels.copy`; the other
  // two override it, so this name is unique to one rendered button.
  await focusAndExpectClearOfDocsHeader(
    page,
    page.getByRole("button", { name: "Copy to clipboard" }),
  );
});

test("a focused IconButton in the demo is not hidden by the VitePress header", async ({ page }) => {
  await page.goto("components/icon-button");

  // Every IconButton on the page is named "Close" or "Settings" — the variants
  // row, the sizes row, the disabled row are all those two. Scope to the full
  // demo's figure (the one with the source toggle) so the focused control is
  // unambiguously the demo's first variant button.
  const demo = page
    .locator("figure")
    .filter({ hasText: "IconButton variants, sizes, and disabled state" });
  await focusAndExpectClearOfDocsHeader(page, demo.getByRole("button", { name: "Close" }).first());
});

test("a focused Switch in the demo is not hidden by the VitePress header", async ({ page }) => {
  await page.goto("components/switch");

  // The demo's telemetry row labels the switch through `aria-labelledby`; the
  // name is unique to this demo (the page's inline demos use other labels).
  await focusAndExpectClearOfDocsHeader(
    page,
    page.getByRole("switch", { name: "Send anonymous telemetry" }),
  );
});

test("a focused TextField in the demo is not hidden by the VitePress header", async ({ page }) => {
  await page.goto("components/text-field");

  // The demo's over-limit field is named through `aria-labelledby` by its
  // "Headline (over the limit)" caption — the parens form is the full demo's
  // own; the page's inline counter demo uses "Headline, over the limit".
  await focusAndExpectClearOfDocsHeader(
    page,
    page.getByRole("textbox", { name: "Headline (over the limit)" }),
  );
});

test("a focused Textarea in the demo is not hidden by the VitePress header", async ({ page }) => {
  await page.goto("components/textarea");

  // The demo's resize-locked field is named through `aria-labelledby` by its
  // "Notes (resize locked)" caption — that exact string appears only in the
  // full demo (the page's inline "Locked size" demo names its field "Notes").
  await focusAndExpectClearOfDocsHeader(
    page,
    page.getByRole("textbox", { name: "Notes (resize locked)" }),
  );
});

test("a focused NumberField spinbutton in the demo is not hidden by the VitePress header", async ({
  page,
}) => {
  await page.goto("components/number-field");

  // The demo's first field is the spinbutton whose accessible name comes from
  // the "x — the default" caption via `aria-labelledby`; it is editable and
  // in-flow (the disabled and read-only rows are not the target here).
  await focusAndExpectClearOfDocsHeader(
    page,
    page.getByRole("spinbutton", { name: "x — the default" }),
  );
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
