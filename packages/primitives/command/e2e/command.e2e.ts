import { expect, test, type Locator, type Page } from "@playwright/test";

// Command's keyboard contract is Loom's own DOM handlers, not a wrapped Reka
// primitive — but the aria-activedescendant model is exactly the part jsdom
// cannot witness: the highlight moves as a selected option inside a list the
// input points at, focus never leaving the searchbox, and the browser is what
// keeps those two facts true at once (a synthetic focus event in jsdom proves
// nothing about where a real engine parks focus while an arrow moves the
// highlight). Escape's two-stage contract — clear the query first, close the
// list only when it is already empty — and the closed control's reopen-on-any-
// interaction are the source's own rules; here they are pressed with real keys.
//
// The demo is one grouped palette of nine commands with a "Selected:" readout.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=command");
  await expect(searchbox(page)).toBeVisible();
});

/** The palette's search input — the only searchbox on the harness page. */
function searchbox(page: Page): Locator {
  return page.getByRole("searchbox");
}

/** The listbox; present only while the palette is open. */
function listbox(page: Page): Locator {
  return page.getByRole("listbox");
}

/** The currently highlighted option — the one the input's activedescendant names. */
function highlighted(page: Page): Locator {
  return page.getByRole("option").and(page.locator('[aria-selected="true"]'));
}

/** The demo's readout line, keyed by the selected value it shows. */
function readout(page: Page, value: string): Locator {
  return page.locator("p", { hasText: "Selected:" }).filter({ hasText: value });
}

test("Tab seats the searchbox, and the arrows move the highlight while focus stays in the input", async ({
  page,
}) => {
  await page.keyboard.press("Tab");
  await expect(searchbox(page)).toBeFocused();
  await expect(highlighted(page)).toHaveAccessibleName(/Open settings/);

  const firstId = await searchbox(page).getAttribute("aria-activedescendant");
  expect(firstId).toBeTruthy();

  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(highlighted(page)).toHaveAccessibleName(/Edit profile/);
  await expect(searchbox(page)).toBeFocused();

  // The activedescendant now names a different option than at the seat.
  const movedId = await searchbox(page).getAttribute("aria-activedescendant");
  expect(movedId).not.toBe(firstId);

  await page.keyboard.press("ArrowUp");
  await expect(highlighted(page)).toHaveAccessibleName(/Go to docs/);

  // Home and End take the poles of the whole flat list, groups included.
  await page.keyboard.press("End");
  await expect(highlighted(page)).toHaveAccessibleName(/Help/);
  await page.keyboard.press("Home");
  await expect(highlighted(page)).toHaveAccessibleName(/Open settings/);
});

test("the walk wraps at both poles, and Enter runs the highlighted command", async ({ page }) => {
  await searchbox(page).focus();
  await page.keyboard.press("End");
  await expect(highlighted(page)).toHaveAccessibleName(/Help/);

  await page.keyboard.press("ArrowDown");
  await expect(highlighted(page)).toHaveAccessibleName(/Open settings/);

  await page.keyboard.press("Enter");
  await expect(readout(page, "settings")).toBeVisible();
  await expect(searchbox(page)).toBeFocused();
});

test("typing filters the list, resets the highlight to the first match, and the live region counts the survivors", async ({
  page,
}) => {
  await searchbox(page).focus();
  await page.keyboard.press("End");
  await expect(highlighted(page)).toHaveAccessibleName(/Help/);

  await page.keyboard.type("inv");
  const options = listbox(page).getByRole("option");
  await expect(options).toHaveCount(1);
  await expect(options).toHaveAccessibleName(/Invite team member/);
  await expect(highlighted(page)).toHaveAccessibleName(/Invite team member/);
  await expect(page.getByRole("status")).toHaveText("1 result available");

  await page.keyboard.press("Enter");
  await expect(readout(page, "team")).toBeVisible();
});

test("Escape first clears the query, then closes the list, and the closed control reopens on the next gesture", async ({
  page,
}) => {
  await searchbox(page).focus();
  await page.keyboard.type("doc");
  await expect(listbox(page).getByRole("option")).toHaveCount(1);

  // Query non-empty: Escape clears the filter instead of closing.
  await page.keyboard.press("Escape");
  await expect(searchbox(page)).toHaveValue("");
  await expect(listbox(page).getByRole("option")).toHaveCount(9);

  // Query empty: Escape closes the list, and focus stays with the input.
  await page.keyboard.press("Escape");
  await expect(listbox(page)).toHaveCount(0);
  await expect(searchbox(page)).toBeFocused();

  // Any key but Escape and Tab brings the list back — a closed Command is a
  // resting state, not a dead end.
  await page.keyboard.press("ArrowDown");
  await expect(listbox(page)).toBeVisible();
  await expect(highlighted(page)).toHaveAccessibleName(/Go to docs/);
});
