import { test, expect, type Page } from "@playwright/test";

// The Combobox's browser-only facts are the two the issue names: a highlight
// that must stay reachable in a list longer than the popover (Reka's
// `changeHighlight` calls `scrollIntoView({ block: "nearest" })`, and only a
// real scroll container with real row boxes can prove it), and an IME
// composition driving the filter. Both are invisible to jsdom: one needs
// layout, the other needs the composition event stream Vue and Reka gate
// their input handling on.
//
// The demo's country box is the long list — seventeen rows against a
// `max-h-72` (288px) popover, roughly nine visible at once.

const MIN_TARGET_PX = 24;

/**
 * The open country listbox of the demo's first Combobox. Scoped by its rows
 * rather than trusted to be the only one: every Combobox on the page mounts
 * its own portal.
 */
function countryListbox(page: Page): ReturnType<Page["getByRole"]> {
  return page.getByRole("listbox").filter({ has: page.getByRole("option", { name: "Viet Nam" }) });
}

/**
 * Geometry of the highlighted row against the popover that clips it, read in
 * one evaluate so the two boxes describe the same frame.
 */
function highlightedSnapshot(page: Page) {
  return page.evaluate(() => {
    const el = document.querySelector<HTMLElement>("[data-highlighted]");
    if (!el) return null;
    const row = el.getBoundingClientRect();
    const clip = el.closest("[role='listbox']")?.getBoundingClientRect();
    if (!clip) return null;
    return {
      text: el.textContent.trim(),
      inside: row.top >= clip.top && row.bottom <= clip.bottom,
    };
  });
}

test("the highlighted row stays inside the popover as the keyboard walks past the fold", async ({
  page,
}) => {
  await page.goto("/?component=combobox");
  const trigger = page.getByRole("combobox", { name: /country — seventeen/ });
  await trigger.click();
  await expect(countryListbox(page)).toBeVisible();

  // A fresh open highlights the chosen row — Viet Nam, the last enabled entry,
  // already on screen. Walking UP crosses the fold almost immediately: twelve
  // presses is more than the visible row count, so the popover has to scroll
  // for the later targets to be true at all.
  await expect(highlightedSnapshot(page)).resolves.toMatchObject({
    text: "Viet Nam",
    inside: true,
  });

  // The delay keeps each press a distinct keydown; Reka's navigation runs per
  // event, and a zero-gap burst can outrun it (see SegmentedControl's spec).
  for (let pressed = 0; pressed < 12; pressed++) {
    await page.keyboard.press("ArrowUp", { delay: 50 });
  }
  const final = await highlightedSnapshot(page);
  expect(final, "the walk must end on a highlighted row").not.toBeNull();
  // Germany sits near the top of the list, well above where twelve rows of
  // walking started — reaching it while staying inside the clip is the
  // scroll-into-view contract.
  expect(final.text).toBe("Germany");
  expect(final.inside).toBe(true);

  // The geometry claim becomes a selection claim: Enter commits the highlighted
  // row even though it was never scrolled to by hand. The chosen label lands
  // in the input's `value` — the combobox element is an `<input>`, so its
  // text content is always empty and the value is the thing to assert.
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveValue("Germany");
  await expect(page.locator("p .tabular").first()).toHaveText(/^de$/);
});

test("every filtered-in row still clears the 24px target-size floor", async ({ page }) => {
  await page.goto("/?component=combobox");

  // The empty destination box is the honest filter surface: its input holds
  // nothing, so what is typed is exactly what is searched. (The country box's
  // input carries the chosen label, and typing appends to it.) Attribute-
  // scoped rather than role-scoped: while a popover is open Reka marks the
  // app root `aria-hidden`, hiding even the input that opened it.
  const input = page.locator('input[aria-labelledby="combobox-demo-empty"]');
  await input.click();
  await expect(page.getByRole("option").first()).toBeVisible();

  // "in" keeps India, Indonesia and the Philippines in — several rows, so
  // measuring them exercises the re-rendered list, not one lucky survivor.
  await page.keyboard.type("in", { delay: 60 });
  const rows = await page.getByRole("option").all();
  expect(rows.length).toBeGreaterThanOrEqual(2);
  for (const row of rows) {
    const box = await row.boundingBox();
    expect(box, "a filtered row must have a bounding box").not.toBeNull();
    expect(box.height).toBeGreaterThanOrEqual(MIN_TARGET_PX);
  }
});

test("an IME composition filters once, on commit — not on every intermediate stream", async ({
  page,
}) => {
  await page.goto("/?component=combobox");

  // The host-driven search box ("Name or code") is where a composition is
  // observable from outside: its options are produced by the demo's own
  // filter over the emitted query, so whatever reaches `update:query` shows
  // up as rows. A real OS IME cannot be driven by any engine here, so the
  // sequence below synthesizes the DOM-level events a composition produces —
  // compositionstart, then input events flagged `isComposing` carrying each
  // intermediate stream, then compositionend with the committed text — which
  // is exactly what Vue's own v-model and Reka's useComposing gate on.
  const input = page.locator('input[aria-labelledby="combobox-demo-search"]');
  await input.click();
  await expect(input).toBeFocused();
  const fullList = 17;

  const compose = (committed: string, streams: string[]) =>
    input.evaluate(
      (el, { committed, streams }) => {
        el.dispatchEvent(new CompositionEvent("compositionstart", { data: "", bubbles: true }));
        for (const partial of streams) {
          el.value = partial;
          el.dispatchEvent(
            new InputEvent("input", { data: partial, isComposing: true, bubbles: true }),
          );
        }
        el.value = committed;
        el.dispatchEvent(
          new CompositionEvent("compositionend", { data: committed, bubbles: true }),
        );
      },
      { committed, streams },
    );

  const rowCount = () => page.getByRole("option").count();

  // Mid-composition: every keystroke of the stream arrives flagged composing,
  // and none of them may drive the search — a host firing a request per
  // intermediate romaji fragment is precisely the storm the guard exists to
  // prevent.
  await input.evaluate((el) => {
    el.dispatchEvent(new CompositionEvent("compositionstart", { data: "", bubbles: true }));
    for (const partial of ["v", "vn"]) {
      el.value = partial;
      el.dispatchEvent(
        new InputEvent("input", { data: partial, isComposing: true, bubbles: true }),
      );
    }
  });
  expect(await rowCount(), "the list must stay unfiltered while the composition runs").toBe(
    fullList,
  );

  // Enter during composition belongs to the IME (confirming the candidate),
  // never to the combobox: Reka guards both navigation-commit paths on its
  // composing flag. Nothing is chosen yet.
  await page.keyboard.press("Enter");
  await expect(input).not.toHaveValue("Viet Nam");

  // Committing the composed text filters exactly once, on the final value:
  // the host-driven list narrows to the one country whose *code* is `vn`.
  await compose("vn", ["v", "vn"]);
  await expect(page.getByRole("option")).toHaveCount(1);
  await expect(page.getByRole("option", { name: "Viet Nam" })).toBeVisible();

  // And now Enter selects it, rewriting the input with the option's label.
  await page.keyboard.press("Enter");
  await expect(input).toHaveValue("Viet Nam");
});
