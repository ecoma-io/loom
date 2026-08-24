import { test, expect, type Locator } from "@playwright/test";

// The WCAG 2.5.8 floor the root target-size sweep holds every page to. A
// listbox row's height is a layout fact — `py-1.5` around a `text-sm` line of
// text resolved by the engine — so jsdom can assert the classes but never the
// pixels; only a browser can prove that the row a pointer actually lands on is
// big enough to hit.
const MIN_TARGET_PX = 24;

/**
 * The trigger heights the `size` scale promises. They exist so a Select sits
 * level with a TextField in the same form row (sm/md/lg = h-8/h-9/h-11), which
 * is an alignment claim about rendered pixels and therefore a browser fact.
 */
const TRIGGER_HEIGHTS = { sm: 32, md: 36, lg: 44 } as const;

async function optionRows(listbox: Locator): Promise<Locator[]> {
  const rows = await listbox.getByRole("option").all();
  if (rows.length === 0) throw new Error("the open listbox must expose option rows");
  return rows;
}

/**
 * Waits out the rows' staggered entrance. Each row arrives on
 * `animate-fade-rise` with a per-index `animation-delay`, so a box measured
 * the moment the listbox opens can be a box still translated below its rest
 * position — and a pointer aimed at that box lands on whichever row is really
 * sitting there.
 */
async function settledListbox(listbox: Locator) {
  await expect(listbox).toBeVisible();
  await expect
    .poll(() =>
      listbox.getByRole("option").evaluateAll((els) =>
        els.every((el) => {
          // A finished entrance can hold its last keyframe (`fill-mode: both`),
          // whose resting transform computes to the identity matrix rather
          // than to `none` — either means the row is where it will be hit.
          const transform = getComputedStyle(el).transform;
          return transform === "none" || transform === "matrix(1, 0, 0, 1, 0, 0)";
        }),
      ),
    )
    .toBe(true);
}

test("every open listbox row clears the 24px target-size floor", async ({ page }) => {
  await page.goto("/?component=select");
  const trigger = page.getByRole("combobox", { name: /language/ });
  await trigger.click();

  // Measured on real boxes: a row that renders 23px tall passes every class
  // assertion and still fails the reader who tries to hit it.
  for (const row of await optionRows(page.getByRole("listbox"))) {
    const box = await row.boundingBox();
    expect(box, "an open Select row must have a bounding box").not.toBeNull();
    expect(
      box.height,
      `${String(await row.textContent())} is shorter than the WCAG target-size floor`,
    ).toBeGreaterThanOrEqual(MIN_TARGET_PX);
  }
});

test("the trigger heights match the text-input scale exactly", async ({ page }) => {
  await page.goto("/?component=select");

  // Each size variant carries a distinct accessible name in the demo, so the
  // three heights are measured off three separate triggers rather than one
  // re-rendered control.
  const cases: [RegExp, number][] = [
    [/three heights/, TRIGGER_HEIGHTS.sm],
    [/Format, medium/, TRIGGER_HEIGHTS.md],
    [/Format, large/, TRIGGER_HEIGHTS.lg],
  ];
  for (const [name, expected] of cases) {
    const box = await page.getByRole("combobox", { name }).boundingBox();
    expect(box, "the trigger must have a bounding box").not.toBeNull();
    // Exact, not a floor: a drift here unaligns every form row that places a
    // Select beside a text input, and nothing else would catch it.
    expect(box.height).toBe(expected);
  }
});

test("choosing a row commits its value, relabels the trigger, and closes the listbox", async ({
  page,
}) => {
  await page.goto("/?component=select");
  const trigger = page.getByRole("combobox", { name: /language/ });
  await trigger.click();
  await page.getByRole("option", { name: "中文" }).click();

  // The demo prints the model value beside the controls: the value crosses the
  // v-model boundary as `zh`, not as the label. The trigger shows the label.
  await expect(page.locator("p .tabular")).toHaveText(/^zh$/);
  await expect(trigger).toContainText("中文");
  await expect(trigger).not.toHaveAttribute("aria-expanded", "true");
});

test("a disabled row refuses the pointer where it paints and is skipped by the keyboard walk", async ({
  page,
}) => {
  await page.goto("/?component=select");
  // Attribute-scoped, not role-scoped: while the popover is open Reka marks
  // the app root `aria-hidden`, so a role query cannot resolve anything
  // outside the portal — including the very trigger holding it open.
  const trigger = page.locator('[aria-labelledby="select-demo-language"]');
  await trigger.click();
  const listbox = page.getByRole("listbox");
  await settledListbox(listbox);

  // The unavailable row paints itself inert (`pointer-events-none`) while
  // staying visible, so the honest probe is a click at the coordinates where
  // the row paints: Playwright's own actionability check would refuse to
  // deliver the click to an element that cannot receive events, which is the
  // component's point but not its evidence. A raw mouse click goes wherever
  // the browser's hit test says — here, to whatever sits beneath the inert
  // row — so nothing may be chosen by it.
  const japanese = page.getByRole("option", { name: "日本語" });
  const box = await japanese.boundingBox();
  expect(box, "the unavailable row must be visible to aim at").not.toBeNull();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  // The click must have been swallowed whole: no selection fired and the
  // listbox did not even close — four rows, still open.
  await expect(page.locator("p .tabular")).toHaveText(/^en$/);
  await expect(listbox).toBeVisible();
  await expect(listbox.getByRole("option")).toHaveCount(4);

  // And the keyboard skips the row too: from the freshly-opened highlight on
  // English, two ArrowDowns reach 中文 and a third attempts 日本語, finds it
  // unavailable and rests back on 中文 — Reka moves real focus onto the
  // highlighted row and does not wrap past the last enabled one, so the walk
  // simply stops there. The delay keeps each press a distinct event; a
  // zero-gap burst loses the race against Reka's key handling (see
  // SegmentedControl's spec).
  await page.keyboard.press("ArrowDown", { delay: 50 });
  await page.keyboard.press("ArrowDown", { delay: 50 });
  await page.keyboard.press("ArrowDown", { delay: 50 });
  const focused = await page.evaluate(() => document.activeElement?.textContent.trim() ?? null);
  expect(focused).toBe("中文");

  // Escape closes without choosing; only now is the trigger back in the
  // accessibility tree, where its resting label and collapsed state are
  // readable again.
  await page.keyboard.press("Escape");
  await expect(trigger).toContainText("English");
  await expect(trigger).not.toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("p .tabular")).toHaveText(/^en$/);
});
