import { test, expect, type Page } from "@playwright/test";

// ToastStack's browser-only fact is queue turnover while the reader has asked
// for less motion. The host caps the visible queue and retires the oldest
// entries; each retirement closes a card through Reka's Presence, which holds
// a closed element until an `animationend` arrives on it. Under
// `prefers-reduced-motion` the global collapse shrinks that exit to 0.01ms —
// which must still fire the event, or retired cards would linger invisible
// and the queue would silently stop turning over. jsdom can express none of
// this: no media query, no animation events.
//
// Every entry here carries the demo's 4000ms auto-dismiss, so the assertions
// would otherwise race a live timer and fail whenever the machine hiccups.
// Resting the pointer on the stack engages Reka's own hover-pause and freezes
// every close timer — not because pause is the behaviour under test, but so
// the turnover below can be asserted against a queue nothing else is emptying.
// The collapse itself (that the duration really lands under 1ms) is asserted
// once, so the turnover claim cannot pass against an unreduced page.

const REDUCE = { reducedMotion: "reduce" as const };

/** Rests the pointer on the stack, engaging Reka's hover-pause for every open timer. */
async function holdOnStack(page: Page) {
  const stack = page.getByRole("list");
  const box = await stack.boundingBox();
  if (!box) throw new Error("The toast stack must have a bounding box once entries exist.");
  await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, box.height - 8));
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia(REDUCE);
  await page.goto("/?component=toast-stack");
  // Pay the harness's one-time demo compilation before anything is timed.
  await page.locator("#app > *").first().waitFor();
});

test("under reduce, pushing past the queue's cap retires the oldest cards and every exit still unmounts", async ({
  page,
}) => {
  // Fill the demo's cap of four with distinct titles: success, info, then the
  // pair the combined button pushes.
  await page.getByRole("button", { name: "Toast success" }).click();
  await page.getByRole("button", { name: "Toast info" }).click();
  await page.getByRole("button", { name: "Two at once — stacked with a gap" }).click();
  await holdOnStack(page);

  const cards = page.locator("ol li");
  await expect(cards).toHaveCount(4);
  // The reduce really reached the demo before anything turns over.
  await expect
    .poll(() =>
      cards.first().evaluate((el) => Number.parseFloat(getComputedStyle(el).animationDuration)),
    )
    .toBeLessThan(1);

  // Two more entries arrive; the two oldest ("Workflow saved", "Member
  // removed") retire to make room. The count never exceeds the cap in
  // between — and if a collapsed exit ever failed to fire its `animationend`,
  // the retiring cards would stay mounted here forever.
  await page.getByRole("button", { name: "Two at once — stacked with a gap" }).click();
  await holdOnStack(page);

  // Counted inside the list only: every card also carries a hidden announce
  // span repeating its text OUTSIDE the `ol`, which an unscoped text search
  // would double-count.
  const stack = page.locator("ol");
  await expect(cards).toHaveCount(4);
  await expect(stack.getByText("Workflow saved")).toHaveCount(0);
  await expect(stack.getByText("Member removed")).toHaveCount(0);
  await expect(stack.getByText("Member added")).toHaveCount(2);
  await expect(stack.getByText("Workflow updated")).toHaveCount(2);
});
