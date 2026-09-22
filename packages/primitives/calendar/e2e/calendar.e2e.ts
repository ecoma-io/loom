import { expect, test, type Locator, type Page } from "@playwright/test";

// The calendar's keyboard contract is the wrapped Reka primitive's runtime
// behaviour: the day triggers are `role="button"` nodes on a roving tabindex
// (today's cell holds the stop), the arrows move real focus a day or a week at
// a time from the cell's own keydown, Enter toggles the choice, and the fence
// of `min`/`max` stops the walk at its boundary. jsdom runs none of the focus
// movement, which is why the unit tier could only assert the markup.
//
// The demo mounts three calendars. The first ("calendar-demo-chosen") is
// unbounded; the second ("calendar-demo-bounded") is fenced to a week behind
// and a week ahead of today, which is what the boundary test walks into.
//
// Days are named and keyed by the day itself, so expected values are computed
// from `new Date()` the same way the demo computes its fence — never pinned.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=calendar");
  await expect(page.getByRole("button", { name: "Previous month" }).first()).toBeVisible({
    timeout: 20_000,
  });
});

/** An ISO `YYYY-MM-DD` offset from today — the same shape Reka puts in `data-value`. */
function iso(daysFromToday: number): string {
  const day = new Date();
  day.setDate(day.getDate() + daysFromToday);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${String(day.getFullYear())}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

/** One demo box, scoped by the labelled heading only that box carries. */
function calendarBox(page: Page, labelledBy: string): Locator {
  return page.locator(`[aria-labelledby="${labelledBy}"]`);
}

/** The grid cell for one day, addressed the way the component keys it. */
function day(box: Locator, offsetFromToday: number): Locator {
  return box.locator(`[data-value="${iso(offsetFromToday)}"]`);
}

test("Tab seats today's cell, the arrows walk the grid, and Enter chooses and clears", async ({
  page,
}) => {
  const box = calendarBox(page, "calendar-demo-chosen");
  const today = day(box, 0);

  // The walk: Previous month, Next month, then the grid's own roving stop —
  // today's cell, because nothing is chosen and the placeholder is today.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Previous month" }).first()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Next month" }).first()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(today).toBeFocused();

  // The arrows move real focus: right one day, down one week. The moved-to
  // cell takes the roving stop with it.
  await page.keyboard.press("ArrowRight");
  await expect(day(box, 1)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(day(box, 8)).toBeFocused();

  // Enter chooses the focused day; the selection status line — hidden until
  // the first real selection — says so.
  await page.keyboard.press("Enter");
  await expect(day(box, 8)).toHaveAttribute("data-selected", "true");
  const status = box.locator('[role="status"]');
  await expect(status).not.toHaveAttribute("aria-hidden");
  await expect(status).toContainText("chosen.");

  // The choice toggles: Enter on the chosen day clears it again.
  await page.keyboard.press("Enter");
  await expect(day(box, 8)).not.toHaveAttribute("data-selected");
  await expect(status).toHaveText("No date chosen.");
});

test("the min/max fence stops the arrow walk at its boundary", async ({ page }) => {
  const box = calendarBox(page, "calendar-demo-bounded");
  const fenceEdge = day(box, -7);

  // Seat the walk on today, inside the fence, and arrow left to its edge —
  // seven presses, one per day the fence spans.
  await day(box, 0).focus();
  for (let step = 0; step < 7; step++) await page.keyboard.press("ArrowLeft");
  await expect(fenceEdge).toBeFocused();

  // One more press asks for the day past the edge: the fence holds, the walk
  // stops on the boundary day rather than paging into a struck-through month.
  await page.keyboard.press("ArrowLeft");
  await expect(fenceEdge).toBeFocused();
});
