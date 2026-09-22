import { expect, test, type Locator, type Page } from "@playwright/test";

// RowActions' browser-only fact is the reveal it exists to guarantee: the
// group rides `group-focus-within`, so Tabbing INTO a row brings its actions
// up and Tabbing out parks them again. The unit tier pins that the classes
// are present and that nothing unmounts; only a real engine can witness the
// computed opacity actually turning while a keyboard walk crosses the row —
// which is the accessibility bar the pattern was written for, a control that
// is reachable while invisible and visible before it must be used.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=row-actions");
  await expect(page.getByRole("button", { name: /^View / }).first()).toBeVisible();
});

/** One demo row — the `group` element the reveal is scoped to. */
function row(page: Page, index: number): Locator {
  return page.locator("li.group").nth(index);
}

/** A row's action group: the pattern's own div, parent of the action buttons it hosts. */
function groupOf(rowLocator: Locator): Locator {
  return rowLocator.getByRole("button", { name: /^View / }).locator("..");
}

/**
 * The settled reveal state — opacity plus the slide's parked offset — polled
 * rather than read once, because the fade and slide animate and the
 * postcondition is the end of that transition, not a frame inside it.
 */
function revealOf(group: Locator): () => Promise<{ opacity: string; x: number }> {
  return () =>
    group.evaluate((el) => {
      const style = getComputedStyle(el);
      return { opacity: style.opacity, x: Number.parseFloat(style.translate) || 0 };
    });
}

const PARKED = { opacity: "0", x: 4 };
const REVEALED = { opacity: "1", x: 0 };

test("Tab into a row brings its actions up, and the reveal follows focus across rows", async ({
  page,
}) => {
  const first = row(page, 0);
  const firstGroup = groupOf(first);

  // At rest the group is quiet — parked at its 4px slide and fully faded.
  await expect.poll(revealOf(firstGroup)).toEqual(PARKED);

  // The demo's first tab stop is the row's first action, so the seat is
  // witnessed rather than scripted: reaching a button inside a group that
  // must then come up is the exact order the contract is written in.
  await page.keyboard.press("Tab");
  await expect(
    first.getByRole("button", { name: "View Daily video digest builder" }),
  ).toBeFocused();
  await expect.poll(revealOf(firstGroup)).toEqual(REVEALED);

  // The walk continues through the group's own actions while focus holds it
  // open, then onto the row's trailing control OUTSIDE the group — where the
  // reveal holds too, because the scope is the row, not the action div.
  await page.keyboard.press("Tab");
  await expect(first.getByRole("button", { name: /^Edit / })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(first.getByRole("button", { name: /^Delete / })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(first.getByRole("button", { name: "Run" })).toBeFocused();
  await expect.poll(revealOf(firstGroup)).toEqual(REVEALED);

  // Leaving the row hands the reveal to the next one: the first group parks
  // as the second comes up for its own first action.
  await page.keyboard.press("Tab");
  await expect(row(page, 1).getByRole("button", { name: /^View / })).toBeFocused();
  await expect.poll(revealOf(firstGroup)).toEqual(PARKED);
  await expect.poll(revealOf(groupOf(row(page, 1)))).toEqual(REVEALED);
});

test("the walk leaves the last row to the page beyond it, and the reveal is never a latch", async ({
  page,
}) => {
  // Seated by script one stop before the page's end: the gesture under test
  // is the handoff out of the demo, not the walk to it.
  const last = row(page, 2);
  const lastGroup = last.getByRole("button", { name: /^Delete / }).locator("..");
  await last.getByRole("button", { name: /^Delete / }).focus();
  await expect.poll(revealOf(lastGroup)).toEqual(REVEALED);

  await page.keyboard.press("Tab");
  await expect(last.getByRole("button", { name: "Run" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#harness-sentinel")).toBeFocused();

  // Focus has left the row, so its actions park again — reaching the page
  // beyond the demo does not strand the row lit.
  await expect.poll(revealOf(lastGroup)).toEqual(PARKED);
});
