import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import Combobox, { type ComboboxOption } from "./Combobox.vue";
import { LIST_STAGGER_STEP_MS, listStaggerDelay } from "../../lib/motion";
import { attachToBody } from "../../testing/attach-to-body";

const options: ComboboxOption[] = [
  { value: "en", label: "English" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "ja", label: "日本語", disabled: true },
];

// The listbox is portalled to `document.body` and Reka drives it with real
// pointer capture, focus and layout APIs. jsdom implements none of those, so
// every one is stubbed to the shape Reka reads rather than mocked away — the
// library itself stays the real thing under test.
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

// The listbox is portalled, so a test that only wipes `document.body` tears the
// nodes out from under a component that is still mounted and leaves Vue
// patching into a detached tree. Unmounting is what actually ends the test.
enableAutoUnmount(afterEach);

function mountCombobox(props: Partial<InstanceType<typeof Combobox>["$props"]> = {}, attrs = {}) {
  return mount(Combobox, {
    props: { options, ...props },
    attrs,
    // Reka moves focus into the input as the list opens, and focus only works
    // for a tree that is actually in the document.
    attachTo: document.body,
  });
}

// `@vue/test-utils`' `trigger` builds a plain `Event` and assigns the extra
// keys onto it, which throws on `MouseEvent.button` — a getter with no setter.
// Reka reads `button` to tell a primary click from any other, so the event has
// to be a real `PointerEvent` constructed with it.
function firePointer(el: Element, type: string, init: PointerEventInit = {}) {
  el.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      pointerId: 1,
      pointerType: "mouse",
      ...init,
    }),
  );
}

// Reka defers several steps past the render queue on purpose: the dismiss
// layer registers its document listener on a `setTimeout(0)` so the very
// pointerdown that opened the list cannot immediately close it, the item
// registry settles a tick later again, and the search term resets a
// millisecond after a close. Waiting for the macrotask is what lets the
// assertions read a settled component rather than one mid-flight.
async function settle() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 2));
  await nextTick();
}

function getInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>('input[role="combobox"]');
  if (!input) throw new Error("no combobox input rendered");
  return input;
}

// The control box: the anchor Reka renders around the input and the chevron,
// and the node this component routes a caller's `class` onto.
function getAnchor(): HTMLElement {
  const anchor = getInput().parentElement;
  if (!anchor) throw new Error("the input is not inside an anchor");
  return anchor;
}

function getTrigger(): HTMLElement {
  const trigger = document.querySelector<HTMLElement>('button[aria-haspopup="listbox"]');
  if (!trigger) throw new Error("no trigger rendered");
  return trigger;
}

function getListbox(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="listbox"]');
}

function getRows(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[role="option"]')];
}

function labels(): string[] {
  return getRows().map((row) => row.textContent.trim());
}

// Opening through the input is the path a reader actually takes, and it is the
// one that leaves focus where the ARIA contract needs it.
//
// `click()` rather than a dispatched `MouseEvent`: the method runs the
// synthetic activation steps, which return early for a disabled control the
// way a real pointer does. A dispatched event skips that check, so the
// disabled case below would open a list a browser never would and the test
// would pass by not testing anything.
async function openList() {
  const input = getInput();
  input.focus();
  input.click();
  await settle();
}

// The whole keystroke: Reka reads the value off the event target, so the value
// has to be on the element before the event is dispatched.
async function type(text: string) {
  const input = getInput();
  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
}

describe("Combobox listbox contract", () => {
  it("reports itself collapsed and renders no listbox until it is opened", async () => {
    mountCombobox();
    await settle();

    const input = getInput();
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.getAttribute("aria-autocomplete")).toBe("list");
    expect(getListbox()).toBeNull();
  });

  it("opens on the input and points aria-controls at the listbox it opened", async () => {
    mountCombobox();
    await openList();

    const listbox = getListbox();
    expect(listbox).not.toBeNull();
    expect(getInput().getAttribute("aria-expanded")).toBe("true");
    expect(getInput().getAttribute("aria-controls")).toBe(listbox?.id);
  });

  it("opens from the keyboard so the control is reachable without a pointer", async () => {
    mountCombobox();
    getInput().dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowDown" }),
    );
    await settle();

    expect(getInput().getAttribute("aria-expanded")).toBe("true");
    expect(getListbox()).not.toBeNull();
  });

  it("opens as soon as the reader types, with no other gesture", async () => {
    mountCombobox();
    await type("lish");

    expect(getInput().getAttribute("aria-expanded")).toBe("true");
    expect(labels()).toEqual(["English"]);
  });

  it("renders one row per option, in the order they were given", async () => {
    mountCombobox();
    await openList();

    expect(labels()).toEqual(["English", "Tiếng Việt", "日本語"]);
  });

  it("marks the chosen row selected and every other row not", async () => {
    mountCombobox({ modelValue: "vi" });
    await openList();

    expect(getRows().map((row) => row.getAttribute("aria-selected"))).toEqual([
      "false",
      "true",
      "false",
    ]);
    expect(getRows().map((row) => row.getAttribute("data-state"))).toEqual([
      "unchecked",
      "checked",
      "unchecked",
    ]);
  });

  it("tracks the active row with aria-activedescendant, keeping focus in the input", async () => {
    mountCombobox();
    await openList();

    getInput().dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowDown" }),
    );
    await settle();

    // The reader is still typing, so real focus cannot move onto the row the
    // way Select's does — the input keeps it and points at the active row
    // instead. That indirection is the whole difference between the two
    // controls' keyboard models, so it is pinned from both ends.
    const highlighted = document.querySelector<HTMLElement>("[data-highlighted]");
    expect(highlighted).not.toBeNull();
    expect(document.activeElement).toBe(getInput());
    expect(getInput().getAttribute("aria-activedescendant")).toBe(highlighted?.id);
  });

  it("closes on Escape and leaves focus in the input", async () => {
    mountCombobox();
    await openList();

    document.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" }),
    );
    await settle();

    expect(getListbox()).toBeNull();
    expect(getInput().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(getInput());
  });

  it("reopens on the next keystroke after Escape", async () => {
    mountCombobox();
    await openList();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" }),
    );
    await settle();
    expect(getListbox()).toBeNull();

    await type("t");
    expect(getListbox()).not.toBeNull();
    expect(getInput().getAttribute("aria-expanded")).toBe("true");
  });

  it("closes when a pointer lands outside it", async () => {
    mountCombobox();
    await openList();

    const outside = attachToBody(document.createElement("button"));
    firePointer(outside, "pointerdown");
    await settle();

    expect(getListbox()).toBeNull();
    expect(getInput().getAttribute("aria-expanded")).toBe("false");
  });
});

describe("Combobox filtering", () => {
  it("narrows the list to the rows matching what was typed", async () => {
    mountCombobox();
    await openList();
    await type("ti");

    expect(labels()).toEqual(["Tiếng Việt"]);
  });

  it("matches through diacritics, so an unaccented keyboard still reaches the row", async () => {
    mountCombobox();
    await openList();
    await type("viet");

    expect(labels()).toEqual(["Tiếng Việt"]);
  });

  it("shows the whole list again the next time it opens, not the last query's result", async () => {
    mountCombobox();
    await openList();
    await type("ti");
    expect(labels()).toEqual(["Tiếng Việt"]);

    document.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" }),
    );
    await settle();
    await openList();

    expect(labels()).toEqual(["English", "Tiếng Việt", "日本語"]);
  });

  it("reports the typed text so a host can drive a search of its own", async () => {
    const wrapper = mountCombobox();
    await openList();
    await type("ti");

    expect(wrapper.emitted("update:query")).toEqual([["ti"]]);
  });

  it("leaves every option rendered when the host owns the filter", async () => {
    mountCombobox({ filter: false });
    await openList();
    await type("nothing matches this");

    // With `filter` off the component makes no judgement about what belongs on
    // screen: the host asked for these rows and gets these rows, which is what
    // makes an async search whose results do not contain the query possible.
    expect(labels()).toEqual(["English", "Tiếng Việt", "日本語"]);
  });
});

describe("Combobox empty state", () => {
  it("says nothing matched, in a row inside the listbox a screen reader reaches", async () => {
    mountCombobox();
    await openList();
    await type("zzz");

    expect(getListbox()).not.toBeNull();
    const rows = getRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.textContent.trim()).toBe("No results");
    expect(rows[0]?.getAttribute("aria-disabled")).toBe("true");
  });

  it("uses the caller's own wording for it", async () => {
    mountCombobox({ emptyMessage: "No language by that name" });
    await openList();
    await type("zzz");

    expect(labels()).toEqual(["No language by that name"]);
  });

  it("says the same thing when the host hands over an empty list", async () => {
    mountCombobox({ options: [], filter: false });
    await openList();

    expect(labels()).toEqual(["No results"]);
  });

  it("keeps quiet while rows match", async () => {
    mountCombobox();
    await openList();
    await type("ti");

    expect(labels()).toEqual(["Tiếng Việt"]);
  });
});

describe("Combobox choice", () => {
  it("reports the chosen option's value and closes behind the choice", async () => {
    const wrapper = mountCombobox();
    await openList();

    const row = getRows()[1];
    if (!row) throw new Error("no second row");
    firePointer(row, "pointermove");
    row.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([["vi"]]);
    expect(getListbox()).toBeNull();
  });

  it("puts the chosen option's label in the input, not its value", async () => {
    mountCombobox({ modelValue: "vi" });
    await settle();

    expect(getInput().value).toBe("Tiếng Việt");
  });

  it("follows a value the host changes underneath it", async () => {
    const wrapper = mountCombobox({ modelValue: "en" });
    await settle();
    await wrapper.setProps({ modelValue: "vi" });
    await settle();

    expect(getInput().value).toBe("Tiếng Việt");
  });

  it("refuses a row marked disabled, choosing nothing and staying open", async () => {
    const wrapper = mountCombobox();
    await openList();

    const row = getRows()[2];
    if (!row) throw new Error("no third row");
    expect(row.hasAttribute("data-disabled")).toBe(true);

    row.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(getListbox()).not.toBeNull();
  });

  it("shows the placeholder while the input is empty", async () => {
    mountCombobox({ placeholder: "Search languages" });
    await settle();

    expect(getInput().getAttribute("placeholder")).toBe("Search languages");
    expect(getInput().value).toBe("");
  });
});

describe("Combobox motion", () => {
  it("staggers the rows apart by the shared list step rather than a delay of its own", async () => {
    mountCombobox();
    await openList();

    expect(getRows().map((row) => row.style.animationDelay)).toEqual([
      listStaggerDelay(0),
      listStaggerDelay(1),
      listStaggerDelay(2),
    ]);
    // Pinned against the literal step too, so a helper that silently started
    // returning 0 for every row could not keep this green.
    expect(getRows().map((row) => row.style.animationDelay)).toEqual([
      "0ms",
      `${String(LIST_STAGGER_STEP_MS)}ms`,
      `${String(LIST_STAGGER_STEP_MS * 2)}ms`,
    ]);
  });

  it("drops the stagger once the reader types, so re-filtering never re-reveals the list", async () => {
    mountCombobox();
    await openList();
    await type("t");

    expect(getRows().length).toBeGreaterThan(0);
    expect(getRows().map((row) => row.style.animationDelay)).toEqual(getRows().map(() => "0ms"));
  });

  it("staggers again on the next open, because that one is a reveal", async () => {
    mountCombobox();
    await openList();
    await type("t");
    document.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" }),
    );
    await settle();
    await openList();

    expect(getRows().map((row) => row.style.animationDelay)).toEqual([
      listStaggerDelay(0),
      listStaggerDelay(1),
      listStaggerDelay(2),
    ]);
  });

  it("scopes the entrance animation to the open state, so the closed content unmounts", async () => {
    mountCombobox();
    await openList();

    // Unconditional, the animation never fires a second time and Reka waits
    // forever for an `animationend` that will not come — leaving an invisible
    // overlay over the page. The scoped class is what makes the closed element
    // compute `animation-name: none` and take the immediate-unmount branch.
    const listbox = getListbox();
    expect(listbox?.className).toContain("data-[state=open]:animate-fade-rise");
    expect(listbox?.className).not.toMatch(/(^|\s)animate-fade-rise/);
  });
});

describe("Combobox unavailable state", () => {
  it("refuses to open while disabled", async () => {
    mountCombobox({ disabled: true });
    await settle();

    expect(getInput().hasAttribute("disabled")).toBe(true);
    expect(getTrigger().hasAttribute("disabled")).toBe(true);

    await openList();
    expect(getListbox()).toBeNull();
    expect(getInput().getAttribute("aria-expanded")).toBe("false");
  });

  it("paints the destructive border and announces the error while invalid", async () => {
    mountCombobox({ invalid: true });
    await settle();

    expect(getAnchor().className).toContain("border-destructive");
    expect(getAnchor().hasAttribute("data-invalid")).toBe(true);
    expect(getInput().getAttribute("aria-invalid")).toBe("true");
  });

  it("stays quiet while valid, with no invalid marker to explain away", async () => {
    mountCombobox();
    await settle();

    expect(getAnchor().className).not.toContain("border-destructive");
    expect(getAnchor().hasAttribute("data-invalid")).toBe(false);
    expect(getInput().getAttribute("aria-invalid")).toBeNull();
  });
});

describe("Combobox size", () => {
  it.each([
    ["sm", "h-8"],
    ["md", "h-9"],
    ["lg", "h-11"],
  ] as const)("scales the control to %s", (size, height) => {
    mountCombobox({ size });
    expect(getAnchor().className).toContain(height);
  });

  it("falls back to the middle of the scale when no size is asked for", () => {
    mountCombobox();
    expect(getAnchor().className).toContain("h-9");
  });
});

describe("Combobox attribute routing", () => {
  it("merges a caller's class onto the control box, letting its width beat the default", () => {
    mountCombobox({}, { class: "w-28" });
    expect(getAnchor().className).toContain("w-28");
    expect(getAnchor().className).not.toContain("w-full");
  });

  it("routes every other fallthrough attribute onto the input, which is what a name describes", () => {
    mountCombobox({}, { "aria-label": "Language", "data-testid": "language-combobox" });
    const input = getInput();
    expect(input.getAttribute("aria-label")).toBe("Language");
    expect(input.getAttribute("data-testid")).toBe("language-combobox");
  });
});
