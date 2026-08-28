import { expect, test, type Page } from "@playwright/test";

/**
 * The toolbar demo's walk order: Bold → Italic → (disabled Underline is
 * skipped but keeps its slot) → Zoom → Find, with separators costing
 * nothing. Reading focus through `document.activeElement` — the harness
 * mounts no chrome, so a `:focus` locator has nothing to resolve against.
 */
async function activeName(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    // The DOM lib this project compiles against types `textContent` as
    // non-nullable, which is a lie at runtime — the cast keeps the null
    // handling honest instead of optional-chained away.
    const named = el.getAttribute("aria-label");
    if (named !== null && named.trim().length > 0) return named.trim();
    const text = (el.textContent as string | null) ?? "";
    return text.trim().length > 0 ? text.trim() : null;
  });
}

async function focusIsInsideToolbar(page: Page): Promise<boolean> {
  return page.evaluate(() => document.activeElement?.closest("[role='toolbar']") !== null);
}

test("Toolbar is one Tab stop: Tab leaves the group instead of walking to its next control", async ({
  page,
}) => {
  await page.goto("/?component=toolbar");
  await page.getByRole("button", { name: "Bold" }).click();
  await expect(page.getByRole("button", { name: "Bold" })).toBeFocused();

  // If every control carried tabindex=0, this press would land on Italic.
  // jsdom does not resolve tab order, so only a real browser can pin it.
  await page.keyboard.press("Tab");
  expect(await focusIsInsideToolbar(page)).toBe(false);
});

test("Arrow keys walk the controls, skip the disabled one and the separator, and wrap", async ({
  page,
}) => {
  await page.goto("/?component=toolbar");
  await page.getByRole("button", { name: "Bold" }).focus();

  await page.keyboard.press("ArrowRight");
  expect(await activeName(page)).toBe("Italic");
  await page.keyboard.press("ArrowRight");
  // The disabled Underline keeps its position but is never a stop, and the
  // separator is never a stop at all.
  expect(await activeName(page)).toBe("Font size");
  await page.keyboard.press("ArrowRight");
  expect(await activeName(page)).toBe("Find");
  await page.keyboard.press("ArrowRight");
  // From the editable Find field the arrow is the caret's, not the walk's —
  // the toolbar must not steal it, and focus stays put.
  expect(await activeName(page)).toBe("Find");
  // The wrap proof needs a non-editable stop: moving left off the first
  // control wraps to the last enabled one.
  await page.getByRole("button", { name: "Bold" }).focus();
  await page.keyboard.press("ArrowLeft");
  expect(await activeName(page)).toBe("Find"); // wrapped
});

test("Home and End jump to the first and last enabled control", async ({ page }) => {
  await page.goto("/?component=toolbar");
  await page.getByRole("button", { name: "Bold" }).focus();
  await page.keyboard.press("End");
  expect(await activeName(page)).toBe("Find");
  await page.getByRole("button", { name: "Italic" }).focus();
  await page.keyboard.press("Home");
  expect(await activeName(page)).toBe("Bold");
});

test("the separator is rendered but never focusable", async ({ page }) => {
  await page.goto("/?component=toolbar");
  const separators = page.locator("[role='toolbar'] [role='separator']");
  await expect(separators.first()).not.toBeFocused();
  await expect(separators.first()).not.toHaveAttribute("tabindex");
});
