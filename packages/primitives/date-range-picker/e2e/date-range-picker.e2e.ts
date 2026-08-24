import { test, expect, type Page } from "@playwright/test";

// The range field is six segments — both ends of the span in one entry
// surface. What typing must prove here is that the stream fills the START end
// and stops there: an eight-digit date may not bleed into the second half of
// the range, which stays exactly as the host left it until the reader walks
// into it. jsdom cannot follow a focus auto-advance across segments, so this
// is browser evidence.
//
// Held-key repeat is emulated with timed successive presses; see DatePicker's
// spec for why that is the honest form available.

/** Types the given digits with a repeat-like cadence. */
async function typeDigits(page: Page, digits: string) {
  await page.keyboard.type(digits, { delay: 90 });
}

test("typing fills the start of the range and leaves the end untouched", async ({ page }) => {
  await page.goto("/?component=date-range-picker");
  // The report window starts as 2026-03-01 → 2026-03-31.
  const segments = page.locator("#date-range-picker-demo-report + div [role='spinbutton']");
  await segments.first().click();

  // A full start date: 04/05/2026.
  await typeDigits(page, "04052026");

  // The start moved…
  await expect(segments.nth(0)).toHaveText("4");
  await expect(segments.nth(1)).toHaveText("5");
  await expect(segments.nth(2)).toHaveText("2026");
  // …and the end did not follow it: still March's 31st, digit for digit.
  await expect(segments.nth(3)).toHaveText("3");
  await expect(segments.nth(4)).toHaveText("31");
  await expect(segments.nth(5)).toHaveText("2026");

  // The demo prints the model: start crossed the boundary as ISO, end intact.
  const report = page.locator("p .tabular").last();
  await expect(report).toContainText("2026-04-05");
  await expect(report).toContainText("2026-03-31");
});
