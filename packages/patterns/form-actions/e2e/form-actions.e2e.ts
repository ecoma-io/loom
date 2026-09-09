import { expect, test, type Locator, type Page } from "@playwright/test";

// FormActions' browser-only facts are the two the wrap decision (#276, landed
// by #278) bought: the action row wraps rather than scrolls or shrinks — the
// one overflow the interface contract names outright — and the gap tightens
// on the phone band, the band where the row actually wraps (`gap-2
// sm:gap-3`). jsdom can pin the classes; only a real layout can say which
// line an action lands on.
//
// The demo's own actions ("Cancel", "Save changes") are too short to overflow
// any viewport, so no demo instance can show the wrap on its own — and the
// demo is another change's file. The wrap test slots two long-labelled
// actions into the row at runtime, which is exactly what a host with a wide
// cancel slot does; what it witnesses is still this pattern's classes
// resolving in a real engine, and it fails if `flex-wrap` or the gap band
// ever leaves the row.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=form-actions");
  await expect(page.getByText("Between (default)")).toBeVisible();
});

/** The demo's first row — the default "between" instance. */
function row(page: Page): Locator {
  return page.locator("div.flex-wrap").first();
}

/** The rendered box, or a hard failure. */
async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("expected the action row to be rendered and visible");
  return box;
}

test("the actions share one line while they fit", async ({ page }) => {
  // Narrow band: the demo's two actions fit a phone-width card, so the row
  // has no reason to wrap — and must not.
  await page.setViewportSize({ width: 360, height: 900 });
  const cancel = await boxOf(page.getByRole("button", { name: "Cancel" }));
  const save = await boxOf(page.getByRole("button", { name: "Save changes" }));
  expect(Math.abs(save.y - cancel.y)).toBeLessThanOrEqual(2);
});

test("the row wraps when the actions cannot share a line, and the gap follows the band", async ({
  page,
}) => {
  const actions = row(page);

  // Narrow band: two long-labelled actions overflow the card, so the second
  // takes its own line — with the row's tightened `gap-2` between the lines.
  await page.setViewportSize({ width: 360, height: 900 });
  await actions.evaluate((el) => {
    el.innerHTML =
      '<button type="button">Save and publish the drafted release notes</button>' +
      '<button type="button">Discard the draft and leave without saving</button>';
  });
  const first = await boxOf(actions.locator("button").first());
  const second = await boxOf(actions.locator("button").nth(1));
  expect(second.y).toBeGreaterThanOrEqual(first.y + first.height - 1);
  const wrappedGap = second.y - (first.y + first.height);
  expect(Math.abs(wrappedGap - 8)).toBeLessThanOrEqual(1);

  // Mid band: past `sm` the same actions share the line, `sm:gap-3` apart.
  await page.setViewportSize({ width: 800, height: 900 });
  const wideFirst = await boxOf(actions.locator("button").first());
  const wideSecond = await boxOf(actions.locator("button").nth(1));
  expect(Math.abs(wideSecond.y - wideFirst.y)).toBeLessThanOrEqual(2);
  const inlineGap = wideSecond.x - (wideFirst.x + wideFirst.width);
  expect(Math.abs(inlineGap - 12)).toBeLessThanOrEqual(1);
});
