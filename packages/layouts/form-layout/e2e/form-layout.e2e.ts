import { expect, test, type Locator, type Page } from "@playwright/test";

// FormLayout's browser-only fact is the bound: the form column's cap is a
// CSS max-width, so it holds no matter how wide the viewport gets — jsdom can
// pin the class (FormLayout.test.ts) but a real layout is what proves the cap
// resolves and that the named steps are distinct widths at one band. The
// band-scale half of the claim (the stepped gutters) is witnessed by the root
// sweep, which walks every layout at the canonical bands.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=form-layout");
  await expect(page.getByText("Create account").first()).toBeVisible();
});

/** The demo renders the sm/md/lg steps in DOM order; each cap is its own
 *  Tailwind class on the centred column. */
function column(page: Page, cap: "sm" | "md" | "lg"): Locator {
  return page.locator(`.max-w-${cap}`);
}

/** The panel's rendered box, or a hard failure. */
async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("expected the form column to be rendered and visible");
  return box;
}

test("the cap holds at the ultrawide band and the steps are distinct widths there", async ({
  page,
}) => {
  await page.setViewportSize({ width: 2000, height: 900 });
  const md = await boxOf(column(page, "md"));
  // max-w-md is 28rem — the cap, not the viewport, is the binding constraint.
  expect(Math.abs(md.width - 448)).toBeLessThanOrEqual(1);
  // mx-auto: what is left of the cap splits evenly into two rails.
  const mdRoot = await boxOf(column(page, "md").locator(".."));
  const leftRail = md.x - mdRoot.x;
  const rightRail = mdRoot.x + mdRoot.width - (md.x + md.width);
  expect(Math.abs(leftRail - rightRail)).toBeLessThanOrEqual(2);

  // The named steps are not one width with three names: lg caps wider than md.
  const lg = await boxOf(column(page, "lg"));
  expect(lg.width).toBeGreaterThan(md.width);
});

test("below the cap the column fills the layout instead of centring", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  const md = await boxOf(column(page, "md"));
  const mdRoot = await boxOf(column(page, "md").locator(".."));
  // The 448px cap cannot bind a 360px viewport: the column spans the root
  // flush, gutter to gutter, and stays under the cap it never reaches.
  expect(md.width).toBeLessThanOrEqual(448);
  expect(Math.abs(md.x - mdRoot.x)).toBeLessThanOrEqual(1);
});
