import { expect, test } from "@playwright/test";

/**
 * TimeTrack harness specimens — `?component=time-track` mounts TimeTrackDemo,
 * whose domain is 0..60_000 ms and whose three bars sit at 0-8s, 8-26s and
 * 26-42s with the window covering the full domain. Full-window proportions are
 * therefore exact: DNS sits at 0% and is 13.33% of the track wide, TLS spans
 * 13.33..43.33%.
 */

const TRACK = "[data-loom-time-track]";
const RULER = "[data-loom-time-ruler]";
const TOLERANCE = 0.02; // ±2% of the track's width, against box rounding.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=time-track");
  await expect(page.locator(TRACK)).toBeVisible();
});

test("renders a labelled ruler with formatDuration tick labels", async ({ page }) => {
  const ruler = page.locator(RULER);
  await expect(ruler).toBeVisible();

  // Full window over a 60s domain, tickCount 6 → nice step 20s (5 intervals).
  const labels = ruler.locator("div.absolute.whitespace-nowrap");
  await expect(labels).toHaveCount(4);
  await expect(labels.nth(0)).toHaveText("0ms");
  await expect(labels.nth(1)).toHaveText("20s");
  await expect(labels.nth(2)).toHaveText("40s");
  await expect(labels.nth(3)).toHaveText("1m");
});

test("positions bars proportionally inside the track", async ({ page }) => {
  const trackBox = await page.locator(TRACK).boundingBox();
  if (trackBox === null) throw new Error("track has no bounding box");

  const dnsBox = await page.locator('[aria-label="DNS lookup"]').boundingBox();
  if (dnsBox === null) throw new Error("DNS bar has no bounding box");
  expect(dnsBox.x - trackBox.x).toBeLessThanOrEqual(trackBox.width * TOLERANCE);
  expect(dnsBox.width / trackBox.width).toBeCloseTo(8 / 60, 1);

  const tlsBox = await page.locator('[aria-label="TLS handshake"]').boundingBox();
  if (tlsBox === null) throw new Error("TLS bar has no bounding box");
  expect((tlsBox.x - trackBox.x) / trackBox.width).toBeCloseTo(8 / 60, 1);
  expect(tlsBox.width / trackBox.width).toBeCloseTo(18 / 60, 1);
});

test("host-owned window seam: zooming in widens the bars", async ({ page }) => {
  const before = await page.locator('[aria-label="TLS handshake"]').boundingBox();
  if (before === null) throw new Error("TLS bar has no bounding box before zoom");

  await page.getByRole("button", { name: "Zoom in" }).click();
  // The controlled window is the seam: wait for the ruler to re-label itself,
  // then a bar still crossing the viewport must have widened.
  await expect(page.getByRole("img", { name: /from 15s to 45s/ })).toBeVisible();

  const after = await page.locator('[aria-label="TLS handshake"]').boundingBox();
  if (after === null) throw new Error("TLS bar has no bounding box after zoom");
  expect(after.width).toBeGreaterThan(before.width);
});
