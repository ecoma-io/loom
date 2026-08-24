import { test, expect, type Locator, type Page } from "@playwright/test";

// Toast's browser-only facts are its timing mechanics: the swipe-to-dismiss
// release (Reka marks the root `data-swipe`, closes it past the provider's
// 50px threshold, and Loom's `animate-toast-out` rides that root while
// Reka's Presence waits for its `animationend`) and the auto-dismiss timer
// pausing while the pointer rests on the stack. jsdom sees none of this — a
// synthetic pointermove proves less than the gesture the browser itself
// produces, and the pause is invisible to anything that cannot let five
// seconds actually elapse.
//
// The drag is a mouse gesture rather than a finger, for the reason the drawer
// spec records: synthesizing touch is a Chromium-only CDP tunnel, and the
// pointer path is Reka's desktop half of the same gesture.

/** Waits until the entrance animation has settled so a gesture starts on the resting card. */
async function settledCard(card: Locator) {
  await expect(card).toBeVisible();
  await expect.poll(() => card.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
}

/**
 * Drags from the card's lower body toward the near (right) edge and HOLDS —
 * the caller releases, so it can arm a watcher before the flick that closes
 * the card. Expects the card to have been settled (`settledCard`) already.
 * The travel is capped to stay inside the window: the toast is anchored to
 * the right edge, so an uncapped flick would end past the viewport where the
 * pointerup is delivered to no one and the swipe hangs mid-air.
 */
async function dragRightAndHold(page: Page, card: Locator) {
  const box = await card.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) {
    throw new Error("The open toast card must have a bounding box and viewport.");
  }
  const startX = box.x + box.width * 0.5;
  const startY = box.y + box.height * 0.75;
  const travel = Math.min(viewport.width - startX - 4, 0.6 * box.width);
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + travel, startY, { steps: 12 });
}

test("a decisive swipe plays the release animation on the card root, then unmounts it", async ({
  page,
}) => {
  await page.goto("/?component=toast");
  await page.getByRole("button", { name: "Success" }).click();

  const card = page.locator("ol li");
  await settledCard(card);

  // Watch for the closed root from before the release — once Presence has
  // released it, no style can be read. Either we observe it wearing
  // `animate-toast-out`, or the exit has already finished and unmounted it;
  // both are correct, "never seen" is not.
  const sawExit = page
    .waitForFunction(
      () => {
        const el = document.querySelector<HTMLElement>('ol li[data-state="closed"]');
        return el ? getComputedStyle(el).animationName.includes("toast-out") : false;
      },
      { timeout: 2_000 },
    )
    .then(() => true)
    .catch(() => false);

  await dragRightAndHold(page, card);
  await page.mouse.up();

  expect(await sawExit).toBe(true);
  await expect(card).toHaveCount(0);
});

test("auto-dismisses when left alone — the control the pause claim stands against", async ({
  page,
}) => {
  test.setTimeout(20_000);
  await page.goto("/?component=toast");
  await page.getByRole("button", { name: "Success" }).click();

  // The demo's toast runs the primitive's 5000ms default; a card nobody
  // touched must be gone shortly after it, or the pause test below would
  // prove nothing.
  await expect(page.locator("ol li")).toBeVisible();
  await expect(page.locator("ol li")).toBeHidden({ timeout: 8_000 });
});

test("pauses the auto-dismiss while hovered and finishes it after the pointer leaves", async ({
  page,
}) => {
  test.setTimeout(25_000);
  await page.goto("/?component=toast");
  await page.getByRole("button", { name: "Success" }).click();

  const card = page.locator("ol li");
  await settledCard(card);

  // Resting on the card pauses the close timer: hold the pointer there well
  // past the 5000ms duration and the card must still be present.
  const box = await card.boundingBox();
  if (!box) throw new Error("The open toast card must have a bounding box.");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(6_000);
  await expect(card).toBeVisible();

  // Leaving hands the remainder back: the card finishes its dismissed life
  // on its own, without another interaction.
  await page.mouse.move(8, 8);
  await expect(card).toBeHidden({ timeout: 9_000 });
});
