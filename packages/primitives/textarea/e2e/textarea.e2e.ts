import { test, expect } from "@playwright/test";

// Textarea's browser-only keyboard facts: typing into the real `<textarea>`
// moves the component-owned counter, and the counter is a live computed over
// the value — `keyboard.type` drives the browser's own key-event path, which
// jsdom's controlled-value echo does not.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=textarea");
  await expect(page.getByLabel("Bio", { exact: true })).toBeVisible();
});

test("typing into the field moves the component-owned counter by one per keystroke", async ({
  page,
}) => {
  // `Summary (80 characters)` is the field with a visible `80`-limit counter.
  // Reading the number off the page rather than seeding it keeps the assertion
  // honest against any future demo amendment; the observable is the *move*.
  const summary = page.getByLabel("Summary (80 characters)", { exact: true });
  // The counter renders below the box, not inside it — the frame's bottom-right
  // corner belongs to the resize grabber — so it is a *sibling* of the frame
  // div, and two parent hops up reaches the column that holds them together.
  const summaryField = summary.locator("..").locator("..");
  const counter = summaryField.locator("span.tabular");
  await expect(counter).toContainText("/80");

  const before = (await counter.textContent()) ?? "";
  const limit = Number(before.split("/")[0]);
  expect(Number.isNaN(limit)).toBe(false);

  await summary.focus();
  // Wherever the caret lands on script-focus, three keystrokes insert three
  // characters and the counter reads the whole value either way.
  await page.keyboard.type("xyz");

  await expect(counter).toContainText(`${String(limit + 3)}/80`);
  await expect(counter).not.toContainText(before);
});
