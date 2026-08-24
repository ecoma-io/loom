import { test, expect, type Locator, type Page } from "@playwright/test";

// The Slider's browser-only facts are its pointer life: a drag is a real
// gesture across a real layout — Reka positions the thumb by percentage of the
// root's rendered width, snaps to `step`, streams every intermediate position
// through `update:modelValue` and commits exactly once on release — and the
// abort path (Escape mid-drag) is a window-level capture listener that only
// exists while a pointer is genuinely down. jsdom has neither boxes nor
// pointers, so none of this is provable anywhere else.

const WCAG_TARGET_PX = 24;

/** The volume slider of the demo: min 0, max 1, step 0.01, starting at 0.65. */
function volumeSlider(page: Page) {
  return page.locator('[role="slider"][aria-labelledby="slider-demo-volume"]');
}

/** The demo's readouts, in DOM order: live volume, live cache ceiling, last commit. */
function readout(page: Page, which: "volume" | "commit") {
  return page.locator(".tabular").nth(which === "volume" ? 0 : 2);
}

/**
 * Presses the thumb at its centre and drags to `toX`. `anchorX` is where the
 * first pointermove lands: Reka freezes its grab offset against that event,
 * so the gesture's arithmetic anchors there rather than at the press — moving
 * there explicitly is what makes the value below predictable.
 */
async function pressThumbAndDragTo(page: Page, thumb: Locator, anchorX: number, toX: number) {
  const box = await thumb.boundingBox();
  if (!box) throw new Error("the thumb must have a bounding box");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(anchorX, y);
  // Steps make it a drag rather than a teleport — Reka samples every move.
  await page.mouse.move(toX, y, { steps: 12 });
}

/**
 * The value the control should report for a drag ending at `toX` with its
 * grab-offset anchored at `anchorX`: Reka's `thumbAlignment="contain"` maps
 * pointer travel linearly onto the range across the track minus the thumb's
 * own width, starting from the thumb's resting left edge. Everything is read
 * off the boxes on screen, so a thumb that stops tracking the pointer — or
 * tracks against a stale width — breaks the arithmetic.
 */
async function draggedValue(
  page: Page,
  root: Locator,
  thumb: Locator,
  anchorX: number,
  toX: number,
): Promise<number> {
  const [rootBox, thumbBox] = [await root.boundingBox(), await thumb.boundingBox()];
  if (!rootBox || !thumbBox) throw new Error("slider boxes must be measurable");
  const span = rootBox.width - thumbBox.width;
  const raw = (thumbBox.x - rootBox.x) / span + (toX - anchorX) / span;
  // The volume slider spans 0…1 at step 0.01: clamp to the range, snap to the
  // grid the component itself snaps to.
  return Math.round(Math.min(Math.max(raw, 0), 1) * 100) / 100;
}

test("a real pointer drag moves the value with the layout and commits once on release", async ({
  page,
}) => {
  await page.goto("/?component=slider");
  const thumb = volumeSlider(page);
  const root = thumb.locator("xpath=..");
  await expect(thumb).toHaveAttribute("aria-valuenow", "0.65");

  // Aim well below the resting 0.65, anchoring the grab a little to the right
  // of the press — the two x positions the arithmetic above is written against.
  const rootBox = await root.boundingBox();
  const startBox = await thumb.boundingBox();
  if (!rootBox || !startBox) throw new Error("slider boxes must be measurable");
  const anchorX = startBox.x + startBox.width / 2 + 8;
  const targetX = startBox.x - (rootBox.width - startBox.width) * 0.4;
  const expected = await draggedValue(page, root, thumb, anchorX, targetX);
  expect(expected).toBeLessThan(0.65);

  await pressThumbAndDragTo(page, thumb, anchorX, targetX);

  // Before release: the transient half of the contract. The readout beside the
  // slider already shows where the pointer is — the host sees every tick, not
  // just the checkpoint. Polled, because a single read can catch any tick of
  // the stream; what must be true is where the stream settles.
  await expect(readout(page, "volume")).not.toHaveText("0.65");
  await expect
    .poll(async () => {
      const live = Number(await readout(page, "volume").textContent());
      return Math.round((live - expected) * 1000) / 1000;
    })
    .toBe(0);

  await page.mouse.up();

  // On release: the committed half. The demo records one checkpoint per
  // gesture, and it must equal the final transient value — one gesture, one
  // commit, same number.
  await expect(thumb).toHaveAttribute("aria-valuenow", String(expected), { timeout: 5_000 });
  const committed = Number(await readout(page, "commit").textContent());
  expect(committed).toBe(expected);
});

test("Escape mid-drag aborts the gesture: the value returns and no checkpoint lands", async ({
  page,
}) => {
  await page.goto("/?component=slider");
  const thumb = volumeSlider(page);
  const root = thumb.locator("xpath=..");
  await expect(thumb).toHaveAttribute("aria-valuenow", "0.65");

  // Drag away from the resting value, cancel in flight, release over a
  // position that would otherwise have been the new value.
  const rootBox = await root.boundingBox();
  const startBox = await thumb.boundingBox();
  if (!rootBox || !startBox) throw new Error("slider boxes must be measurable");
  const anchorX = startBox.x + startBox.width / 2 + 8;
  await pressThumbAndDragTo(page, thumb, anchorX, rootBox.x + rootBox.width - 4);
  await expect(readout(page, "volume")).not.toHaveText("0.65");

  // The component listens for Escape on the window only while a pointer is
  // captured, so this keypress exercises the armed listener, not a global one.
  await page.keyboard.press("Escape");
  await page.mouse.up();

  // Restored, and nothing recorded: the paragraph still reads "—", because a
  // cancelled gesture never became a checkpoint.
  await expect(thumb).toHaveAttribute("aria-valuenow", "0.65");
  await expect(readout(page, "volume")).toHaveText("0.65");
  await expect(readout(page, "commit")).toHaveText("—");
});

test("an unavailable slider refuses the same drag", async ({ page }) => {
  await page.goto("/?component=slider");
  const locked = page.locator('[role="slider"][aria-labelledby="slider-demo-locked"]');
  await expect(locked).toHaveAttribute("aria-valuenow", "0.3");

  // Its thumb paints itself inert (`pointer-events-none`), so like the Select's
  // disabled row the honest probe is a raw drag through where it sits: the
  // gestures land on the track beneath, and the control must ignore them.
  const box = await locked.boundingBox();
  if (!box) throw new Error("the disabled thumb must have a bounding box");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2 + 60, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 60, y, { steps: 8 });
  await page.mouse.up();

  await expect(locked).toHaveAttribute("aria-valuenow", "0.3");
});

test("the thumb clears the WCAG 24px target floor on both axes", async ({ page }) => {
  await page.goto("/?component=slider");
  // The thumb IS the whole control (`span[role="slider"]`) — there is no
  // larger equivalent target around it, so its own box must carry the floor.
  for (const thumb of await page.locator('[role="slider"]').all()) {
    const box = await thumb.boundingBox();
    expect(box, "every thumb must have a bounding box").not.toBeNull();
    expect(box.width).toBeGreaterThanOrEqual(WCAG_TARGET_PX);
    expect(box.height).toBeGreaterThanOrEqual(WCAG_TARGET_PX);
  }
});
