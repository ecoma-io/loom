import { test, expect } from "@playwright/test";

// Layout components have intrinsic responsive behaviour driven by flex-wrap
// and min-width constraints rather than viewport media queries. These tests
// verify the three key behaviours:
//
// 1. **Stack**: below the collapse width, side-by-side panels wrap to
//    full-width and stack vertically.
// 2. **Split**: above the collapse width, panels sit side by side.
// 3. **Bound**: on ultrawide viewports, content gutters widen and content
//    never stretches to the full viewport width.
//
// Each test drives the layout's documentation demo. The selectors target
// elements the demo is known to contain, so conditional guards are not needed.

test("AppShell sidebar stacks below 48rem and splits above", async ({ page }) => {
  // At narrow width, the sidebar and content should stack (both full-width).
  await page.setViewportSize({ width: 600, height: 800 });
  await page.goto("layouts/app-shell");

  // The demo renders a <figure> containing the AppShell. The sidebar is
  // an <aside> and the content area is the flex-grow sibling after it.
  const demo = page.locator("figure").first();
  const sidebar = demo.locator("aside").first();
  const content = demo.locator("aside + div").first();

  // Stacked: the content starts below (or at the bottom of) the sidebar.
  const sidebarBox = await sidebar.boundingBox();
  const contentBox = await content.boundingBox();
  expect(sidebarBox).toBeTruthy();
  expect(contentBox).toBeTruthy();
  // contentBox!.y >= sidebarBox!.y + sidebarBox!.height - 1 (1px tolerance
  // for sub-pixel rounding)
  expect(contentBox!.y).toBeGreaterThanOrEqual(sidebarBox!.y + sidebarBox!.height - 1);

  // At wider width, the sidebar and content sit side by side.
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("layouts/app-shell");

  const sidebarWide = page.locator("figure").first().locator("aside").first();
  const contentWide = page.locator("figure").first().locator("aside + div").first();
  const sidebarWideBox = await sidebarWide.boundingBox();
  const contentWideBox = await contentWide.boundingBox();
  expect(sidebarWideBox).toBeTruthy();
  expect(contentWideBox).toBeTruthy();
  // Side by side: content starts to the right of the sidebar.
  expect(contentWideBox!.x).toBeGreaterThan(sidebarWideBox!.x + sidebarWideBox!.width - 1);
});

test("MasterDetail stacks below collapse width and splits above", async ({ page }) => {
  // Narrow: panels should stack.
  await page.setViewportSize({ width: 600, height: 800 });
  await page.goto("layouts/master-detail");

  // The demo renders a figure with two flex children (master and detail).
  const demo = page.locator("figure").first();
  const first = demo.locator("figure > div > div").first();
  const second = demo.locator("figure > div > div").nth(1);

  const firstBox = await first.boundingBox();
  const secondBox = await second.boundingBox();
  expect(firstBox).toBeTruthy();
  expect(secondBox).toBeTruthy();
  expect(secondBox!.y).toBeGreaterThanOrEqual(firstBox!.y + firstBox!.height - 1);

  // Wide: panels should sit side by side.
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("layouts/master-detail");

  const firstWide = page.locator("figure").first().locator("figure > div > div").first();
  const secondWide = page.locator("figure").first().locator("figure > div > div").nth(1);

  const firstWideBox = await firstWide.boundingBox();
  const secondWideBox = await secondWide.boundingBox();
  expect(firstWideBox).toBeTruthy();
  expect(secondWideBox).toBeTruthy();
  expect(secondWideBox!.x).toBeGreaterThan(firstWideBox!.x + firstWideBox!.width - 1);
});

test("Centered layout bounds content at a readable max-width", async ({ page }) => {
  // At ultrawide width, the centered content should not stretch to the full
  // viewport width.
  await page.setViewportSize({ width: 2560, height: 800 });
  await page.goto("layouts/centered");

  // The Centered layout wraps content in a max-width container with mx-auto.
  const contentArea = page.locator("figure").first().locator(".mx-auto").first();
  const contentBox = await contentArea.boundingBox();
  expect(contentBox).toBeTruthy();
  // max-w-lg = 32rem = 512px; the content should be far narrower than 2560px.
  expect(contentBox!.width).toBeLessThan(2000);
});

test("Reading layout bounds line length on ultrawide", async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 800 });
  await page.goto("layouts/reading");

  // Reading layout should cap content width at a readable measure.
  // The Center composition primitive uses max-w-prose.
  const content = page
    .locator("figure")
    .first()
    .locator(".max-w-prose, .max-w-lg, .max-w-xl, .max-w-2xl")
    .first();
  const contentBox = await content.boundingBox();
  expect(contentBox).toBeTruthy();
  // Prose max is ~65ch ≈ 720px; even 2xl is only 42rem = 672px.
  expect(contentBox!.width).toBeLessThan(1500);
});

test("SplitLayout stacks below collapse width and splits above", async ({ page }) => {
  // Narrow: panels stack.
  await page.setViewportSize({ width: 600, height: 800 });
  await page.goto("layouts/split-layout");

  const demo = page.locator("figure").first();
  const first = demo.locator("figure > div > div").first();
  const second = demo.locator("figure > div > div").nth(1);

  const firstBox = await first.boundingBox();
  const secondBox = await second.boundingBox();
  expect(firstBox).toBeTruthy();
  expect(secondBox).toBeTruthy();
  expect(secondBox!.y).toBeGreaterThanOrEqual(firstBox!.y + firstBox!.height - 1);

  // Wide: side by side.
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("layouts/split-layout");

  const firstWide = page.locator("figure").first().locator("figure > div > div").first();
  const secondWide = page.locator("figure").first().locator("figure > div > div").nth(1);

  const firstWideBox = await firstWide.boundingBox();
  const secondWideBox = await secondWide.boundingBox();
  expect(firstWideBox).toBeTruthy();
  expect(secondWideBox).toBeTruthy();
  expect(secondWideBox!.x).toBeGreaterThan(firstWideBox!.x + firstWideBox!.width - 1);
});
