import { expect, test, type Locator, type Page } from "@playwright/test";

// The editable's keyboard contract is Loom's own, not the wrapped Reka
// primitive's: Reka has no keyboard path into its preview at all, so Loom
// renders the preview as a real `<button>` and rebuilds activation on top of
// it. What a browser must witness: Enter opens the editor from the preview,
// Escape abandons with focus handed back, the `focus` mode opens on arrival
// without re-opening on Escape's own hand-back, the read-only box seats
// without ever opening, and Enter commits — the value reaching the host, the
// editor closing and focus landing back on the preview.
//
// The demo mounts nine editables; two of them show the same owner, so
// previews are matched by value AND taken in document order.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=editable");
  await expect(preview(page, /Q3 operations review/)).toBeVisible({ timeout: 20_000 });
});

/** The preview control of one editable, by its value. */
function preview(page: Page, value: RegExp): Locator {
  return page.getByRole("button", { name: value });
}

/** The open editor of the editable whose preview matches. */
function editor(page: Page, value: RegExp): Locator {
  return page.getByRole("textbox", { name: value });
}

test("Enter opens the editor, and Escape abandons and hands focus back", async ({ page }) => {
  const title = preview(page, /Q3 operations review/);

  // The title box is the demo's first tab stop.
  await page.keyboard.press("Tab");
  await expect(title).toBeFocused();

  // The preview is a real button: Enter is the browser's activation, and it
  // swaps the value for the editor.
  await page.keyboard.press("Enter");
  const box = editor(page, /a record title/);
  await expect(box).toBeFocused();

  // Escape abandons: the typed text is thrown away, the demo prints the cancel
  // event, and focus lands back on the preview.
  await box.press("End");
  await page.keyboard.type(" (moved)");
  await page.keyboard.press("Escape");
  await expect(preview(page, /Q3 operations review/)).toBeVisible();
  await expect(page.getByText(/Q3 operations review \(moved\)/)).toHaveCount(0);
  await expect(page.getByText("cancel", { exact: true })).toBeVisible();
  await expect(title).toBeFocused();
});

/** What the first editable's box looks like right now, for a failure message. */
async function commitState(page: Page): Promise<string> {
  return page.evaluate(() => {
    const root = document.querySelector("[data-dismissable-layer]");
    const input = root?.querySelector("input");
    const active = document.activeElement;
    const name = (el: Element | null): string => {
      if (!el || el === document.body) return "body";
      const role = el.getAttribute("role");
      return `${el.tagName.toLowerCase()}${role === null ? "" : `[role=${role}]`}: ${el.textContent.trim().slice(0, 40)}`;
    };

    return [
      `focus is on ${name(active)}`,
      `the root says data-editing=${root?.getAttribute("data-editing") ?? "(absent)"}`,
      `the editor input is ${
        input instanceof HTMLInputElement
          ? `${input.hidden ? "hidden" : "shown"}, holding ${JSON.stringify(input.value)}`
          : "absent"
      }`,
    ].join("; ");
  });
}

/**
 * Diagnostic scaffolding: what the page did between the commit key and the
 * state this spec reads. It exists to name the mechanism behind the open
 * editor, and goes once the mechanism is pinned in the component.
 */
async function watchCommit(page: Page): Promise<void> {
  await page.evaluate(() => {
    const trail: string[] = [];
    (window as unknown as { __trail: string[] }).__trail = trail;

    const say = (event: Event): void => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const root = document.querySelector("[data-dismissable-layer]");
      const editing = root?.getAttribute("data-editing") ?? "-";
      const label = target.getAttribute("aria-label") ?? target.textContent.trim().slice(0, 24);
      const key = event instanceof KeyboardEvent ? ` key=${event.key}` : "";
      trail.push(
        `${event.type}→<${target.tagName.toLowerCase()}${label ? ` ${label}` : ""}>${key} (editing=${editing})`,
      );
    };
    for (const type of ["keydown", "keyup", "click", "focusin"]) {
      document.addEventListener(type, say, true);
    }
  });
}

/** The trail `watchCommit` recorded, as one line. */
async function commitTrail(page: Page): Promise<string> {
  return page.evaluate(() => {
    const trail = (window as unknown as { __trail?: string[] }).__trail;
    return trail === undefined ? "(no trail)" : trail.join(" | ");
  });
}

test("Enter commits the edit: the value lands, the editor closes, focus returns to the preview", async ({
  page,
}) => {
  const title = preview(page, /Q3 operations review/);
  await title.focus();
  await page.keyboard.press("Enter");
  const box = editor(page, /a record title/);
  await expect(box).toBeFocused();

  await box.press("End");
  await page.keyboard.type(" (committed)");
  await watchCommit(page);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);

  // The half the host sees: the commit reached it, once, with the typed value.
  await expect(page.getByText("submit: Q3 operations review (committed)")).toBeVisible();

  // And the half the reader sees: the editor is gone (a hidden input carries no
  // textbox role, so the query is what proves the swap) and the preview that
  // replaced it holds the focus — the same resting place Escape returns to.
  const state = await commitState(page);
  const trail = await commitTrail(page);
  await expect(
    editor(page, /a record title/),
    `after Enter, ${state}\ntrail: ${trail}`,
  ).toHaveCount(0);
  await expect(
    preview(page, /Q3 operations review \(committed\)/),
    `after Enter, ${state}\ntrail: ${trail}`,
  ).toBeFocused();
});

test("focus mode opens on arrival, and Escape's hand-back does not re-open it", async ({
  page,
}) => {
  // Seat the walk before the region box — the click-mode preview does not
  // open on focus, so it is a safe place to Tab from. The owner box in
  // between is dblclick mode and seats silently too. Both owner previews
  // carry the same name, so the walk aims at the first in document order.
  await preview(page, /Q3 operations review/).focus();
  await page.keyboard.press("Tab");
  await expect(preview(page, /Mai Phương/).first()).toBeFocused();
  await page.keyboard.press("Tab");

  // With `activationMode: "focus"` the editor is already open when the caret
  // lands — no Enter needed.
  await expect(page.getByRole("textbox", { name: /focus mode/ })).toBeFocused();

  // Escape abandons the edit and hands focus back to the preview — and the
  // returning focus is suppressed exactly once: the box must not re-open
  // itself, or Escape could never leave it.
  await page.keyboard.press("Escape");
  const region = preview(page, /Northern/);
  await expect(region).toBeFocused();
  await expect(region).toBeVisible();

  // Leaving and coming back deliberately opens it again.
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("textbox", { name: /focus mode/ })).toBeFocused();
});

test("the read-only value seats but never opens, and the disabled box never seats", async ({
  page,
}) => {
  // Read-only keeps a Tab stop — a value on show, reachable and copyable.
  // The caller's aria-labelledby intentionally describes only the editor (it
  // lands there when one opens), so the resting preview is found from the
  // value's span and seated on its parent, which holds the `tabindex="0"`.
  const sku = page.getByText("LM-4471-A", { exact: true }).locator("..");
  await expect(sku).toHaveAttribute("tabindex", "0");
  await sku.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox", { name: /read-only/ })).toHaveCount(0);
  await expect(sku).toBeVisible();

  // The next stop after the read-only box should skip the disabled one
  // entirely and land on the inline editable in the sentence below it. The
  // landing is instrumented rather than assumed: where the walk actually went
  // is what the message reports if this assertion fails.
  await page.keyboard.press("Tab");
  const landed = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return "body";
    const role = el.getAttribute("role");
    const text = el.textContent.trim().slice(0, 40);
    return `${el.tagName.toLowerCase()}${role ? `[role=${role}]` : ""}: ${text}`;
  });
  await expect(
    page.locator("p").getByRole("button", { name: "Mai Phương" }),
    `the Tab out of the read-only value landed on: ${landed}`,
  ).toBeFocused();
});
