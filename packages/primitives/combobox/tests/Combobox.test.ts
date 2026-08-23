import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref, type PropType, type VNode } from "vue";
import Combobox, { type ComboboxOption } from "../src/Combobox.vue";
import { provideFieldContext } from "@ecoma-io/loom-labels";
import { provideLoomLabels, type LoomLabelOverrides } from "@ecoma-io/loom-labels";
import { LIST_STAGGER_STEP_MS, listStaggerDelay } from "@ecoma-io/loom-core";
import { attachToBody } from "@ecoma-io/loom-core/testing";

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

// Every element that wraps text, anywhere under `root`. The rule these tests
// pin is one line — **an `opacity` may dim a border, a fill or a glyph, and may
// never dim text** — and it is a property of the tree rather than of any one
// class name, so it is asserted by walking the tree rather than by naming the
// class that happened to break it. A variant-prefixed utility sits in
// `classList` whatever the element's current state is, so this catches
// `data-[disabled]:opacity-50` on a node holding a label without that row
// having to be the disabled one.
function textNodesCarryingOpacity(root: ParentNode): string[] {
  return [...root.querySelectorAll<HTMLElement>("*")]
    .filter((el) => el.textContent.trim() !== "")
    .filter((el) => [...el.classList].some((name) => /(^|:)opacity-/.test(name)))
    .map((el) => el.className);
}

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

  it("drains the disabled box in measured colours instead of dimming the value inside it", async () => {
    mountCombobox({ modelValue: "vi", disabled: true });
    await settle();

    // The chosen value is the one thing a reader still needs from a control
    // they cannot change, so it has to survive the unavailable state legibly.
    expect(getInput().value).toBe("Tiếng Việt");
    expect(getAnchor().className).toContain("bg-muted");
    expect(getAnchor().className).not.toContain("opacity-50");
    expect(getInput().className).toContain("disabled:text-muted-foreground");
    // The hairline is the second channel. A fill and a text colour are both
    // hue, and a reader who cannot resolve `muted` from `background` is left
    // with nothing; the border weight is a difference in shape.
    expect(getAnchor().className).toContain("border-border");
  });

  it("keeps the resting hairline and the plain fill while it is available", async () => {
    mountCombobox({ modelValue: "vi" });
    await settle();

    expect(getAnchor().className).toContain("border-input");
    expect(getAnchor().className).not.toContain("bg-muted");
  });

  it("dims no text anywhere, including on the row nobody can choose", async () => {
    mountCombobox({ modelValue: "en" });
    await openList();

    expect(getRows()).toHaveLength(3);
    expect(textNodesCarryingOpacity(document.body)).toEqual([]);
  });

  it("mutes an unchoosable row on its own text node, where a checked row's colour cannot outrank it", async () => {
    // The third row is both disabled and the chosen one — the case that made
    // the row itself the wrong home for the colour, since `data-[disabled]:`
    // sorts ahead of `data-[state=checked]:` and would have lost.
    mountCombobox({ modelValue: "ja" });
    await openList();

    const row = getRows()[2];
    if (!row) throw new Error("no third row");
    expect(row.getAttribute("data-state")).toBe("checked");

    const label = [...row.querySelectorAll("*")].find((el) => el.textContent === "日本語");
    expect(label?.className).toContain("text-muted-foreground");
  });
});

/**
 * What the box *shows*: the tokens and the overflow summary, in order. Direct
 * children of the anchor only, and the screen-reader count is left out on
 * purpose — the whole point of these assertions is that the visible row and the
 * announced total say different things.
 */
function getTokens(): string[] {
  return [...getAnchor().children]
    .filter((el) => el.tagName !== "INPUT" && el.tagName !== "BUTTON")
    .filter((el) => !el.classList.contains("sr-only"))
    .map((el) => el.textContent.trim());
}

async function choose(index: number) {
  const row = getRows()[index];
  if (!row) throw new Error(`no row at ${String(index)}`);
  firePointer(row, "pointermove");
  row.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  await settle();
}

describe("Combobox multi-select", () => {
  it("tells a screen reader the list takes more than one value", async () => {
    mountCombobox({ multiple: true });
    await openList();

    expect(getListbox()?.getAttribute("aria-multiselectable")).toBe("true");
  });

  it("says the opposite while single-select, so the two modes are distinguishable", async () => {
    mountCombobox();
    await openList();

    expect(getListbox()?.getAttribute("aria-multiselectable")).toBe("false");
  });

  it("keeps the list open on a choice and toggles the row rather than closing behind it", async () => {
    const wrapper = mountCombobox({ multiple: true });
    await openList();

    await choose(1);
    expect(getListbox()).not.toBeNull();
    expect(getRows()[1]?.getAttribute("aria-selected")).toBe("true");

    // The same row again takes it back out — the whole reason the list stays
    // open is that a chosen row is still a control.
    await choose(1);
    expect(getListbox()).not.toBeNull();
    expect(getRows()[1]?.getAttribute("aria-selected")).toBe("false");

    expect(wrapper.emitted("update:modelValue")).toEqual([[["vi"]], [[]]]);
  });

  it("emits the whole selection every time, never a delta", async () => {
    const wrapper = mountCombobox({ multiple: true });
    await openList();
    await choose(0);
    await choose(1);

    expect(wrapper.emitted("update:modelValue")).toEqual([[["en"]], [["en", "vi"]]]);
  });

  it("emits a bare string in single-select, so a host bound to one value is unaffected", async () => {
    const wrapper = mountCombobox();
    await openList();
    await choose(1);

    expect(wrapper.emitted("update:modelValue")).toEqual([["vi"]]);
  });

  it("still closes on Escape and on a pointer landing outside it", async () => {
    mountCombobox({ multiple: true, modelValue: ["en"] });
    await openList();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" }),
    );
    await settle();
    expect(getListbox()).toBeNull();

    await openList();
    const outside = attachToBody(document.createElement("button"));
    firePointer(outside, "pointerdown");
    await settle();
    expect(getListbox()).toBeNull();
  });

  it("shows the chosen values as tokens in the box, by label rather than by value", async () => {
    mountCombobox({ multiple: true, modelValue: ["en", "vi"] });
    await settle();

    expect(getTokens()).toContain("English");
    expect(getTokens()).toContain("Tiếng Việt");
    // The input is a search box in this mode, not a display of the choice.
    expect(getInput().value).toBe("");
  });

  it("shows the tokens for a choice it is managing itself, with no v-model bound", async () => {
    mountCombobox({ multiple: true });
    await openList();
    await choose(1);

    expect(getTokens()).toContain("Tiếng Việt");
  });

  it("falls back to the value when the host's narrowed list no longer describes it", async () => {
    // A host-driven search hands back only the rows matching the current
    // query, so a value chosen from an earlier one has no label to look up. A
    // token that vanished while the value was still in the model would be the
    // control lying about what it holds.
    mountCombobox({ multiple: true, modelValue: ["en"], options: [], filter: false });
    await settle();

    expect(getTokens()).toContain("en");
  });

  it("collapses the tail into a count rather than growing the box, at five and at fifty", async () => {
    const many = Array.from({ length: 50 }, (_, index) => ({
      value: `v${String(index)}`,
      label: `Option ${String(index)}`,
    }));

    const five = mountCombobox({
      multiple: true,
      options: many,
      modelValue: ["v0", "v1", "v2", "v3", "v4"],
    });
    await settle();
    expect(getTokens()).toContain("Option 0");
    expect(getTokens()).toContain("Option 2");
    expect(getTokens()).not.toContain("Option 3");
    expect(getTokens()).toContain("+2 more");
    five.unmount();

    mountCombobox({
      multiple: true,
      options: many,
      modelValue: many.map((option) => option.value),
    });
    await settle();
    // Three tokens either way: the box sits in a form row on a fixed height
    // scale, so the selection may not size it.
    expect(getTokens().filter((token) => token.startsWith("Option "))).toHaveLength(3);
    expect(getTokens()).toContain("+47 more");
  });

  it("lets a caller set how many tokens the box shows before the count takes over", async () => {
    mountCombobox({ multiple: true, visibleValues: 2, modelValue: ["en", "vi", "ja"] });
    await settle();

    expect(getTokens()).toEqual(["English", "Tiếng Việt", "+1 more"]);
  });

  it("publishes the size of the selection to a screen reader, describing the input with it", async () => {
    mountCombobox({ multiple: true, modelValue: ["en", "vi"] });
    await settle();

    const described = getInput().getAttribute("aria-describedby");
    expect(described).not.toBeNull();
    const count = document.getElementById(described ?? "");
    expect(count?.textContent.trim()).toBe("2 selected");
    // Neither the tokens nor the overflow count is announced on its own, so
    // this is the only thing that carries the total.
    expect(count?.className).toContain("sr-only");
  });

  it("says nothing of the sort while single-select", async () => {
    mountCombobox({ modelValue: "vi" });
    await settle();

    expect(getInput().getAttribute("aria-describedby")).toBeNull();
  });

  it("stays one Tab stop: the token row holds no control of its own", async () => {
    mountCombobox({ multiple: true, modelValue: ["en", "vi"] });
    await settle();

    // Deliberately unlike TagsInput, whose tokens carry a remove button. Here
    // the list is where a value is unchosen, which is also what keeps a value
    // behind the overflow count reachable by the same gesture as a visible one.
    const buttons = [...getAnchor().querySelectorAll("button")];
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.getAttribute("aria-haspopup")).toBe("listbox");
  });

  it("drops the placeholder once a value is chosen, where it would claim the box is empty", async () => {
    mountCombobox({ multiple: true, placeholder: "Search languages" });
    await settle();
    expect(getInput().getAttribute("placeholder")).toBe("Search languages");

    await openList();
    await choose(0);
    expect(getInput().getAttribute("placeholder")).toBeNull();
  });

  it("keeps the typed query through a toggle, so one search can pick several rows", async () => {
    mountCombobox({ multiple: true });
    await openList();
    await type("ti");
    expect(labels()).toEqual(["Tiếng Việt"]);

    await choose(0);
    expect(getInput().value).toBe("ti");
    expect(getListbox()).not.toBeNull();
  });

  it("names the count and the overflow from the labels prop, taking the numbers rather than a string", async () => {
    mountCombobox({
      multiple: true,
      modelValue: ["en", "vi", "ja"],
      visibleValues: 1,
      labels: {
        count: ({ count }) => `đã chọn ${String(count)}`,
        overflow: ({ hidden }) => `còn ${String(hidden)}`,
      },
    });
    await settle();

    expect(getTokens()).toContain("còn 2");
    const described = getInput().getAttribute("aria-describedby");
    expect(document.getElementById(described ?? "")?.textContent.trim()).toBe("đã chọn 3");
  });

  it("drains its tokens with the box rather than dimming them, while disabled", async () => {
    mountCombobox({ multiple: true, modelValue: ["en"], disabled: true });
    await settle();

    expect(getTokens()).toContain("English");
    expect(getAnchor().className).toContain("bg-muted");
    expect(getAnchor().className).toContain("border-border");
    expect(textNodesCarryingOpacity(getAnchor())).toEqual([]);
  });

  it("keeps the box on the shared height scale, as a floor rather than a fixed height", async () => {
    mountCombobox({ multiple: true, modelValue: ["en", "vi"] });
    await settle();

    // `min-h-9` and not `h-9`: tokens are content and content sizes the box —
    // TagsInput's call. What bounds it is `visibleValues`, since the token row
    // never wraps.
    expect(getAnchor().className).toContain("min-h-9");
    expect(getAnchor().className).not.toMatch(/(^|\s)h-9(\s|$)/);
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

// A stand-in for the Field wrapping this control. Field itself is a
// project-internal collaborator, and its own behaviour — which id it mints,
// when it publishes a description — is pinned in `Field.test.ts`. What matters
// here is the other half: that this control reads a row it is inside at all.
const ProbeRow = defineComponent({
  props: {
    controlId: { type: String, default: undefined },
    describedBy: { type: String, default: undefined },
    name: { type: String, default: undefined },
    required: { type: Boolean, default: undefined },
    invalid: { type: Boolean, default: undefined },
    disabled: { type: Boolean, default: undefined },
    readonly: { type: Boolean, default: undefined },
  },
  setup(props, { slots }) {
    provideFieldContext({
      controlId: () => props.controlId,
      describedBy: () => props.describedBy,
      name: () => props.name,
      required: () => props.required,
      invalid: () => props.invalid,
      disabled: () => props.disabled,
      readonly: () => props.readonly,
    });
    return () => h("div", slots.default?.());
  },
});

// Only the listbox is portalled, so the input and the anchor are inside the
// mounted row — which is what lets one test mount two rows and compare them
// instead of reaching for whichever the document happens to hold first.
function mountRow(
  rowProps: Partial<InstanceType<typeof ProbeRow>["$props"]> = {},
  control: VNode = h(Combobox, { options }),
  into: Element = document.body,
) {
  return mount(ProbeRow, {
    props: rowProps,
    slots: { default: control },
    attachTo: into,
  });
}

const ROW_INPUT = 'input[role="combobox"]';

describe("Combobox inside a Field", () => {
  it("takes its id, description, required and invalid state from the row it sits in", () => {
    const row = mountRow({
      controlId: "country",
      describedBy: "country-description",
      required: true,
      invalid: true,
    });
    const input = row.get(ROW_INPUT);

    expect(input.attributes("id")).toBe("country");
    expect(input.attributes("aria-describedby")).toBe("country-description");
    expect(input.attributes("aria-required")).toBe("true");
    expect(input.attributes("aria-invalid")).toBe("true");
    // The border is painted on the box around the input, so the row's error
    // has to reach that node too rather than only the input inside it.
    expect(row.find("[data-invalid]").exists()).toBe(true);
  });

  it("refuses to open inside a disabled row, the same as it does for its own prop", async () => {
    const row = mountRow({ disabled: true });
    expect(row.get(ROW_INPUT).attributes("disabled")).toBeDefined();

    await openList();
    expect(getListbox()).toBeNull();
  });

  it("lets an explicit prop overrule the row in both directions", () => {
    const optedOut = mountRow(
      { invalid: true, disabled: true },
      h(Combobox, { options, invalid: false, disabled: false }),
    );
    expect(optedOut.get(ROW_INPUT).attributes("aria-invalid")).toBeUndefined();
    expect(optedOut.get(ROW_INPUT).attributes("disabled")).toBeUndefined();
    expect(optedOut.find("[data-invalid]").exists()).toBe(false);

    const optedIn = mountRow({}, h(Combobox, { options, invalid: true }));
    expect(optedIn.get(ROW_INPUT).attributes("aria-invalid")).toBe("true");
  });

  it("keeps a caller's own id, so the row never moves a label or a selector they published", () => {
    const row = mountRow(
      { controlId: "country" },
      h(Combobox, { options, id: "chosen-by-the-host" }),
    );
    expect(row.get(ROW_INPUT).attributes("id")).toBe("chosen-by-the-host");
  });

  it("adds the row's description to one the caller already set rather than replacing it", () => {
    const row = mountRow(
      { describedBy: "country-description" },
      h(Combobox, { options, "aria-describedby": "search-hint" }),
    );
    expect(row.get(ROW_INPUT).attributes("aria-describedby")).toBe(
      "search-hint country-description",
    );
  });

  it("posts the chosen value under the row's name, never the label the input is showing", async () => {
    const form = attachToBody(document.createElement("form"));
    const row = mountRow({ name: "language" }, h(Combobox, { options, modelValue: "vi" }), form);
    await settle();

    // The whole reason the row's name is given to the root rather than spread
    // onto the input with the rest of the resolved bag: the input holds the
    // *label*, so a `name` on it would post "Tiếng Việt" where the model
    // carries `vi`.
    expect(row.get(ROW_INPUT).attributes("name")).toBeUndefined();
    expect((row.get(ROW_INPUT).element as HTMLInputElement).value).toBe("Tiếng Việt");
    const submitted = form.querySelector<HTMLInputElement>('input[name="language"]');
    expect(submitted?.value).toBe("vi");
  });

  it("adds nothing at all when there is no row above it", () => {
    const bare = mount(Combobox, { props: { options }, attachTo: document.body });
    const input = bare.get(ROW_INPUT);

    expect(input.attributes("id")).toBeUndefined();
    expect(input.attributes("name")).toBeUndefined();
    expect(input.attributes("aria-describedby")).toBeUndefined();
    expect(input.attributes("aria-required")).toBeUndefined();
    expect(input.attributes("aria-invalid")).toBeUndefined();
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

/** A host declaring an application-wide vocabulary above the control. */
const LabelHost = defineComponent({
  props: {
    vocabulary: { type: Function as PropType<() => LoomLabelOverrides>, required: true },
  },
  setup(props, { slots }) {
    provideLoomLabels(() => props.vocabulary());
    return () => h("div", slots.default?.());
  },
});

describe("Combobox labels", () => {
  it("names the chevron from its own English, replacing the one Reka writes", async () => {
    mountCombobox();
    await settle();
    // Reka's own is `Show popup`, written inside its render function with no
    // prop to reach it by. A dropped binding falls back to that rather than to
    // an unnamed button, which is why the wording differs deliberately.
    expect(getTrigger().getAttribute("aria-label")).toBe("Show options");
  });

  it("replaces the chevron's name and the empty row when a caller hands it a bag", async () => {
    mountCombobox({ labels: { trigger: "Hiện danh sách", empty: "Không có kết quả" } });
    await openList();
    expect(getTrigger().getAttribute("aria-label")).toBe("Hiện danh sách");
    // Replacing the name leaves everything else Reka publishes about the
    // button intact — the override is not a whole-props takeover.
    expect(getTrigger().getAttribute("aria-expanded")).toBe("true");

    await type("zzz");
    expect(labels()).toEqual(["Không có kết quả"]);
  });

  it("keeps the key a caller left out in English instead of blanking it", async () => {
    mountCombobox({ labels: { trigger: "Hiện danh sách" } });
    await openList();
    await type("zzz");
    expect(labels()).toEqual(["No results"]);
  });

  it("lets `emptyMessage` beat the resolved label, because it is one box's wording", async () => {
    mountCombobox({
      emptyMessage: "No language by that name",
      labels: { empty: "Không có kết quả" },
    });
    await openList();
    await type("zzz");
    // The prop is the per-box correction and the label is what every other box
    // says, so the prop has to win where both are set.
    expect(labels()).toEqual(["No language by that name"]);
  });

  it("takes its names from a host's vocabulary, and lets one instance correct one key", async () => {
    mount(LabelHost, {
      attachTo: document.body,
      props: {
        vocabulary: () => ({ combobox: { trigger: "Hiện danh sách", empty: "Trống" } }),
      },
      slots: {
        default: () => [h(Combobox, { options, labels: { trigger: "Chọn quốc gia" } })],
      },
    });
    await settle();
    expect(getTrigger().getAttribute("aria-label")).toBe("Chọn quốc gia");

    await openList();
    await type("zzz");
    // The vocabulary still reaches the key the instance did not touch.
    expect(labels()).toEqual(["Trống"]);
  });

  it("repaints the chevron's name when the host switches language under it", async () => {
    const locale = ref("en");
    mount(LabelHost, {
      attachTo: document.body,
      props: {
        vocabulary: () =>
          locale.value === "en" ? {} : { combobox: { trigger: "Hiện danh sách" } },
      },
      slots: { default: () => h(Combobox, { options }) },
    });
    await settle();
    expect(getTrigger().getAttribute("aria-label")).toBe("Show options");

    locale.value = "vi";
    await nextTick();

    // The assertion that fails the moment a label is read once in `setup`
    // instead of through `text.` inside the render.
    expect(getTrigger().getAttribute("aria-label")).toBe("Hiện danh sách");
  });
});
