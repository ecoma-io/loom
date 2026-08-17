import { test, expect, type Locator } from "@playwright/test";

// jsdom runs no native Tab-key behaviour, so the unit suite cannot prove the
// browser's actual focus trap or restoration. Where the docs site used to be
// the consumer surface for that, the harness now mounts the same demo through
// a Vite dev server — the component, its real public API, and the browser's own
// focus machinery, without a site build.

/** A fingerprint stable enough to prove the same control across two reads. */
async function identify(locator: Locator): Promise<string> {
  return locator.evaluate(
    (el: HTMLElement) => `${el.tagName}:${el.getAttribute("aria-label") ?? el.textContent.trim()}`,
  );
}

test("Dialog traps real Tab focus inside the panel, wraps at both ends, and restores focus to the trigger on Escape", async ({
  page,
}) => {
  await page.goto("/?component=dialog");
  // `.last()`: the raw string is also on the settings and authoring dialogs'
  // triggers, and the confirm one is the gallery's focusable instance. The
  // intro duplicate is absent from the harness mount, so the sole match works.
  const trigger = page.getByRole("button", { name: "Delete scene" }).last();
  await trigger.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const focusable = dialog.locator(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  const stopCount = await focusable.count();
  expect(stopCount).toBeGreaterThan(1);

  const startLabel = await identify(page.locator(":focus"));

  for (let i = 0; i < stopCount; i++) {
    await page.keyboard.press("Tab");
    await expect(dialog.locator(":focus")).toHaveCount(1);
  }
  expect(await identify(page.locator(":focus"))).toBe(startLabel);

  for (let i = 0; i < stopCount; i++) {
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.locator(":focus")).toHaveCount(1);
  }
  expect(await identify(page.locator(":focus"))).toBe(startLabel);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
