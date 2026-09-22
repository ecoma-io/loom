import { expect, test, type Locator, type Page } from "@playwright/test";

// ScrollReel's browser-only fact is the overflow contract: the strip stays
// ONE line and the container scrolls instead of wrapping or stretching the
// page. jsdom has no overflow, so ScrollReel.test.ts can pin the classes but
// never the scrollWidth that makes the reel real.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=scroll-reel");
  // First hit on a fresh dev server compiles the whole entry chain; the
  // default 5s visibility timeout loses that race on a cold cache.
  await expect(page.getByText("Snap to start")).toBeVisible({ timeout: 20_000 });
});

/** The demo's first reel — eight fixed-width cards under `snap="start"`. */
function reel(page: Page): Locator {
  return page.locator(".overflow-x-auto").first();
}

test("the strip stays one line and overflows into a reel at every band", async ({ page }) => {
  for (const width of [360, 800]) {
    await page.setViewportSize({ width, height: 900 });
    const strip = reel(page);
    await expect(strip).toBeVisible();
    const { scrolled, rows } = await strip.evaluate((el) => {
      const boxes = [...el.children].map((child) => child.getBoundingClientRect().y);
      return {
        // Content wider than the box is the whole point: the reel has
        // somewhere to scroll to.
        scrolled: el.scrollWidth > el.clientWidth,
        // One line: every card shares the strip's first row.
        rows: new Set(boxes.map((y) => Math.round(y))).size,
      };
    });
    expect(scrolled, `scrollWidth must exceed clientWidth at ${String(width)}px`).toBe(true);
    expect(rows, `every card must share one row at ${String(width)}px`).toBe(1);
  }
});

test("the gap scale steps down below the sm band", async ({ page }) => {
  const strip = reel(page);
  await page.setViewportSize({ width: 800, height: 900 });
  const above = await strip.evaluate((el) => Number.parseFloat(getComputedStyle(el).columnGap));
  await page.setViewportSize({ width: 360, height: 900 });
  const below = await strip.evaluate((el) => Number.parseFloat(getComputedStyle(el).columnGap));
  // gap="md": gap-3 sm:gap-4 — 16px above `sm`, 12px below.
  expect(below).toBeLessThan(above);
});

// The keyboard contract is the component's reason to exist (ADR-002): the
// region is the tab stop, and the Home/End/arrow handler steps the strip to
// snap-aligned children. tests/ScrollReel.test.ts pins which keys reach
// `scrollTo` — jsdom runs no layout, so `scrollLeft` never moves there and
// only a real browser can witness the presses scrolling the strip.

/**
 * A settled step's postcondition: the offset has stopped moving, sits past
 * one card's width (a distance the browser's native arrow nudge never crosses
 * on a snap-mandatory strip — it re-snaps to the start), and still has strip
 * before the end, because stepping one child is the arrows' act and jumping
 * the whole strip is End's.
 */
function stepSettledInsideTheStrip(strip: Locator): () => Promise<boolean> {
  return () =>
    strip.evaluate(
      (el) =>
        new Promise<boolean>((resolve) => {
          const seen = el.scrollLeft;
          // The handler scrolls smoothly; a position that holds across a
          // pause is a settled one, without timing the animation.
          window.setTimeout(() => {
            resolve(
              el.scrollLeft === seen && seen > 150 && seen < el.scrollWidth - el.clientWidth - 1,
            );
          }, 200);
        }),
    );
}

test("Tab seats focus on the named region and ArrowRight steps the strip to the next snap child", async ({
  page,
}) => {
  // Room for several steps: at the default width the strip is barely wider
  // than the reel, and the first step would already sit at the end.
  await page.setViewportSize({ width: 600, height: 900 });
  const strip = reel(page);

  // The demo's first tabbable element is the reel itself, so the seat is
  // witnessed rather than scripted — the region's own tabindex is what the
  // whole keyboard contract hangs on.
  await page.keyboard.press("Tab");
  await expect(strip).toBeFocused();

  await page.keyboard.press("ArrowRight");
  await expect.poll(stepSettledInsideTheStrip(strip), { timeout: 10_000 }).toBe(true);
});

test("ArrowLeft steps back one child without jumping the strip home", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 900 });
  const strip = reel(page);

  // Seated by script one step in: the gesture under test is ArrowLeft, not
  // the seat.
  await strip.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(stepSettledInsideTheStrip(strip), { timeout: 10_000 }).toBe(true);
  const stepped = await strip.evaluate((el) => el.scrollLeft);

  await page.keyboard.press("ArrowLeft");
  await expect.poll(stepSettledInsideTheStrip(strip), { timeout: 10_000 }).toBe(true);
  const steppedBack = await strip.evaluate((el) => el.scrollLeft);
  // One child back, not Home's jump: still inside the strip (the settled-step
  // predicate above), and strictly behind the step-in position.
  expect(steppedBack).toBeLessThan(stepped);
});

test("End jumps to the strip's end and Home returns it to the start", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 900 });
  const strip = reel(page);

  // Seated by script: the gestures under test are End and Home.
  await strip.focus();
  await page.keyboard.press("End");
  // The distance left to the end — closed by End's one-press jump, and held
  // by snap-mandatory once there. ≤1 rather than 0 for device-pixel snapping.
  const distanceToEnd = () =>
    strip.evaluate((el) => el.scrollWidth - el.clientWidth - el.scrollLeft);
  await expect.poll(distanceToEnd, { timeout: 10_000 }).toBeLessThanOrEqual(1);

  await page.keyboard.press("Home");
  await expect.poll(() => strip.evaluate((el) => el.scrollLeft), { timeout: 10_000 }).toBe(0);
});
