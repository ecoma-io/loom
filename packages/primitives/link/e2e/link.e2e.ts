import { test, expect } from "@playwright/test";

// Link's browser-only keyboard facts: activation is the native anchor's own
// Enter contract, and the unavailable state removes the destination from the
// keyboard's reach entirely.
//
// jsdom runs no native navigation on Enter (and no native Tab-key behaviour),
// so neither half exists in the unit suite. The harness mounts the same demo
// through a Vite dev server, so the anchor is a real one and the browser's
// own activation machinery is the thing under test.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=link");
  await expect(page.getByRole("link", { name: "Default link" })).toBeVisible();
});

test("Enter on a focused link activates the native anchor and navigates to its href", async ({
  page,
}) => {
  // Seated by script rather than clicked: the gesture under test is the
  // Enter keypress, so the browser's activation path must be the one that
  // runs.
  const link = page.getByRole("link", { name: "Default link", exact: true });
  await link.focus();
  await expect(link).toBeFocused();

  // `href` is a same-page hash, so Enter travels the browser's native
  // activation path without leaving the served document — the observable is
  // the URL's hash landing on the anchor's destination.
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#default$/);
});

test("an unavailable link is a drained span: present, announced, and out of the tab order", async ({
  page,
}) => {
  // The disabled shape replaces the anchor with an inert span, so neither
  // Enter nor Tab can reach it — the state is told to assistive tech by
  // `aria-disabled` rather than colour alone, and it stays announced in the
  // list of what the page offers.
  const unavailable = page.getByText("Unavailable link");
  await expect(unavailable).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByRole("link", { name: "Unavailable link" })).toHaveCount(0);

  // Tab into the page and walk the real links in document order; the
  // unavailable span is not among them, and traversal leaves the page onto
  // the harness's trailing stop rather than stranding on the drained text.
  const first = page.getByRole("link", { name: "Default link", exact: true });
  await first.focus();
  for (const name of ["Muted link", "Accent link", "Subtle link", "Plain link"]) {
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name })).toBeFocused();
  }
  // The external link is the last real one; the next Tab stop after it is the
  // harness sentinel that follows the demo.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Visit example.com" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#harness-sentinel")).toBeFocused();
});
