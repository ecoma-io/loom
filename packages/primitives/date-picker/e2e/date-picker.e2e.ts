import { test, expect, type Page } from "@playwright/test";

// Segment typing is the DatePicker's browser-only fact. Each segment is a
// `div[role="spinbutton"][contenteditable]` whose digit handling — buffering
// two-digit entry, advancing when the next digit cannot fit, carrying focus
// across segments — runs against real key events on a real focused element.
// jsdom mounts the markup but answers none of that.
//
// A held key's own repeat cadence cannot be synthesized through Playwright's
// keyboard in any engine, so the stream below is timed successive presses
// (`delay` between keys), which is the same event shape a segment handler has
// to survive: rapid digit bursts into one editable node, with the auto-advance
// landing focus elsewhere mid-stream. What is pinned is how the handler copes
// with that stream, not the OS timer that produced it.

/** Types the given digits with a repeat-like cadence. */
async function typeDigits(page: Page, digits: string) {
  await page.keyboard.type(digits, { delay: 90 });
}

test("typing a full date fills each segment in turn and commits the ISO string", async ({
  page,
}) => {
  await page.goto("/?component=date-picker");
  // Attribute-scoped sibling selector: the caller's aria-labelledby never
  // reaches this group (see the naming test below), so it cannot be used to
  // find it.
  const segments = page.locator("#date-picker-demo-due + div [role='spinbutton']");
  await segments.first().click();

  // 0926 2026: two digits fill the month and advance, two fill the day, four
  // the year — seven keystrokes crossing all three segments without a single
  // arrow press.
  await typeDigits(page, "09262026");

  await expect(segments.nth(0)).toHaveAttribute("aria-valuetext", "9 - September");
  await expect(segments.nth(1)).toHaveAttribute("aria-valuetext", "26");
  await expect(segments.nth(2)).toHaveText("2026");
  // The demo prints what crossed the v-model boundary: an ISO string, not a
  // date object.
  await expect(page.locator("p .tabular")).toHaveText("2026-09-26");
});

test("segment order follows the locale: day-first typing lands day-first", async ({ page }) => {
  await page.goto("/?component=date-picker");

  // The Vietnamese field writes DD/MM/YYYY, its first segment is the day, and
  // the same eight digits therefore land in a different order than they would
  // in `en`.
  const vietnamese = page.locator('[role="group"][aria-label="Shipped on, Vietnamese"]');
  const segments = vietnamese.locator("[role='spinbutton']");
  await segments.first().click();
  await typeDigits(page, "18122027");

  await expect(segments.nth(0)).toHaveText("18");
  await expect(segments.nth(1)).toHaveText("12");
  await expect(segments.nth(2)).toHaveText("2027");

  // All locale pickers share one model in the demo: the British field beside
  // it — also day-first — shows the same new date, proving the typed value
  // propagated rather than staying local paint.
  const british = page.locator("#date-picker-demo-locale + div [role='spinbutton']");
  await expect(british.nth(0)).toHaveText("18");
  await expect(british.nth(1)).toHaveText("12");
  await expect(british.nth(2)).toHaveText("2027");
});

test("the segmented field carries an accessible name for the reader", async ({ page }) => {
  await page.goto("/?component=date-picker");

  // Correct behaviour per the component's own contract: a caller passing
  // `aria-labelledby` names the group with it (the docblock promises exactly
  // this, and the whole documentation page is written that way).
  const due = page.locator('[aria-labelledby="date-picker-demo-due"]');
  await expect(due).toHaveCount(1);
  await expect(due).toBeVisible();
});
