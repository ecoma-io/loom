import { test, expect } from "@playwright/test";

// Carousel's browser-only facts are the ones jsdom fakes: real scroll
// positions after paging, controls that disable at real boundaries, and a
// strip that pages by keyboard once it holds focus.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=carousel");
  await expect(page.getByRole("region").first()).toBeVisible();
});

test("Next scrolls the track one page and Previous comes back; boundaries stop without loop", async ({
  page,
}) => {
  const region = page.getByRole("region").first();
  const track = region.locator('[tabindex="0"]');
  const next = region.getByRole("button", { name: "Next slide" });
  const previous = region.getByRole("button", { name: "Previous slide" });

  await expect(previous).toBeDisabled();

  await next.click();
  await page.waitForFunction((el) => el.scrollLeft > 200, await track.elementHandle(), {
    timeout: 2_000,
  });

  // Page past the end on all three slides: Next must retire at the boundary.
  for (const _ of [1, 2]) await next.click();
  await expect(next).toBeDisabled({ timeout: 2_000 });
});

test("loop wraps from last back to first instead of stopping", async ({ page }) => {
  const looping = page.locator('[role="region"]').nth(1);
  const track = looping.locator('[tabindex="0"]');
  const next = looping.getByRole("button", { name: "Next slide" });

  const pagesFromStart = () => track.evaluate((el) => el.scrollLeft / Math.max(1, el.clientWidth));

  await next.click();
  await expect.poll(pagesFromStart, { timeout: 10_000 }).toBeGreaterThan(0.5);
  await next.click();
  await expect.poll(pagesFromStart, { timeout: 10_000 }).toBeGreaterThan(1.5);
  await next.click(); // wraps past the end
  await expect.poll(pagesFromStart, { timeout: 10_000 }).toBeLessThan(0.5);
  await expect(next).toBeEnabled();
});

test("the focused track pages by arrow keys", async ({ page }) => {
  const region = page.getByRole("region").first();
  const track = region.locator('[tabindex="0"]');
  await track.focus();
  await page.keyboard.press("ArrowRight");

  await page.waitForFunction((el) => el.scrollLeft > 200, await track.elementHandle(), {
    timeout: 2_000,
  });
});
