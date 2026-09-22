import { expect, test, type Locator, type Page } from "@playwright/test";

// The time field's keyboard contract is the wrapped Reka TimeField's runtime
// behaviour on top of Loom's own roving stop: the whole field is one Tab stop
// seated on the hour, the arrows walk segment to segment (left and right both
// directions, literals skipped), ArrowUp and ArrowDown step the focused
// segment's value, and typing fills a segment and carries focus to the next
// one — with the hour announcement rebuilt from what the segment actually
// shows under an explicit 12-hour cycle. jsdom runs none of it, which is why
// the unit tier could only assert the markup.
//
// The demo's first instance ("time-picker-demo-standup") is a twelve-hour
// field bound to 09:30, with the model echoed on the page in 24-hour form —
// which is what makes the typed AM/PM switch observable.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=time-picker");
  await expect(hour(page)).toBeVisible({ timeout: 20_000 });
});

/** The stand-up field's segments, in display order. */
function segment(page: Page, part: "Hour" | "Minute" | "AM or PM"): Locator {
  return page.locator('[aria-labelledby="time-picker-demo-standup"]').getByRole("spinbutton", {
    name: part,
  });
}

function hour(page: Page): Locator {
  return segment(page, "Hour");
}

/** The demo's echo of the model — always 24-hour. */
function model(page: Page): Locator {
  return page.locator("p").filter({ hasText: "v-model:" }).locator("span.tabular");
}

test("the field is one Tab stop and the arrows walk and step it", async ({ page }) => {
  // Seated straight onto the hour: the roving stop starts at the first
  // editable segment.
  await page.keyboard.press("Tab");
  await expect(hour(page)).toBeFocused();

  // Right walks into the minute, then the period; left walks all the way back
  // to the hour.
  await page.keyboard.press("ArrowRight");
  await expect(segment(page, "Minute")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(segment(page, "AM or PM")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(segment(page, "Minute")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(hour(page)).toBeFocused();

  // Up steps the focused segment's value: 09:30 + one hour is 10:30 on the
  // model.
  await page.keyboard.press("ArrowUp");
  await expect(model(page)).toHaveText("10:30");
  await expect(hour(page)).toBeFocused();
});

test("typing fills a segment, advances, and the period key flips the half", async ({ page }) => {
  await page.keyboard.press("Tab");
  await expect(hour(page)).toBeFocused();

  // "3" fills the hour and advances; "05" fills the minute and advances onto
  // the period; "p" flips it to PM — so 03:05 PM is 15:05 on the 24-hour model.
  await page.keyboard.type("3");
  await expect(segment(page, "Minute")).toBeFocused();
  await page.keyboard.type("05");
  await expect(segment(page, "AM or PM")).toBeFocused();
  await page.keyboard.type("p");
  await expect(model(page)).toHaveText("15:05");
});
