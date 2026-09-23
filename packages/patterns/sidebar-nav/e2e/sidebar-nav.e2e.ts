import { expect, test, type Locator, type Page } from "@playwright/test";

// SidebarNav is native navigation chrome: `<a>` items in a `<nav>`, so Enter
// activation and tab order come from the platform rather than custom key
// handling — which is exactly why the browser is where the claim is proved.
// What a browser alone can witness: the walk seats each link in document
// order with the current page marked but not skipped, Enter fires the link's
// own navigation, and — the collapsed rail's whole accessible-name story —
// after the host folds the rail to icons, the same six items still seat in
// the same order and still answer to their labels, because the name moved
// into `aria-label` rather than into a tooltip-only hint.
//
// The demo mounts one nav of six links (five plain, "Overview" active) plus
// the host's own collapse Switch beneath it.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=sidebar-nav");
  await expect(link(page, "Overview")).toBeVisible({ timeout: 20_000 });
});

/** The demo's nav landmark. */
function nav(page: Page): Locator {
  return page.getByRole("navigation", { name: "Primary navigation" });
}

/** One destination link, by its label — visible text expanded, `aria-label` collapsed. */
function link(page: Page, named: string): Locator {
  return nav(page).getByRole("link", { name: named, exact: true });
}

test("Tab walks the nav's links in document order; the current page is marked, not skipped", async ({
  page,
}) => {
  // Six presses, each asserted by identity: a link the nav swallowed, or an
  // order that drifts from the list, fails at the stop it happens.
  for (const named of [
    "Overview",
    "Workflows",
    "Connections",
    "Members",
    "Notifications",
    "Settings",
  ]) {
    await page.keyboard.press("Tab");
    await expect(link(page, named)).toBeFocused();
  }
  await expect(link(page, "Overview")).toHaveAttribute("aria-current", "page");

  // Out of the nav: the host's collapse Switch is the next stop, and one
  // press after it leaves the demo — the nav releases the walk.
  await page.keyboard.press("Tab");
  const collapse = page.getByRole("switch");
  await expect(collapse).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#harness-sentinel")).toBeFocused();
});

test("Enter fires a link's own navigation", async ({ page }) => {
  // Seated by script: the walk is the test above's subject. The items render
  // real `<a href>` elements, so the browser's own activation is the
  // contract — no component key handler to trust.
  const workflows = link(page, "Workflows");
  await workflows.focus();
  await page.keyboard.press("Enter");
  await expect(workflows).toBeFocused();
  await expect(page).toHaveURL(/#$/);
});

test("after the host folds the rail, the same walk still seats every item by name", async ({
  page,
}) => {
  const collapse = page.getByRole("switch");
  await collapse.focus();
  await page.keyboard.press("Space");

  // Collapsed: the visible labels are gone from the rows…
  const workflows = link(page, "Workflows");
  await expect(workflows).toBeVisible();
  await expect(workflows).not.toContainText("Workflows");

  // …and the walk is unchanged. Seated by script at the first stop because
  // focus is still on the Switch; the six links follow it in the same order,
  // each still answering to its label through `aria-label`.
  await link(page, "Overview").focus();
  for (const named of ["Workflows", "Connections", "Members", "Notifications", "Settings"]) {
    await page.keyboard.press("Tab");
    await expect(link(page, named)).toBeFocused();
  }
  await expect(link(page, "Overview")).toHaveAttribute("aria-current", "page");
});
