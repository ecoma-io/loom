import { test, expect } from "@playwright/test";

// An icon button's whole keyboard contract is the native button's own: Enter
// and Space must both dispatch a click. The demo is presentation-only — no
// activation changes anything in it — so the observable is instrumented here:
// a counter attached BEFORE the gesture, listening for the click event itself,
// which is the exact thing a native button owes both keys. Nothing about the
// demo's DOM is invented on its behalf.

test("Enter and Space each dispatch the icon button's activation", async ({ page }) => {
  await page.goto("/?component=icon-button");

  const favourite = page.getByRole("button", { name: "Favourite" });
  await expect(favourite).toBeVisible();

  await favourite.evaluate((el) => {
    const w = window as typeof window & { activations?: number };
    w.activations = 0;
    // A named binding, the same one the listener rule's remediation names: the
    // page context this installs into is torn down with the test, so there is
    // no unmount to remove on — the inline shape stays unnameable either way.
    const count = () => {
      w.activations = (w.activations ?? 0) + 1;
    };
    el.addEventListener("click", count);
  });

  await favourite.focus();
  await page.keyboard.press("Enter");
  await expect
    .poll(() =>
      page.evaluate(() => (window as typeof window & { activations?: number }).activations),
    )
    .toBe(1);

  await page.keyboard.press("Space");
  await expect
    .poll(() =>
      page.evaluate(() => (window as typeof window & { activations?: number }).activations),
    )
    .toBe(2);
});
