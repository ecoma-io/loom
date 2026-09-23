import { expect, test, type Locator, type Page } from "@playwright/test";

// The colour picker's keyboard contract spans its four parts: the saturation
// area thumb and the hue thumb are `role="slider"` nodes the arrows step, the
// hex field commits on Enter, and the preset row is a listbox whose arrows move
// real focus between swatches with Enter choosing. jsdom runs none of it, which
// is why the unit tier could only assert the markup and the emitted values.
//
// A step keeps the walk on the thumb it was taken from, and that half is the
// harness's to witness: the preset row is bound to the same model the thumbs
// write, and reka's listbox re-highlights on every change made outside itself —
// by focusing the swatch it just selected. Nothing in jsdom focuses anything,
// so the unit tier passes with the steal fully present.
//
// The demo mounts three pickers. The first ("colour-picker-demo-label") has no
// presets and shows the value in a readout beside its label; the second
// ("colour-picker-demo-series") carries the six-colour brand palette, which is
// what the swatch walk needs.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=color-picker");
  await expect(page.getByRole("slider", { name: "Saturation and brightness" }).first()).toBeVisible(
    { timeout: 20_000 },
  );
});

/** One picker, scoped by the labelled heading only that picker carries. */
function pickerBox(page: Page, labelledBy: string): Locator {
  return page.locator(`[aria-labelledby="${labelledBy}"]`);
}

/** The first picker — no presets, and a readout of the value beside its label. */
function labelPicker(page: Page): Locator {
  return pickerBox(page, "colour-picker-demo-label");
}

/** The readout span in the first picker's header — the demo's own echo. */
function readout(page: Page): Locator {
  return page.locator("#colour-picker-demo-label + span");
}

/** The second picker — the one carrying the brand palette. */
function seriesPicker(page: Page): Locator {
  return pickerBox(page, "colour-picker-demo-series");
}

test("the slider thumbs step their announced values under the arrows", async ({ page }) => {
  const areaThumb = seriesPicker(page).getByRole("slider", {
    name: "Saturation and brightness",
  });
  const hueThumb = seriesPicker(page).getByRole("slider", { name: "Hue" });

  await areaThumb.focus();
  const before = await areaThumb.getAttribute("aria-valuetext");

  // One ArrowRight is one saturation step, announced on the thumb itself.
  await page.keyboard.press("ArrowRight");
  await expect(areaThumb).not.toHaveAttribute("aria-valuetext", before ?? "");

  // The row re-highlights on that step — which is the thumb's own value
  // arriving from outside the listbox — and the walk stays where it was.
  await expect(areaThumb).toBeFocused();

  // A second step is a second arrival, so the retention is not one lucky
  // tick: the row fires again and the thumb keeps the focus again.
  await page.keyboard.press("ArrowRight");
  await expect(areaThumb).toBeFocused();

  // The hue slider is its own slider with its own stop, and holds it too.
  await hueThumb.focus();
  const hueBefore = await hueThumb.getAttribute("aria-valuenow");
  await page.keyboard.press("ArrowUp");
  await expect(hueThumb).not.toHaveAttribute("aria-valuenow", hueBefore ?? "");
  await expect(hueThumb).toBeFocused();
});

test("the hex field commits on Enter and the readout moves once", async ({ page }) => {
  const hex = labelPicker(page).getByRole("textbox", { name: "Hex value" });
  const committedLine = page
    .locator("p")
    .filter({ hasText: "Last committed:" })
    .locator("span")
    .last();

  await hex.focus();
  // Typed, not filled: the gesture under witness is the keyboard's — select
  // what the field holds, type over it, and let Enter be the commit.
  await hex.press("ControlOrMeta+a");
  await page.keyboard.type("#ff8800");
  await page.keyboard.press("Enter");

  // The commit is the checkpoint: the picker's own readout and the demo's
  // "last committed" line both move to the entered colour.
  await expect(readout(page)).toHaveText(/^#ff8800$/i);
  await expect(committedLine).toHaveText(/^#ff8800$/i);
});

test("the swatch arrows walk the presets and Enter chooses one", async ({ page }) => {
  const swatches = seriesPicker(page).getByRole("option");
  await expect(swatches).toHaveCount(6);

  // The seeded choice is brand[3], so the walk seats there and steps one
  // preset right — the row is one roving listbox stop, not one stop per colour.
  const seeded = swatches.nth(3);
  await expect(seeded).toHaveAttribute("aria-selected", "true");
  await seeded.focus();
  await page.keyboard.press("ArrowRight");
  const steppedTo = swatches.nth(4);
  await expect(steppedTo).toBeFocused();

  // Enter chooses the swatch under the focus: the selection moves off the
  // seeded preset and onto the focused one.
  await page.keyboard.press("Enter");
  await expect(steppedTo).toHaveAttribute("aria-selected", "true");
  await expect(seeded).toHaveAttribute("aria-selected", "false");

  // Choosing from inside the row leaves the walk inside the row. This is the
  // other half of the retention: the row owns the focus a reader gave it, and
  // only a step taken outside it is handed back.
  await expect(steppedTo).toBeFocused();
});
