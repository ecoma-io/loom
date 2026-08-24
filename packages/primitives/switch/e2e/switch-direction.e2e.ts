import { test, expect, type Locator } from "@playwright/test";

/**
 * Direction evidence for the Switch thumb.
 *
 * jsdom cannot judge geometry, so the RTL mirroring decision made in
 * Switch.vue is pinned here against real layout: the thumb must rest on the
 * *inline-start* edge while off, land on the inline-end edge when switched
 * on, and both facts must flip with `[dir="rtl"]` — a physical `left` anchor
 * keeps every pixel inside the track under RTL but never mirrors, which is
 * exactly the defect this spec exists to catch.
 *
 * The gaps below are measured between bounding boxes, so they include the
 * track's own transparent 1px border. They are also asymmetric on purpose,
 * and were before this change: the resting inset is `start-0.5` (2px) plus
 * that border ≈ 3px, while the checked position travels the full remaining
 * slack and sits flush against the far border ≈ 1px. A ±1.5px tolerance
 * absorbs sub-pixel rounding without loosening what is being asserted —
 * which edge the thumb sits on in each state and direction.
 */
const RESTING_GAP = 3;
const CHECKED_GAP = 1;
const TOLERANCE = 1.5;

/** Distance from the thumb's edges to the track's outer edges, in px. */
async function edgeGaps(thumb: Locator, track: Locator) {
  const inner = await thumb.boundingBox();
  const outer = await track.boundingBox();
  if (!inner || !outer) throw new Error("thumb or track not rendered");
  return {
    left: inner.x - outer.x,
    right: outer.x + outer.width - (inner.x + inner.width),
  };
}

test("under LTR the off thumb rests on the physical left edge and checking lands on the right", async ({
  page,
}) => {
  await page.goto("/?component=switch");
  await page.evaluate(() => {
    document.documentElement.setAttribute("dir", "ltr");
  });

  const track = page.getByRole("switch").first();
  const thumb = track.locator("span");

  // Polling on the checked landing edge rather than sleeping through the
  // slide: the assertion holds only once the transition has settled there.
  await track.click();
  await expect
    .poll(async () => {
      const gaps = await edgeGaps(thumb, track);
      return Math.abs(gaps.right - CHECKED_GAP);
    })
    .toBeLessThanOrEqual(TOLERANCE);

  // Toggle back and pin the resting anchor too — the half a physical `left`
  // anchor already got right under LTR, and the pixel-identity this fix must
  // not disturb.
  await track.click();
  await expect
    .poll(async () => {
      const gaps = await edgeGaps(thumb, track);
      return Math.abs(gaps.left - RESTING_GAP);
    })
    .toBeLessThanOrEqual(TOLERANCE);
});

test("under RTL both states mirror: off rests on the physical right, checking lands on the left", async ({
  page,
}) => {
  await page.goto("/?component=switch");
  await page.evaluate(() => {
    document.documentElement.setAttribute("dir", "rtl");
  });

  const track = page.getByRole("switch").first();
  const thumb = track.locator("span");

  // The off state under RTL must be the exact mirror of LTR's: anchored to
  // the inline-start edge, which is now the physical right.
  await expect
    .poll(async () => {
      const gaps = await edgeGaps(thumb, track);
      return Math.abs(gaps.right - RESTING_GAP);
    })
    .toBeLessThanOrEqual(TOLERANCE);

  // And the checked state must mirror onto the physical left — the whole
  // point of the fix, since the old geometry kept every pixel inside the
  // track but travelled the same way in both directions.
  await track.click();
  await expect
    .poll(async () => {
      const gaps = await edgeGaps(thumb, track);
      return Math.abs(gaps.left - CHECKED_GAP);
    })
    .toBeLessThanOrEqual(TOLERANCE);
});
