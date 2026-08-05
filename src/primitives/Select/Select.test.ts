import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import Select, { type SelectOption } from "./Select.vue";
import { LIST_STAGGER_STEP_MS, listStaggerDelay } from "../../lib/motion";
import { attachToBody } from "../../testing/attach-to-body";

const options: SelectOption[] = [
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

function mountSelect(props: Partial<InstanceType<typeof Select>["$props"]> = {}, attrs = {}) {
  return mount(Select, {
    props: { options, ...props },
    attrs,
    // Reka moves focus into the open list, and focus only works for a tree
    // that is actually in the document.
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
// pointerdown that opened the list cannot immediately close it, and both the
// closed-state item registry and the open-state autofocus settle a tick later
// again. Waiting for the macrotask is what lets the assertions read a settled
// component rather than one mid-flight.
async function settle() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

const TRIGGER = '[role="combobox"]';

function getTrigger(): HTMLElement {
  const trigger = document.querySelector<HTMLElement>(TRIGGER);
  if (!trigger) throw new Error("no trigger rendered");
  return trigger;
}

function getListbox(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="listbox"]');
}

function getOptions(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[role="option"]')];
}

// The whole click, not just its first half. Reka opens on pointerdown and then
// swallows the matching pointerup, which is what tells a click apart from a
// press-and-hold-to-pick gesture — so a test that stops at pointerdown leaves
// that swallow armed and the next row release is eaten instead of selecting.
async function openList() {
  const trigger = getTrigger();
  firePointer(trigger, "pointerdown");
  await settle();
  firePointer(trigger, "pointerup");
  await settle();
}

describe("Select listbox contract", () => {
  it("reports itself collapsed and renders no listbox until it is opened", async () => {
    mountSelect();
    await settle();
    expect(getTrigger().getAttribute("aria-expanded")).toBe("false");
    expect(getTrigger().getAttribute("data-state")).toBe("closed");
    expect(getListbox()).toBeNull();
  });

  it("opens on the trigger and points aria-controls at the listbox it opened", async () => {
    mountSelect();
    await openList();

    const trigger = getTrigger();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("data-state")).toBe("open");

    const listbox = getListbox();
    expect(listbox).not.toBeNull();
    expect(trigger.getAttribute("aria-controls")).toBe(listbox?.id);
  });

  it("opens from the keyboard so the control is reachable without a pointer", async () => {
    mountSelect();
    getTrigger().dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowDown" }),
    );
    await settle();

    expect(getTrigger().getAttribute("aria-expanded")).toBe("true");
    expect(getListbox()).not.toBeNull();
  });

  it("renders one option per row, in the order they were given", async () => {
    mountSelect();
    await openList();

    expect(getOptions().map((option) => option.textContent.trim())).toEqual([
      "English",
      "Tiếng Việt",
      "日本語",
    ]);
  });

  it("marks the chosen row selected and every other row not", async () => {
    mountSelect({ modelValue: "vi" });
    await openList();

    expect(getOptions().map((option) => option.getAttribute("aria-selected"))).toEqual([
      "false",
      "true",
      "false",
    ]);
    expect(getOptions().map((option) => option.getAttribute("data-state"))).toEqual([
      "unchecked",
      "checked",
      "unchecked",
    ]);
  });

  it("moves focus onto the active row rather than tracking it with aria-activedescendant", async () => {
    mountSelect({ modelValue: "en" });
    await openList();

    // Reka's Select moves real DOM focus between rows, so the active row is
    // `document.activeElement` and the trigger carries no
    // `aria-activedescendant`. A test asserting the attribute would pass only
    // by being vacuous, so the focus itself is what is pinned.
    expect(getTrigger().getAttribute("aria-activedescendant")).toBeNull();
    expect(document.activeElement).toBe(getOptions()[0]);
  });

  it("closes on Escape and hands focus back to the trigger", async () => {
    mountSelect();
    await openList();

    document.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" }),
    );
    await settle();

    expect(getListbox()).toBeNull();
    expect(getTrigger().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(getTrigger());
  });

  it("closes when a pointer lands outside it", async () => {
    mountSelect();
    await openList();

    const outside = attachToBody(document.createElement("button"));
    firePointer(outside, "pointerdown");
    await settle();

    expect(getListbox()).toBeNull();
    expect(getTrigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("jumps to the row whose label starts with the typed character", async () => {
    mountSelect({ modelValue: "en" });
    await openList();

    const listbox = getListbox();
    listbox?.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "T" }),
    );
    await settle();

    expect(document.activeElement).toBe(getOptions()[1]);
  });

  it("staggers the rows apart by the shared list step rather than a delay of its own", async () => {
    mountSelect();
    await openList();

    expect(getOptions().map((option) => option.style.animationDelay)).toEqual([
      listStaggerDelay(0),
      listStaggerDelay(1),
      listStaggerDelay(2),
    ]);
    // Pinned against the literal step too, so a helper that silently started
    // returning 0 for every row could not keep this green.
    expect(getOptions().map((option) => option.style.animationDelay)).toEqual([
      "0ms",
      `${String(LIST_STAGGER_STEP_MS)}ms`,
      `${String(LIST_STAGGER_STEP_MS * 2)}ms`,
    ]);
  });
});

describe("Select choice", () => {
  it("reports the chosen option's value and closes behind the choice", async () => {
    const wrapper = mountSelect({ modelValue: "en" });
    await openList();

    const row = getOptions()[1];
    if (!row) throw new Error("no second row");
    firePointer(row, "pointermove");
    firePointer(row, "pointerdown");
    firePointer(row, "pointerup");
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([["vi"]]);
    expect(getListbox()).toBeNull();
  });

  it("refuses a row marked disabled, choosing nothing and staying open", async () => {
    const wrapper = mountSelect({ modelValue: "en" });
    await openList();

    const row = getOptions()[2];
    if (!row) throw new Error("no third row");
    expect(row.getAttribute("aria-disabled")).toBe("true");
    expect(row.hasAttribute("data-disabled")).toBe(true);

    firePointer(row, "pointerdown");
    firePointer(row, "pointerup");
    await settle();

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(getListbox()).not.toBeNull();
  });

  it("shows the chosen option's label on the trigger, not its value", async () => {
    mountSelect({ modelValue: "vi" });
    await settle();
    expect(getTrigger().textContent).toContain("Tiếng Việt");
    expect(getTrigger().textContent).not.toContain("vi");
  });

  it("shows the placeholder while nothing is chosen, and flags it for styling", async () => {
    mountSelect({ placeholder: "Pick a language" });
    await settle();
    const trigger = getTrigger();
    expect(trigger.textContent).toContain("Pick a language");
    expect(trigger.querySelector("[data-placeholder]")).not.toBeNull();
  });

  it("follows a value the host changes underneath it", async () => {
    const wrapper = mountSelect({ modelValue: "en" });
    await wrapper.setProps({ modelValue: "vi" });
    expect(getTrigger().textContent).toContain("Tiếng Việt");
  });
});

describe("Select unavailable state", () => {
  it("refuses to open while disabled", async () => {
    mountSelect({ disabled: true });
    expect(getTrigger().hasAttribute("disabled")).toBe(true);

    await openList();
    expect(getListbox()).toBeNull();
    expect(getTrigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("paints the destructive border and announces the error while invalid", () => {
    mountSelect({ invalid: true });
    const trigger = getTrigger();
    expect(trigger.className).toContain("border-destructive");
    expect(trigger.getAttribute("aria-invalid")).toBe("true");
    expect(trigger.hasAttribute("data-invalid")).toBe(true);
  });

  it("stays quiet while valid, with no invalid marker to explain away", () => {
    mountSelect();
    const trigger = getTrigger();
    expect(trigger.className).not.toContain("border-destructive");
    expect(trigger.getAttribute("aria-invalid")).toBeNull();
    expect(trigger.hasAttribute("data-invalid")).toBe(false);
  });
});

describe("Select size", () => {
  it.each([
    ["sm", "h-8"],
    ["md", "h-9"],
    ["lg", "h-11"],
  ] as const)("scales the trigger to %s", (size, height) => {
    mountSelect({ size });
    expect(getTrigger().className).toContain(height);
  });

  it("falls back to the middle of the scale when no size is asked for", () => {
    mountSelect();
    expect(getTrigger().className).toContain("h-9");
  });
});

describe("Select attribute routing", () => {
  it("merges a caller's class onto the trigger, letting its width beat the default", () => {
    mountSelect({}, { class: "w-28" });
    const trigger = getTrigger();
    expect(trigger.className).toContain("w-28");
    expect(trigger.className).not.toContain("w-full");
  });

  it("routes every other fallthrough attribute onto the trigger, which is what they describe", () => {
    mountSelect({}, { "aria-label": "Language", "data-testid": "language-select" });
    const trigger = getTrigger();
    expect(trigger.getAttribute("aria-label")).toBe("Language");
    expect(trigger.getAttribute("data-testid")).toBe("language-select");
  });
});
