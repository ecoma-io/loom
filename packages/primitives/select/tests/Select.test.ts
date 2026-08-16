import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, type VNode } from "vue";
import Select, { type SelectOption } from "../src/Select.vue";
import { provideFieldContext } from "@ecoma-io/loom-labels";
import { LIST_STAGGER_STEP_MS, listStaggerDelay } from "@ecoma-io/loom-core";
import { attachToBody } from "../../../../packages/core/src/testing/attach-to-body";

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

// Every element that wraps text, anywhere under `root`. The rule these tests
// pin is one line — **an `opacity` may dim a border, a fill or a glyph, and may
// never dim text** — and it is a property of the tree rather than of any one
// class name, so it is asserted by walking the tree rather than by naming the
// class that happened to break it. A variant-prefixed utility sits in
// `classList` whatever the element's current state is, so this catches
// `disabled:opacity-50` on a node holding a label without the label's control
// having to be disabled first.
function textNodesCarryingOpacity(root: ParentNode): string[] {
  return [...root.querySelectorAll<HTMLElement>("*")]
    .filter((el) => el.textContent.trim() !== "")
    .filter((el) => [...el.classList].some((name) => /(^|:)opacity-/.test(name)))
    .map((el) => el.className);
}

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

  it("drains the disabled trigger in measured colours instead of dimming the label it carries", async () => {
    const wrapper = mountSelect({ modelValue: "vi", disabled: true });
    await settle();
    const trigger = getTrigger();

    // The chosen value is the one thing a reader still needs from a control
    // they cannot change, so it has to survive the unavailable state legibly.
    expect(trigger.textContent).toContain("Tiếng Việt");
    // Three channels rather than one: the fill drains, the label goes to the
    // muted colour, and the rim slackens from `input` to the lighter `border`.
    // Two of the three are `disabled:` variants so they outrank the resting
    // colours on specificity; the border is plain so `cn()` can order it under
    // the destructive rim, which the invalid case below pins.
    expect(trigger.className).toContain("disabled:bg-muted");
    expect(trigger.className).toContain("disabled:text-muted-foreground");
    expect(trigger.classList.contains("border-border")).toBe(true);
    expect(trigger.classList.contains("border-input")).toBe(false);

    // The whole tree, not just the trigger: the fix is worthless if the dim
    // simply moved to an ancestor of the same words.
    expect(textNodesCarryingOpacity(document.body)).toEqual([]);
    wrapper.unmount();
  });

  it("keeps the destructive rim on a trigger that is both invalid and unavailable", () => {
    // The disabled rule and the invalid rule both name a border colour and
    // `cn()` resolves that by order, so this pins the order: an error that
    // stops being visible the moment the control goes unavailable is an error
    // nobody can act on.
    mountSelect({ modelValue: "vi", disabled: true, invalid: true });
    const trigger = getTrigger();
    expect(trigger.classList.contains("border-destructive")).toBe(true);
    expect(trigger.classList.contains("border-border")).toBe(false);
    expect(trigger.className).toContain("disabled:bg-muted");
  });

  it("never lifts the trigger to the fill that marks a value on show", () => {
    // The documented decision, pinned: a row's `readonly` is ignored here,
    // because a closed list has nothing to show that the trigger is not already
    // showing. So the library's three resting appearances collapse to two, and
    // the middle fill must never reach this control from any direction.
    mountSelect({ modelValue: "vi" });
    const trigger = getTrigger();
    expect(trigger.classList.contains("bg-background")).toBe(true);
    // `hover:bg-subtle` is a pointer state and is expected; a resting or a
    // read-only-driven `bg-subtle` is not.
    expect(trigger.classList.contains("bg-subtle")).toBe(false);
  });

  it("dims no text on any row of the open list, including the one nobody can choose", async () => {
    // The rows are portalled, so they only exist to be walked once the list is
    // open — and the unchoosable row is where the defect used to live.
    mountSelect({ modelValue: "en" });
    await openList();
    expect(getOptions()).toHaveLength(3);
    expect(textNodesCarryingOpacity(document.body)).toEqual([]);
  });

  it("mutes an unchoosable row on its own text node, where a checked row's colour cannot outrank it", async () => {
    mountSelect({ modelValue: "ja" });
    await openList();

    // The third row is both disabled and the chosen one — the case that made
    // the container the wrong home for the colour, since `data-[disabled]:`
    // sorts ahead of `data-[state=checked]:` and would have lost.
    const row = getOptions()[2];
    if (!row) throw new Error("no third row");
    expect(row.getAttribute("data-state")).toBe("checked");

    const label = [...row.querySelectorAll("*")].find((el) => el.textContent === "日本語");
    expect(label?.className).toContain("text-muted-foreground");
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

// The trigger is the only part of this control that is not portalled, so every
// assertion below is scoped to the mounted row rather than to `document` —
// which is what lets one test mount two rows and compare them.
function mountRow(
  rowProps: Partial<InstanceType<typeof ProbeRow>["$props"]> = {},
  control: VNode = h(Select, { options }),
  into: Element = document.body,
) {
  return mount(ProbeRow, {
    props: rowProps,
    slots: { default: control },
    attachTo: into,
  });
}

describe("Select inside a Field", () => {
  it("takes its id, description, required and invalid state from the row it sits in", () => {
    const row = mountRow({
      controlId: "language",
      describedBy: "language-description",
      required: true,
      invalid: true,
    });
    const trigger = row.get(TRIGGER);

    expect(trigger.attributes("id")).toBe("language");
    expect(trigger.attributes("aria-describedby")).toBe("language-description");
    expect(trigger.attributes("aria-required")).toBe("true");
    expect(trigger.attributes("aria-invalid")).toBe("true");
    expect(trigger.attributes("data-invalid")).toBeDefined();
  });

  it("refuses to open inside a disabled row, the same as it does for its own prop", async () => {
    const row = mountRow({ disabled: true });
    expect(row.get(TRIGGER).attributes("disabled")).toBeDefined();

    await openList();
    expect(getListbox()).toBeNull();
  });

  it("ignores the row's read-only, leaving the trigger open-able and unlifted", async () => {
    // The documented decision, pinned from both sides: a read-only Select would
    // be a disabled Select that lies about being reachable, so a row's
    // `readonly` changes neither the behaviour nor the fill. Rows holding a
    // value nobody may edit want `disabled`, or no control at all.
    const row = mountRow({ readonly: true });
    const trigger = row.get(TRIGGER);
    expect(trigger.classes()).toContain("bg-background");
    expect(trigger.classes()).not.toContain("bg-subtle");

    await openList();
    expect(getListbox()).not.toBeNull();
  });

  it("lets an explicit prop overrule the row in both directions", () => {
    const optedOut = mountRow(
      { invalid: true, disabled: true },
      h(Select, { options, invalid: false, disabled: false }),
    );
    const optedOutTrigger = optedOut.get(TRIGGER);
    expect(optedOutTrigger.attributes("aria-invalid")).toBeUndefined();
    expect(optedOutTrigger.attributes("data-invalid")).toBeUndefined();
    expect(optedOutTrigger.attributes("disabled")).toBeUndefined();

    const optedIn = mountRow({}, h(Select, { options, invalid: true }));
    expect(optedIn.get(TRIGGER).attributes("aria-invalid")).toBe("true");
  });

  it("keeps a caller's own id, so the row never moves a label or a selector they published", () => {
    const row = mountRow(
      { controlId: "language" },
      h(Select, { options, id: "chosen-by-the-host" }),
    );
    expect(row.get(TRIGGER).attributes("id")).toBe("chosen-by-the-host");
  });

  it("adds the row's description to one the caller already set rather than replacing it", () => {
    const row = mountRow(
      { describedBy: "language-description" },
      h(Select, { options, "aria-describedby": "shortcut-hint" }),
    );
    expect(row.get(TRIGGER).attributes("aria-describedby")).toBe(
      "shortcut-hint language-description",
    );
  });

  it("posts the chosen value under the row's name, and nothing under it while nothing is chosen", async () => {
    const form = attachToBody(document.createElement("form"));
    const row = mountRow({ name: "language" }, h(Select, { options, modelValue: "vi" }), form);
    await settle();

    // A trigger is a `<button type="button">`, whose `name` no submission has
    // ever included, so the value travels in a hidden input instead.
    const submitted = form.querySelector<HTMLInputElement>('input[name="language"]');
    expect(submitted?.value).toBe("vi");
    expect(row.get(TRIGGER).attributes("name")).toBeUndefined();

    // The empty case is the one a native `<select>` gets wrong: it always
    // resolves to one of its options, so it would post "en" here.
    row.unmount();
    mountRow({ name: "language" }, h(Select, { options, placeholder: "Choose" }), form);
    await settle();
    expect(form.querySelector<HTMLInputElement>('input[name="language"]')?.value).toBe("");
  });

  it("publishes the row's required state on the trigger, which is the node a reader lands on", () => {
    // Reka pins `aria-required` to the root's own prop and its as-child merge
    // lets that declaration beat any attribute passed in, so this is the one
    // resolved value that has to travel as a prop rather than in the bag —
    // spread onto the trigger it would be dropped without a word.
    const required = mountRow({ required: true });
    expect(required.get(TRIGGER).attributes("aria-required")).toBe("true");

    const optional = mountRow({});
    expect(optional.get(TRIGGER).attributes("aria-required")).toBe("false");
  });

  it("adds nothing at all when there is no row above it", () => {
    const bare = mount(Select, { props: { options }, attachTo: document.body });
    const trigger = bare.get(TRIGGER);

    expect(trigger.attributes("id")).toBeUndefined();
    expect(trigger.attributes("name")).toBeUndefined();
    expect(trigger.attributes("aria-describedby")).toBeUndefined();
    expect(trigger.attributes("aria-invalid")).toBeUndefined();
    expect(trigger.attributes("data-invalid")).toBeUndefined();
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
