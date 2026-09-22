import { expect, test, type Locator, type Page } from "@playwright/test";

// The range field's keyboard contract has three halves, and all of them live
// outside jsdom: the whole field is one Tab stop whose segments the arrow keys
// walk — across the date half, into the clock half, and across the dash into
// the end half; typing fills a segment and carries focus to the next one; and
// the calendar button opens the panel onto the day cells, where the arrows move
// and Enter lays the range down in two presses.
//
// The demo's second instance ("date-time-range-picker-demo-query") is the one
// under spec: nothing chosen yet, so every segment shows its placeholder. The
// demo mounts an instance ahead of it, so the tests seat the field with
// `.focus()` rather than a page-top Tab, and the one-stop claim is witnessed
// by Tab *leaving* the field for its own trigger.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=date-time-range-picker");
  await expect(page.getByRole("button", { name: "Open calendar" }).first()).toBeVisible({
    timeout: 20_000,
  });
});

/** The demo's unset instance, scoped by its labelled heading. */
function queryField(page: Page): Locator {
  return page.locator('[aria-labelledby="date-time-range-picker-demo-query"]');
}

/** The start half's group and the segments inside it. */
function startSegments(page: Page): Locator {
  return queryField(page)
    .getByRole("group", { name: "Start date and time" })
    .getByRole("spinbutton");
}

/** The end half's segments. */
function endSegments(page: Page): Locator {
  return queryField(page).getByRole("group", { name: "End date and time" }).getByRole("spinbutton");
}

/** The open panel's grid cells — Reka portals the panel to the body. */
function panelDays(page: Page): Locator {
  return page.locator("[data-reka-calendar-cell-trigger]");
}

test("the field is one Tab stop and the arrows walk segment to segment across both halves", async ({
  page,
}) => {
  const month = startSegments(page).nth(0);
  const trigger = queryField(page).getByRole("button", { name: "Open calendar" });

  // The walk: every segment of the start half, then across the dash into the
  // end half. The demo's locale is the default, so the date half reads month,
  // day, year and the clock half reads hour, minute, AM/PM — six segments per
  // half, literals skipped.
  await month.focus();
  await expect(month).toBeFocused();
  for (let segment = 1; segment < 6; segment++) {
    await page.keyboard.press("ArrowRight");
    await expect(startSegments(page).nth(segment)).toBeFocused();
  }
  await page.keyboard.press("ArrowRight");
  await expect(endSegments(page).nth(0)).toBeFocused(); // end month

  // And back: the walk is not a one-way valve.
  await page.keyboard.press("ArrowLeft");
  await expect(startSegments(page).nth(5)).toBeFocused();

  // The field is one composite: every other segment is off the tab order, so
  // the only Tab from inside the walk leaves the field for its own trigger.
  await page.keyboard.press("Tab");
  await expect(trigger).toBeFocused();
  // And the composite keeps one stop: Shift+Tab back in seats the segment that
  // held the walk.
  await page.keyboard.press("Shift+Tab");
  await expect(startSegments(page).nth(5)).toBeFocused();
});

test("typing fills a segment and hands focus to the next one", async ({ page }) => {
  const month = startSegments(page).nth(0);
  const day = startSegments(page).nth(1);
  const year = startSegments(page).nth(2);

  await month.focus();
  await expect(month).toBeFocused();

  // A two-digit month fills and advances; the day takes two digits; the year
  // takes four and advances into the clock half when its last digit lands.
  await page.keyboard.type("03");
  await expect(day).toBeFocused();
  await page.keyboard.type("16");
  await expect(year).toBeFocused();
  await page.keyboard.type("2026");
  await expect(startSegments(page).nth(3)).toBeFocused(); // start hour

  // What was typed is what the segments hold.
  await expect(month).toHaveAttribute("aria-valuenow", "3");
  await expect(day).toHaveAttribute("aria-valuenow", "16");
  await expect(year).toHaveAttribute("aria-valuenow", "2026");
});

test("the calendar button opens the panel onto the day grid, Enter lays the range down, and Escape closes back onto the button", async ({
  page,
}) => {
  const trigger = queryField(page).getByRole("button", { name: "Open calendar" });
  await trigger.focus();
  await page.keyboard.press("Enter");

  // Opening routes focus into the grid — Loom's own open-auto-focus seats the
  // day the calendar is already sitting on rather than a pager button.
  await expect(panelDays(page).first()).toBeVisible();
  const seated = page.locator('[data-reka-calendar-cell-trigger][tabindex="0"]');
  await expect(seated).toBeFocused();

  // The two-click protocol, pressed not clicked: the first Enter begins the
  // span, the arrows move a day at a time, the second closes it.
  await page.keyboard.press("Enter");
  const status = page.locator('[role="status"]', { hasText: /Choose the last day/ });
  await expect(status).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.locator('[role="status"]', { hasText: / to / })).toBeVisible();

  // Escape is the exit, and it hands focus back to the button that opened it.
  await page.keyboard.press("Escape");
  await expect(panelDays(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
