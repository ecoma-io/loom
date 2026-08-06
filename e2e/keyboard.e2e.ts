import { test, expect, type Locator, type Page } from "@playwright/test";

// What follows pins interaction guarantees a jsdom unit test cannot: jsdom
// runs no default Tab-key behaviour of its own (see the comment on Dialog's
// own focus-trap unit test), so nothing in this repository's `vitest` suite
// can prove that a real browser's tab order actually respects a roving
// `tabindex="-1"`, that a focus trap survives a genuine Tab press rather than
// a manually-fired `focusin`, or that `:focus-visible` tracks input modality.
// Arrow-key *selection* logic is already proven at the unit tier — what is
// missing there, and covered here instead, is the real keyboard traversal
// around it: entering, wrapping and leaving a group with actual key presses.

/** A fingerprint stable enough to prove "the same control" across two reads, without depending on any one attribute every control happens to carry. */
async function identify(locator: Locator): Promise<string> {
  return locator.evaluate(
    (el: HTMLElement) => `${el.tagName}:${el.getAttribute("aria-label") ?? el.textContent.trim()}`,
  );
}

/** The `role` of whatever currently holds focus, or `null` outside any styled control. */
async function focusedRole(page: Page): Promise<string | null> {
  return page.locator(":focus").getAttribute("role");
}

test("Dialog traps real Tab focus inside the panel, wraps at both ends, and restores focus to the trigger on Escape", async ({
  page,
}) => {
  await page.goto("components/dialog");
  // `.last()`: the page's intro section repeats this trigger's label first,
  // but that instance renders no `#footer` slot, so its panel holds a single
  // focusable control (the close button) and cannot demonstrate a wrap. The
  // later instance, inside `DialogDemo`'s size gallery, has both a "Keep it"
  // and a "Delete permanently" footer button alongside the close button.
  const trigger = page.getByRole("button", { name: "Delete scene" }).last();
  await trigger.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const focusable = dialog.locator(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  const stopCount = await focusable.count();
  // A panel with a single control cannot demonstrate a wrap; every assertion
  // below only means something once there is more than one stop to cycle.
  expect(stopCount).toBeGreaterThan(1);

  const startLabel = await identify(page.locator(":focus"));

  for (let i = 0; i < stopCount; i++) {
    await page.keyboard.press("Tab");
    // Every intermediate stop has to stay inside the panel — a trap that lets
    // even one Tab press reach the page behind is not a trap.
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

test("Tabs' trigger row is a single real Tab stop, so Tab leaves the row instead of walking to the next trigger", async ({
  page,
}) => {
  await page.goto("components/tabs");
  const activity = page.getByRole("tab", { name: "Activity" });
  await activity.click();
  await expect(activity).toBeFocused();

  // If every trigger carried its own tabindex="0" — the defect the component
  // is built to avoid — this Tab press would land on "Settings", the very
  // next trigger in the DOM. A real browser is the only thing that can prove
  // it does not, since jsdom never runs tab-order resolution at all.
  await page.keyboard.press("Tab");
  expect(await focusedRole(page)).not.toBe("tab");
});

test("RadioGroup's arrow key skips a disabled row and wraps, and the group is a single real Tab stop", async ({
  page,
}) => {
  await page.goto("components/radio-group");
  // Scoped to the interactive demo: the static "With descriptions" example
  // above it binds `model-value` to a literal string rather than `v-model`,
  // so a click there would appear to move and then snap back on the next
  // render — not a real interaction to drive.
  const demo = page.locator("figure").filter({ hasText: "Every state" });
  const enterprise = demo.getByRole("radio", { name: "Enterprise" });
  await enterprise.click();
  await expect(enterprise).toBeFocused();

  // Below "Enterprise" sits the disabled "Legacy plan" row; wrapping past it
  // to "Free" is the fact worth pinning; a plain move down was already the
  // unit suite's fixture.
  //
  // `delay`: reka-ui's roving-focus item commits the new selection from a
  // `setTimeout(0)` queued on focus, gated on an "arrow key is currently
  // held" flag that a `keyup` listener clears. A zero-duration key press —
  // which is what `press()` sends by default, and no real key press ever
  // is — can fire that `keyup` before the timer runs, clearing the flag
  // first and dropping the selection. A short hold reproduces an actual
  // key press instead of an instantaneous one no keyboard can produce.
  await page.keyboard.press("ArrowDown", { delay: 50 });
  const free = demo.getByRole("radio", { name: "Free" });
  await expect(free).toBeFocused();
  await expect(free).toHaveAttribute("aria-checked", "true");

  await page.keyboard.press("Tab");
  expect(await focusedRole(page)).not.toBe("radio");
});

test("SegmentedControl's arrow key skips a disabled segment and wraps, and the group is a single real Tab stop", async ({
  page,
}) => {
  await page.goto("components/segmented-control");
  // Scoped for the same reason as the RadioGroup case above: the static
  // demos bind a literal `model-value`, not `v-model`.
  const demo = page.locator("figure").filter({ hasText: "Every state" });
  const cozy = demo.getByRole("radio", { name: "Cozy", exact: true });
  await cozy.click();
  await expect(cozy).toBeFocused();

  // "Roomy" — disabled — sits between "Cozy" and the wrap-around back to
  // "Compact"; landing on "Compact" is what proves the skip. `delay`: see
  // the matching comment in the RadioGroup test above — same underlying
  // reka-ui roving-focus item, same race between its commit timer and a
  // zero-duration key press.
  await page.keyboard.press("ArrowRight", { delay: 50 });
  const compact = demo.getByRole("radio", { name: "Compact", exact: true });
  await expect(compact).toBeFocused();
  await expect(compact).toHaveAttribute("aria-checked", "true");

  await page.keyboard.press("Tab");
  expect(await focusedRole(page)).not.toBe("radio");
});

test("the focus ring appears on keyboard entry and stays hidden after a mouse click", async ({
  page,
}) => {
  await page.goto("components/button");
  // Scoped to the "Variants" demo: both labels recur, unscoped, inside the
  // later "Every variant, size and state" gallery further down the page.
  // Primary and Secondary sit as adjacent siblings here with nothing
  // tabbable between them, which is what makes a single Tab press between
  // them a meaningful check.
  const variants = page.locator("figure").filter({ hasText: "Variants" });
  const primary = variants.getByRole("button", { name: "Primary", exact: true });
  const secondary = variants.getByRole("button", { name: "Secondary", exact: true });

  await primary.click();
  await expect(primary).toBeFocused();
  // `outlineStyle`, not `outlineWidth`: unlike `border-width`, a browser does
  // not resolve `outline-width` to `0px` just because `outline-style` is
  // `none` — Chromium reports its UA default width (observed: `3px`) either
  // way. `outline-style` is what actually gates whether anything paints, so
  // it is the property that tells the two cases apart.
  expect(await primary.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("none");

  // A real Tab press is the only thing that can turn ":focus-visible" on:
  // jsdom neither renders styles nor tracks input modality, so this halo can
  // only be witnessed by an actual browser.
  await page.keyboard.press("Tab");
  await expect(secondary).toBeFocused();
  expect(await secondary.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe("none");
});
