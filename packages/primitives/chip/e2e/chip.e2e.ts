import { expect, test, type Locator, type Page } from "@playwright/test";

// The chip's keyboard contract is the browser's own, and that is the point of
// the component: the pill paints, and everything pressable is a native button
// inside it — the toggle (`aria-pressed`) and, when removable, a labelled
// dismiss button as a sibling, never a child. No key handler exists anywhere
// in the chain, so Space and Enter activate through the platform, both controls
// sit on the natural tab order (a reader reaches "remove" without guessing an
// arrow key), and a disabled chip's buttons drop out of it. jsdom runs neither
// activation nor the focus walk, which is why the unit tier could only assert
// the markup.
//
// The demo's first group is the filters row (toggleable, "Errors" seeded on);
// the second is the recipients row (dismiss-only, three people); the third
// carries both controls on one chip.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=chip");
  await expect(toggle(page, "Errors")).toBeVisible({ timeout: 20_000 });
});

/** A chip's toggle button by its label text. */
function toggle(page: Page, label: string): Locator {
  return page.getByRole("button", { name: label, exact: true });
}

/** A chip's dismiss control by its label. */
function removeButton(page: Page, label: string): Locator {
  return page.getByRole("button", { name: label, exact: true });
}

test("Space and Enter toggle the filter, and the page reports the set", async ({ page }) => {
  const errors = toggle(page, "Errors");

  // The filters row is the demo's first tab stop.
  await page.keyboard.press("Tab");
  await expect(errors).toBeFocused();
  await expect(errors).toHaveAttribute("aria-pressed", "true");

  // Space switches the chip off; the demo's "Showing:" line follows.
  await page.keyboard.press("Space");
  await expect(errors).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("Showing:")).toContainText("everything");

  // Enter switches it back on — the platform gives a button both keys.
  await page.keyboard.press("Enter");
  await expect(errors).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Showing:")).toContainText("error");
});

test("the dismiss-only chip is reached through its remove control, and removing it lands", async ({
  page,
}) => {
  const ana = removeButton(page, "Remove Ana Duarte");

  // A dismiss-only chip renders its label as inert text — the remove button is
  // the only stop the chip has. The walk reaches it after the four filter
  // toggles: no extra stop for the label, no arrow-key guessing.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(ana).toBeFocused();
  await page.keyboard.press("Enter");

  // The chip leaves the row and the demo's restore affordance takes its place;
  // the other two recipients stay.
  await expect(ana).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Restore 1" })).toBeVisible();
  await expect(removeButton(page, "Remove Minh Tran")).toBeVisible();
});

test("a chip that both toggles and dismisses is two stops, never one", async ({ page }) => {
  const region = toggle(page, "Region: EU");

  await region.focus();
  await expect(region).toHaveAttribute("aria-pressed", "true");

  // The walk crosses the toggle and lands on its sibling dismiss control —
  // siblings, not a button nested in a button.
  await page.keyboard.press("Tab");
  const removeRegion = removeButton(page, "Remove the region facet");
  await expect(removeRegion).toBeFocused();

  // Toggle with Space, dismiss with Enter: two controls, two native actions.
  await page.keyboard.press("Space");
  await expect(region).toHaveAttribute("aria-pressed", "false");
  await removeRegion.focus();
  await page.keyboard.press("Enter");
  await expect(removeRegion).toHaveCount(0);
  await expect(region).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Restore facets" })).toBeVisible();
});

test("the disabled chips drop out of the walk", async ({ page }) => {
  // The walk from the sizes row crosses both disabled chips — locked toggle
  // and locked remove alike — and seats the harness sentinel.
  await toggle(page, "Medium").focus();
  await page.keyboard.press("Tab");
  await expect(page.locator("#harness-sentinel")).toBeFocused();
  await expect(page.getByRole("button", { name: "Locked filter" })).toBeDisabled();
});
