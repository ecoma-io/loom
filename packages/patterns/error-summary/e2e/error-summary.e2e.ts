import { expect, test, type Locator, type Page } from "@playwright/test";

// ErrorSummary's browser-only facts are the two halves of the pattern's own
// contract: focus MOVES to the summary on a failed submit, and Enter on an
// entry link lands focus on the invalid field. The unit tier pins the
// attribute plumbing, but focus is a browser act — jsdom never walks a Tab
// chain and never rides an anchor's native Enter activation into the click
// handler, which is the path a keyboard user's report actually travels.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=error-summary");
  await expect(page.getByRole("button", { name: "Submit" })).toBeVisible();
});

/**
 * The summary box — the demo's only div that takes focus via tabindex="-1",
 * so the locator names the component's own contract rather than a class.
 */
function summary(page: Page): Locator {
  return page.locator("div[tabindex='-1']");
}

test("a failed submit moves focus to the summary, and Tab walks on into its entry links", async ({
  page,
}) => {
  // The failure is keyboard-driven end to end: the demo's first tab stop is
  // the submit button, and Enter on it is a real form submission — the
  // gesture a keyboard user actually makes, not a script poking props.
  await page.keyboard.press("Tab");
  const submit = page.getByRole("button", { name: "Submit" });
  await expect(submit).toBeFocused();
  await page.keyboard.press("Enter");

  // The pattern's postcondition: focus sits ON the summary, and the heading
  // above the entries states the failure count that was announced.
  const box = summary(page);
  await expect(box).toBeFocused();
  await expect(box.getByRole("heading")).toHaveText("There is a problem (1 error)");

  // A focused container hands the walk to its own entries: the link is the
  // next stop, and it names the field before it says what is wrong with it.
  await page.keyboard.press("Tab");
  await expect(
    box.getByRole("link", {
      name: "Email: Enter an email address in the standard format, like name@example.com.",
    }),
  ).toBeFocused();
});

test("Enter on an entry returns focus to the invalid field, and the walk continues from it", async ({
  page,
}) => {
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  const box = summary(page);
  await expect(box).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(box.getByRole("link")).toBeFocused();

  // Enter rides the anchor's native activation into the handler that focuses
  // the field — a field carrying tabindex="-1", the documented host contract,
  // so the landing is a place a keyboard user can act on.
  await page.keyboard.press("Enter");
  await expect(page.locator("#demo-email")).toBeFocused();

  // The returned focus is a live seat in the form's own flow, not a stranded
  // one: the field is out of the tab order by that same tabindex, and the
  // next stop is the submit control the walk started from.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Submit" })).toBeFocused();
});
