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

test("the stack's width tracks the viewport below 24rem and caps above it", async ({ page }) => {
  // A stack exists only once an entry is pushed; `w-[min(92vw,24rem)]` is an
  // arbitrary value jsdom can carry but never resolve, so the clamp's two
  // halves are read off a real viewport.
  await page.getByRole("button", { name: "Toast success" }).click();

  // The first CI run measured widths this clamp cannot produce (384 where
  // 92vw of 360 says 331.2; 436.8 — exactly 24rem at an 18.2px root — where
  // the cap says 384), and the sheet itself is right: `.w-[min(92vw,24rem)]`
  // compiles to `width: min(92vw, 24rem)`. Rather than guess, every expect
  // below drags the measurement's inputs along with it: how many `ol`s the
  // page really holds, the box versus the COMPUTED width (a stale box with a
  // current width is a resize race; agreement at a wrong value is a rem or
  // transform fact), any transform on the element, and the root font-size
  // the rem resolves against. A repeat failure decides itself.
  async function attachViewportDebug(band: string): Promise<void> {
    const ol = page.locator("ol").first();
    await test.info().attach(`toast-viewport-debug (${band})`, {
      body: JSON.stringify({
        olCount: await page.locator("ol").count(),
        boundingBox: await ol.boundingBox(),
        computedWidth: await ol.evaluate((el) => getComputedStyle(el).width),
        transform: await ol.evaluate((el) => getComputedStyle(el).transform),
        rootFontSize: await page.evaluate(
          () => getComputedStyle(document.documentElement).fontSize,
        ),
      }),
      contentType: "application/json",
    });
  }

  await page.setViewportSize({ width: 360, height: 900 });
  // The stack must render once an entry is pushed — asserted before the width
  // so a render failure reads as a render failure, not as a wrong number.
  await expect(page.locator("ol")).toBeVisible();
  // Attached BEFORE the settled read, same as the 800 leg below: if the width
  // polled next had raced the resize, this attachment records what the stale
  // box actually held. CI run 34317753866 measured the WIDE viewport's 384 cap
  // at this 360 assertion in all three retries while the identical code passed
  // the previous run — a single boundingBox read after setViewportSize is a
  // race whichever direction the resize goes, so the box is only trustworthy
  // once it has settled.
  await attachViewportDebug("360");
  // 92vw of 360px — the viewport term wins below the cap. Settle by polling,
  // for the same reason the 800 leg does: the two legs' races alternate
  // depending on timing, and settling only one left the test flaky, not fixed.
  await expect
    .poll(
      async () => {
        const box = await page.locator("ol").boundingBox();
        return Math.abs((box?.width ?? 0) - 331.2);
      },
      { timeout: 5_000 },
    )
    .toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 800, height: 900 });
  // Attached BEFORE the settled read: if the width below had raced the resize,
  // this attachment is the record of what the stale box actually held (CI run
  // 34311271063 measured |width − 384| = 52.8 — the 360 leg's 331.2 re-read
  // after the resize, in all three engines).
  await attachViewportDebug("800");
  // 24rem = 384px — the cap wins once 92vw outgrows it. Read only once the
  // box has SETTLED on the post-resize value: a single boundingBox read after
  // setViewportSize raced the resize in CI, so the same ±1 tolerance both legs
  // hold is reached by polling rather than by one read.
  await expect
    .poll(
      async () => {
        const box = await page.locator("ol").boundingBox();
        return Math.abs((box?.width ?? 0) - 384);
      },
      { timeout: 5_000 },
    )
    .toBeLessThanOrEqual(1);
});
