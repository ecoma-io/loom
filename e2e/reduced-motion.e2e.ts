import { test, expect } from "@playwright/test";

// `prefers-reduced-motion` is a browser fact jsdom cannot express, and the two
// things this suite pins are exactly the failure modes a unit run cannot see:
//
//   1. The global collapse lands. `global.css` collapses every animation and
//      transition to 0.01ms under reduce; these tests read computed styles on
//      real animated elements to prove the media query actually reaches them.
//
//   2. Presence still lets go. Reka holds closed overlay content until an
//      `animationend` arrives — that is what makes timed exits possible at
//      all — and the collapse is designed so a 0.01ms animation still fires
//      one. If that ever regressed, an overlay under reduce would close into
//      an element that never unmounts, invisible to every other gate here.
const REDUCE = { reducedMotion: "reduce" as const };

test("/components/dialog under reduce: the entrance collapses and closing still unmounts", async ({
  page,
}) => {
  await page.emulateMedia(REDUCE);
  await page.goto("components/dialog");

  await page.getByRole("button", { name: "Rename" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // The panel enters on animate-scale-in; under reduce its duration is the
  // 0.01ms collapse, not the token's 140ms.
  await expect
    .poll(() => dialog.evaluate((el) => Number.parseFloat(getComputedStyle(el).animationDuration)))
    .toBeLessThan(1);

  await dialog.press("Escape");
  // The exit must complete: Presence releases the node only after an
  // `animationend`, collapsed or not.
  await expect(dialog).toHaveCount(0);
});

test("/components/dialog without reduce: the exit plays as a real animation before unmounting", async ({
  page,
}) => {
  await page.goto("components/dialog");
  await page.getByRole("button", { name: "Rename" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Watch for the closed-state panel from before the close click — once it is
  // gone, no style can be read. Either we observe it wearing the scale-out
  // exit, or Presence has already released it; both are correct, "never seen"
  // is not.
  const sawExit = page
    .waitForFunction(
      () => {
        const el = document.querySelector('[role="dialog"][data-state="closed"]');
        if (!el) return false;
        return getComputedStyle(el).animationName.includes("scale-out");
      },
      { timeout: 2_000 },
    )
    .then(() => true)
    .catch(() => false);

  await dialog.press("Escape");
  expect(await sawExit).toBe(true);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("/components/drawer under reduce: the slide-in collapses and closing still unmounts", async ({
  page,
}) => {
  await page.emulateMedia(REDUCE);
  await page.goto("components/drawer");

  await page.getByRole("button", { name: "Filters (right, sm)" }).click();
  const drawer = page.getByRole("dialog", { name: "Filters" });
  await expect(drawer).toBeVisible();
  // The panel enters on a `@starting-style` transition (`duration-slow`);
  // under reduce the global collapse holds that slide to 0.01ms, and the
  // overlay's paired fade reads the same way the dialog's entrance does.
  await expect
    .poll(() =>
      drawer.evaluate((el) =>
        getComputedStyle(el)
          .transitionDuration.split(",")
          .map((value) => Number.parseFloat(value))
          .reduce((a, b) => Math.max(a, b), 0),
      ),
    )
    .toBeLessThan(1);

  await drawer.press("Escape");
  // The slide-out exit is a keyframe for Presence's sake alone (a transition
  // on the way out never reaches an `animationend`), so this is the assertion
  // that would catch a closed drawer mounting itself into a permanent,
  // input-blocking overlay.
  await expect(page.getByRole("dialog", { name: "Filters" })).toHaveCount(0);
});

test("/components/toast under reduce: the entrance collapses and dismissal still unmounts", async ({
  page,
}) => {
  await page.emulateMedia(REDUCE);
  await page.goto("components/toast");

  await page.getByRole("button", { name: "Success" }).click();
  const toast = page.locator('[class*="animate-toast-in"]');
  await expect(toast).toBeVisible();
  // The card enters on `toast-in`; under reduce its duration is the 0.01ms
  // collapse, not the token's normal duration.
  await expect
    .poll(() => toast.evaluate((el) => Number.parseFloat(getComputedStyle(el).animationDuration)))
    .toBeLessThan(1);

  // Dismissed through the card's own control rather than waited out: the
  // auto-dismiss timer is a host decision, the ✕ is not.
  await toast.getByRole("button", { name: "Close" }).click();
  // The `toast-out` keyframe rides ToastRoot itself, and Presence releases
  // the node only after that animation's `animationend` — collapsed or not.
  await expect(toast).toHaveCount(0);
});

test("/components/skeleton under reduce: the shimmer loop stops looping", async ({ page }) => {
  await page.emulateMedia(REDUCE);
  await page.goto("components/skeleton");

  const shimmer = page.locator('[class*="animate-shimmer"]').first();
  await expect(shimmer).toBeVisible();
  // `global.css` forces iteration-count to 1 under reduce; the loader keeps
  // playing once rather than forever, and nothing needs JavaScript to do it.
  await expect
    .poll(() => shimmer.evaluate((el) => getComputedStyle(el).animationIterationCount))
    .toBe("1");
});
