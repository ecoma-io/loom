import { test, expect } from "@playwright/test";

// Alert's browser-only fact is dismissal under motion: the leaving element is
// held by Vue's Transition until the fade-fall animationend, so the control
// must survive long enough to be pressed during the exit and the alert must
// genuinely leave afterwards. jsdom ends transitions instantly and sees none
// of this.
//
// The reduced-motion collapse itself is pinned site-wide by the root
// reduced-motion suite; nothing here repeats it.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=alert");
  // The harness mounts Vue after first paint; every locator below assumes it.
  await expect(page.getByRole("alert").first()).toBeVisible();
});

test("a dismissible alert leaves the document when its close control is pressed", async ({
  page,
}) => {
  // Scoped by content: another dismissible alert sits further down the demo,
  // and an unscoped `.first()` would silently retarget it once this one left.
  const dismissible = page.getByRole("alert").filter({ hasText: "Sync failed" });
  await expect(dismissible).toBeVisible();

  await dismissible.getByRole("button", { name: "Dismiss" }).click();
  await expect(dismissible).toHaveCount(0);
});

test("no close control anywhere is anonymous — names come from the labels seam", async ({
  page,
}) => {
  // Slot content may bring its own named actions (the demo carries an Undo
  // button); what the seam guarantees is that Loom never renders an unnamed
  // one.
  const buttons = page.getByRole("alert").getByRole("button");
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    // Accessible name, not the aria-label attribute: slot content names its
    // own buttons through their text, and that counts.
    await expect(buttons.nth(i)).toHaveAccessibleName(/.+/);
  }
});

test("non-dismissible alerts render no control of their own", async ({ page }) => {
  const plain = page.getByRole("alert").filter({ hasText: "Scheduled maintenance" });
  await expect(plain).toBeVisible();
  await expect(plain.getByRole("button")).toHaveCount(0);
});
