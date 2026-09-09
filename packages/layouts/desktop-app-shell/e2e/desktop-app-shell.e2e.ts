import { expect, test, type Locator, type Page } from "@playwright/test";

// DesktopAppShell's browser-only fact is the media-query collapse: the
// sidebar rail and the content row switch from side-by-side to stacked at
// Tailwind's `md` — a viewport media query, the one mechanism content alone
// cannot witness. The row does not flex-wrap, so unlike the intrinsic layouts
// the rail's width at the mid band is a settled fact, not ecoma-io/loom#275's
// open question, and this spec pins it.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=desktop-app-shell");
  await expect(page.getByText("Welcome to MyApp")).toBeVisible();
});

/** The shell's sidebar — a `<complementary>` landmark named by the demo. */
function rail(page: Page): Locator {
  return page.getByRole("complementary", { name: "Primary navigation" });
}

/** The shell's content area. */
function content(page: Page): Locator {
  return page.getByRole("main");
}

/** The panel's rendered box, or a hard failure. */
async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("expected the shell panel to be rendered and visible");
  return box;
}

test("the rail stacks above the content below md and sits beside it past it", async ({ page }) => {
  // Narrow band: below `md` the row is a column — the rail takes its own
  // line above the content.
  await page.setViewportSize({ width: 360, height: 900 });
  const railBox = await boxOf(rail(page));
  const contentBox = await boxOf(content(page));
  expect(railBox.y + railBox.height).toBeLessThanOrEqual(contentBox.y + 1);

  // Mid band: past `md`, side by side with the rail on the left.
  await page.setViewportSize({ width: 800, height: 900 });
  const railWideBox = await boxOf(rail(page));
  const contentWideBox = await boxOf(content(page));
  expect(contentWideBox.x).toBeGreaterThanOrEqual(railWideBox.x + railWideBox.width - 1);
});

test('the sidebar-width="md" rail is 16rem wide once the row has direction', async ({ page }) => {
  // flex-basis 16rem with md:shrink-0 md:grow-0 — nothing left to negotiate,
  // so the rail's width is the declared one.
  await page.setViewportSize({ width: 800, height: 900 });
  const railBox = await boxOf(rail(page));
  expect(Math.abs(railBox.width - 256)).toBeLessThanOrEqual(1);
});
