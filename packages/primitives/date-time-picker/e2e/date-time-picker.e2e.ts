import { test, expect, type Page } from "@playwright/test";

// The DateTimePicker's segment stream crosses two clocks in one field: date
// digits flow into hour and minute segments without a single arrow press, and
// an untouched time survives a date-only edit — the "pick the day and keep the
// time" promise the demo copy makes. Both are keyboard facts on real focused
// `role="spinbutton"` segments, invisible to jsdom.
//
// A held key's repeat cannot be synthesized through Playwright's keyboard in
// any engine; timed successive presses (`delay`) reproduce the same event
// shape — rapid digit bursts with auto-advance landing focus elsewhere
// mid-stream (see DatePicker's spec for the fuller argument).

/** Types the given digits with a repeat-like cadence. */
async function typeDigits(page: Page, digits: string) {
  await page.keyboard.type(digits, { delay: 90 });
}

test("typing flows from the date segments into the time segments, keeping the untouched time", async ({
  page,
}) => {
  await page.goto("/?component=date-time-picker");
  // The scheduled-send field starts at 2026-03-14T09:30 on a 12-hour clock.
  const segments = page.locator("#date-time-picker-demo-send + div [role='spinbutton']");
  await segments.first().click();

  // Eight digits fill month, day and year; focus advances past the year into
  // Hour on its own — the field is one continuous entry surface.
  await typeDigits(page, "09152026");
  await expect(segments.nth(0)).toHaveText("9");
  await expect(segments.nth(1)).toHaveText("15");
  await expect(segments.nth(2)).toHaveText("2026");

  // The time was never touched: it must survive the date edit exactly.
  const model = page.locator("p .tabular").first();
  await expect(model).toHaveText("2026-09-15T09:30");

  // Focus is already on the hour segment — typing continues the same stream.
  // 9 then 30 fills hour and minute on the 12-hour clock; AM stands as it was,
  // so the committed instant is nine-thirty in the morning.
  await page.keyboard.press("9", { delay: 90 });
  await page.keyboard.press("3", { delay: 90 });
  await page.keyboard.press("0", { delay: 90 });
  await expect(segments.nth(3)).toHaveText("9");
  await expect(segments.nth(4)).toHaveText("30");
  await expect(segments.nth(5)).toHaveText("AM");
  await expect(model).toHaveText("2026-09-15T09:30");
});
