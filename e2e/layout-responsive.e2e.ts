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

// The narrow viewport must be below the intrinsic collapse width of every
// layout variant. The collapse happens when the content panel (min-width: 50%)
// can no longer fit alongside the side panel. For a side panel with
// flex-shrink: 0 and a basis of N rem, the flex container wraps when its width
// falls below 2 × N (the side panel won't shrink, so the 50% content minimum
// can't be satisfied). At 320px viewport, after VitePress page margins and the
// Demo figure's border + padding, the figure inner width is roughly 220px —
// well below the collapse thresholds for all sidebar sizes.
const NARROW = 320;

// Layout panels carry distinctive inline styles set by the component. The
// flex-wrap container that holds both panels uses an inline `flex-wrap:wrap`
// (the Demo wrapper uses a Tailwind class, not an inline style). Each layout
// component's first child has `flex-grow:0` and the second `flex-grow:999`.
// Vue SSR renders style properties without spaces (e.g. `flex-grow:0`), so
// selectors must match that format.
const FLEX_WRAP = '[style*="flex-wrap:wrap"]';

test("AppShell sidebar stacks below collapse width and splits above", async ({ page }) => {
  // At narrow width, the sidebar and content should stack (both full-width).
  await page.setViewportSize({ width: NARROW, height: 800 });
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
  await page.setViewportSize({ width: NARROW, height: 800 });
  await page.goto("layouts/master-detail");

  // The layout's flex container carries an inline `flex-wrap:wrap` style.
  // Its two direct children are the master and detail panels.
  const demo = page.locator("figure").first();
  const layout = demo.locator(FLEX_WRAP).first();
  const master = layout.locator("> div").first();
  const detail = layout.locator("> div").nth(1);

  const masterBox = await master.boundingBox();
  const detailBox = await detail.boundingBox();
  expect(masterBox).toBeTruthy();
  expect(detailBox).toBeTruthy();
  expect(detailBox!.y).toBeGreaterThanOrEqual(masterBox!.y + masterBox!.height - 1);

  // Wide: panels should sit side by side.
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("layouts/master-detail");

  const layoutWide = page.locator("figure").first().locator(FLEX_WRAP).first();
  const masterWide = layoutWide.locator("> div").first();
  const detailWide = layoutWide.locator("> div").nth(1);

  const masterWideBox = await masterWide.boundingBox();
  const detailWideBox = await detailWide.boundingBox();
  expect(masterWideBox).toBeTruthy();
  expect(detailWideBox).toBeTruthy();
  expect(detailWideBox!.x).toBeGreaterThan(masterWideBox!.x + masterWideBox!.width - 1);
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
  await page.setViewportSize({ width: NARROW, height: 800 });
  await page.goto("layouts/split-layout");

  const demo = page.locator("figure").first();
  const layout = demo.locator(FLEX_WRAP).first();
  const side = layout.locator("> div").first();
  const main = layout.locator("> div").nth(1);

  const sideBox = await side.boundingBox();
  const mainBox = await main.boundingBox();
  expect(sideBox).toBeTruthy();
  expect(mainBox).toBeTruthy();
  expect(mainBox!.y).toBeGreaterThanOrEqual(sideBox!.y + sideBox!.height - 1);

  // The demo's second instance is `side="right"`: its stack must read
  // content above, panel below — never the reverse (ecoma-io/loom#158).
  const rowRight = demo.locator(FLEX_WRAP).nth(1);
  const sideRight = rowRight.locator("> div").nth(1);
  const mainRight = rowRight.locator("> div").first();
  const sideRightBox = await sideRight.boundingBox();
  const mainRightBox = await mainRight.boundingBox();
  expect(sideRightBox).toBeTruthy();
  expect(mainRightBox).toBeTruthy();
  expect(mainRightBox!.y + mainRightBox!.height).toBeLessThanOrEqual(sideRightBox!.y + 1);

  // Wide: side by side.
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("layouts/split-layout");

  const layoutWide = page.locator("figure").first().locator(FLEX_WRAP).first();
  const sideWide = layoutWide.locator("> div").first();
  const mainWide = layoutWide.locator("> div").nth(1);

  const sideWideBox = await sideWide.boundingBox();
  const mainWideBox = await mainWide.boundingBox();
  expect(sideWideBox).toBeTruthy();
  expect(mainWideBox).toBeTruthy();
  expect(mainWideBox!.x).toBeGreaterThan(sideWideBox!.x + sideWideBox!.width - 1);

  // Wide right instance: the panel stays on the right of the content.
  const rowRightWide = page.locator("figure").first().locator(FLEX_WRAP).nth(1);
  const sideRightWide = rowRightWide.locator("> div").nth(1);
  const mainRightWide = rowRightWide.locator("> div").first();
  const sideRightWideBox = await sideRightWide.boundingBox();
  const mainRightWideBox = await mainRightWide.boundingBox();
  expect(sideRightWideBox).toBeTruthy();
  expect(mainRightWideBox).toBeTruthy();
  expect(sideRightWideBox!.x).toBeGreaterThan(mainRightWideBox!.x + mainRightWideBox!.width - 1);
});
