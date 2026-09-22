import { test, expect } from "@playwright/test";

// TextField's browser-only keyboard facts: typing into a real input moves the
// component-owned counter, and the revealable toggle — the one button the
// component renders on its own — flips its pressed state under the keyboard.
//
// jsdom can fire `input` for a controlled value, but nothing there counts a
// keystroke through a real input: `keyboard.type` is the browser's own
// key-event path, and the counter is a live computation over it.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=text-field");
  await expect(page.getByLabel("Full name")).toBeVisible();
});

test("typing into the field moves the component-owned counter by one per keystroke", async ({
  page,
}) => {
  // `Headline` is the field with a visible `48`-limit counter. Reading the
  // number off the page rather than seeding it in the test keeps the assertion
  // honest against any future demo amendment; the observable is the *move*.
  const headline = page.getByLabel("Headline", { exact: true });
  const headlineField = headline.locator("..");
  const counter = headlineField.locator("span.tabular");
  await expect(counter).toContainText("/48");

  const before = (await counter.textContent()) ?? "";
  const limit = Number(before.split("/")[0]);
  expect(Number.isNaN(limit)).toBe(false);

  await headline.focus();
  await expect(headline).toBeFocused();
  await page.keyboard.type("abcde");

  // Five keystrokes are five input events, and the counter is a computed over
  // the live value — 5 more than it was, on the same limit.
  await expect(counter).toContainText(`${String(limit + 5)}/48`);
  await expect(counter).not.toContainText(before);
});

test("Space on the reveal toggle flips the password's pressed state and its real type", async ({
  page,
}) => {
  // The reveal toggle rides after the input in tab order, and it is also the
  // control the `revealable` contract owns — the one button this component
  // renders rather than borrowing from the platform. Seated by script because
  // the gesture under test is the Space keypress. `exact` because the toggle's
  // own name, "Show password", contains the substring; without it, `getByLabel`
  // resolves the button alongside the field.
  const password = page.getByLabel("Password", { exact: true });
  await expect(password).toHaveAttribute("type", "password");

  const reveal = page.getByRole("button", { name: "Show password" });
  await reveal.focus();
  await expect(reveal).toBeFocused();
  await expect(reveal).toHaveAttribute("aria-pressed", "false");

  await page.keyboard.press("Space");
  await expect(reveal).toHaveAttribute("aria-pressed", "true");
  // The type flip is the commitment: a pressed state that left the field a
  // password would be a state announcing nothing.
  await expect(password).toHaveAttribute("type", "text");

  // Focus is deliberately left on the toggle: hiding the password again must
  // not be a Shift+Tab away, so pressing Space a second time returns it.
  await page.keyboard.press("Space");
  await expect(reveal).toHaveAttribute("aria-pressed", "false");
  await expect(password).toHaveAttribute("type", "password");
});
