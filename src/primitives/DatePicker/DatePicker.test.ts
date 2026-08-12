import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref, type PropType, type VNode } from "vue";
import { getLocalTimeZone, today } from "@internationalized/date";
import DatePicker from "./DatePicker.vue";
import { provideFieldContext } from "../../lib/field-context";
import { provideLoomLabels, type LoomLabelOverrides } from "../../lib/labels";
import { attachToBody } from "../../testing/attach-to-body";

// The calendar is portalled to `document.body` and Reka drives it with real
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

// The calendar is portalled, so a test that only wipes `document.body` tears
// the nodes out from under a component that is still mounted and leaves Vue
// patching into a detached tree. Unmounting is what actually ends the test.
enableAutoUnmount(afterEach);

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
// pointerdown that opened the panel cannot immediately close it, and the
// portalled content's own focus scope settles a tick later again. Waiting for
// the macrotask is what lets the assertions read a settled component rather
// than one mid-flight.
async function settle() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

function mountPicker(props: Partial<InstanceType<typeof DatePicker>["$props"]> = {}, attrs = {}) {
  return mount(DatePicker, {
    props,
    attrs,
    // Reka moves focus into the open calendar, and focus only works for a tree
    // that is actually in the document.
    attachTo: document.body,
  });
}

function getField(): HTMLElement {
  const field = document.querySelector<HTMLElement>('[role="group"]');
  if (!field) throw new Error("no field rendered");
  return field;
}

/** The control's outermost element, which is what the popover anchors to. */
function getAnchor(): HTMLElement {
  const anchor = getField().parentElement;
  if (!anchor) throw new Error("no anchor rendered");
  return anchor;
}

/** The editable segments only — Reka renders the separators as segments too. */
function getSegments(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[role="spinbutton"]')];
}

/**
 * The calendar button found by position rather than by name. Its name is now
 * one of the things under test — a host can replace it — so a selector that
 * reads the name cannot be the one that finds it.
 */
function getTrigger(): HTMLButtonElement {
  const trigger = getField().querySelector("button");
  if (!trigger) throw new Error("no trigger rendered");
  return trigger;
}

/**
 * The visually-hidden `<input>` Reka puts inside the field group — the element
 * that carries the control's `id` and `name`, and the one a `<label for>` can
 * name, a `role="group"` div not being labelable.
 */
function getFormInput(): HTMLInputElement {
  const input = getField().querySelector("input");
  if (!input) throw new Error("no form input rendered");
  return input;
}

// A stand-in for the Field wrapping this control. Field's own behaviour — which
// id it mints, when it publishes a description — is pinned in `Field.test.ts`;
// what matters here is the other half, that this control reads a row at all.
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

function mountRow(rowProps: Record<string, unknown>, control: VNode) {
  return mount(ProbeRow, { props: rowProps, slots: { default: control }, attachTo: document.body });
}

function getGrid(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="grid"]');
}

function getPanel(): HTMLElement {
  const panel = getGrid()?.closest<HTMLElement>("[data-state]");
  if (!panel) throw new Error("no open panel");
  return panel;
}

function getDays(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>("[data-reka-calendar-cell-trigger]")];
}

function getDay(iso: string): HTMLElement {
  const day = document.querySelector<HTMLElement>(`[data-value="${iso}"]`);
  if (!day) throw new Error(`no cell for ${iso}`);
  return day;
}

function getCellOf(day: HTMLElement): HTMLElement {
  const cell = day.closest<HTMLElement>('[role="gridcell"]');
  if (!cell) throw new Error("cell trigger is not inside a gridcell");
  return cell;
}

async function openCalendar() {
  getTrigger().click();
  await settle();
}

// `code` as well as `key`, and neither is optional: Reka's field navigation
// switches on `event.key` while its calendar navigation switches on
// `event.code`, so an event carrying only one of them silently exercises half
// the component.
function pressKey(el: EventTarget, key: string) {
  el.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key, code: key }),
  );
}

const ISO = "2026-03-14";

describe("DatePicker field", () => {
  it("renders one spinbutton per date part, each with its own accessible name", async () => {
    mountPicker({ modelValue: ISO });
    await settle();

    // Capitalised because these are Loom's names, not Reka's: Reka writes
    // `"month, "`, `"day,"` and `"year, "` into its own render function, and
    // asserting the capitalisation is what pins whose string reached the DOM.
    const named = getSegments().map((segment) => segment.getAttribute("aria-label"));
    expect(named).toEqual(["Month", "Day", "Year"]);
  });

  it("shows the bound date across the segments rather than as one string", async () => {
    mountPicker({ modelValue: ISO });
    await settle();

    expect(getSegments().map((segment) => segment.textContent.trim())).toEqual(["3", "14", "2026"]);
  });

  it("orders the segments the way the locale writes a date", async () => {
    const wrapper = mountPicker({ modelValue: ISO, locale: "en-GB" });
    await settle();
    expect(getSegments().map((segment) => segment.textContent.trim())).toEqual([
      "14",
      "03",
      "2026",
    ]);

    await wrapper.setProps({ locale: "en-US" });
    await settle();
    expect(getSegments().map((segment) => segment.textContent.trim())).toEqual(["3", "14", "2026"]);
  });

  it("is a single Tab stop, with the segments roving inside it", async () => {
    mountPicker({ modelValue: ISO });
    await settle();

    expect(getSegments().map((segment) => segment.getAttribute("tabindex"))).toEqual([
      "0",
      "-1",
      "-1",
    ]);
  });

  it("moves the Tab stop with focus as the arrow keys walk the segments", async () => {
    mountPicker({ modelValue: ISO });
    await settle();

    const [month, day] = getSegments();
    if (!month || !day) throw new Error("expected month and day segments");
    month.focus();
    pressKey(month, "ArrowRight");
    await settle();

    expect(document.activeElement).toBe(day);
    // The point of the roving stop: Shift+Tab back into the field returns to
    // the segment the reader left, not to the first one.
    expect(getSegments().map((segment) => segment.getAttribute("tabindex"))).toEqual([
      "-1",
      "0",
      "-1",
    ]);
  });

  it("types a segment and reports the completed date as an ISO string", async () => {
    const wrapper = mountPicker({ modelValue: ISO });
    await settle();

    const [, day] = getSegments();
    if (!day) throw new Error("expected a day segment");
    day.focus();
    pressKey(day, "ArrowUp");
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([["2026-03-15"]]);
  });

  it("names the whole control once, on the group the segments sit in", async () => {
    mountPicker({ modelValue: ISO }, { "aria-label": "Due date" });
    await settle();

    expect(getField().getAttribute("aria-label")).toBe("Due date");
    // Not repeated onto each segment, which would have a screen reader
    // announce "Due date" three times for one field.
    expect(getSegments().some((segment) => segment.hasAttribute("aria-label"))).toBe(true);
    expect(
      getSegments().every((segment) => segment.getAttribute("aria-label") !== "Due date"),
    ).toBe(true);
  });
});

describe("DatePicker ISO boundary", () => {
  it("selects exactly the day the ISO string names", async () => {
    mountPicker({ modelValue: ISO });
    await openCalendar();

    const selected = getDays().filter((day) => day.hasAttribute("data-selected"));
    expect(selected.map((day) => day.getAttribute("data-value"))).toEqual([ISO]);
    expect(getCellOf(getDay(ISO)).getAttribute("aria-selected")).toBe("true");
  });

  it("reports the day that was clicked back as an ISO string", async () => {
    const wrapper = mountPicker({ modelValue: ISO });
    await openCalendar();

    getDay("2026-03-20").click();
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([["2026-03-20"]]);
  });

  it("chooses a day in the month it is showing when nothing is bound at all", async () => {
    const wrapper = mountPicker();
    await openCalendar();

    const iso = today(getLocalTimeZone()).set({ day: 1 }).toString();
    getDay(iso).click();
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([[iso]]);
  });

  it("hands back a Gregorian ISO string even where the locale reads another calendar", async () => {
    // `th-TH` resolves to the Buddhist calendar, so Reka's own placeholder —
    // and every `data-value` in the grid — is a Buddhist date whose
    // `toString()` is a perfectly well-formed ISO string for the wrong year.
    // The boundary conversion is the only thing standing between that and a
    // host storing 2569 as a due date.
    const wrapper = mountPicker({ locale: "th-TH" });
    await openCalendar();

    const day = document.querySelector<HTMLElement>("[data-today]");
    expect(day).not.toBeNull();
    day?.click();
    await settle();

    const now = today(getLocalTimeZone());
    // The field really is reading the other calendar — the year segment says
    // so — and the value handed back is still the Gregorian one.
    expect(getSegments().at(-1)?.textContent.trim()).toBe(String(now.year + 543));
    expect(wrapper.emitted("update:modelValue")).toEqual([[now.toString()]]);
  });

  it("reads a value that does not parse as no date chosen, rather than throwing", async () => {
    mountPicker({ modelValue: "14/03/2026" });
    await openCalendar();

    expect(getDays().some((day) => day.hasAttribute("data-selected"))).toBe(false);
    expect(getSegments().every((segment) => segment.hasAttribute("data-placeholder"))).toBe(true);
  });

  it("reads an empty value as no date chosen", async () => {
    mountPicker({ modelValue: "" });
    await openCalendar();

    expect(getDays().some((day) => day.hasAttribute("data-selected"))).toBe(false);
  });

  it("reports no value at all once the field has been emptied", async () => {
    const wrapper = mountPicker({ modelValue: ISO });
    await settle();

    const [, day] = getSegments();
    if (!day) throw new Error("expected a day segment");
    day.focus();
    // Two presses: the first drops a digit, the second empties the segment,
    // and an empty segment is what makes the whole date no date.
    pressKey(day, "Backspace");
    pressKey(day, "Backspace");
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([undefined]);
  });

  it("follows a value the host changes underneath it", async () => {
    const wrapper = mountPicker({ modelValue: ISO });
    await wrapper.setProps({ modelValue: "2026-03-25" });
    await openCalendar();

    const selected = getDays().filter((day) => day.hasAttribute("data-selected"));
    expect(selected.map((day) => day.getAttribute("data-value"))).toEqual(["2026-03-25"]);
  });
});

describe("DatePicker calendar", () => {
  it("renders a real grid with a full week of day-of-week headers", async () => {
    mountPicker({ modelValue: ISO });
    await openCalendar();

    expect(getGrid()).not.toBeNull();
    expect(document.querySelectorAll("th")).toHaveLength(7);
    expect(getDays().length % 7).toBe(0);
  });

  it("names the grid with the month heading, and announces the heading when it moves", async () => {
    mountPicker({ modelValue: ISO });
    await openCalendar();

    const heading = document.getElementById(getGrid()?.getAttribute("aria-labelledby") ?? "");
    expect(heading).not.toBeNull();
    expect(heading?.getAttribute("aria-live")).toBe("polite");

    const before = heading?.textContent;
    document.querySelector<HTMLElement>('[aria-label="Next month"]')?.click();
    await settle();

    expect(heading?.textContent).not.toBe(before);
  });

  it("gives the month buttons names rather than leaving them as bare glyphs", async () => {
    mountPicker({ modelValue: ISO });
    await openCalendar();

    const prev = document.querySelector<HTMLElement>('[aria-label="Previous month"]');
    const next = document.querySelector<HTMLElement>('[aria-label="Next month"]');
    expect(prev?.textContent.trim()).toBe("");
    expect(next?.textContent.trim()).toBe("");
  });

  it("tells today, the chosen day and an out-of-bounds day apart without using colour", async () => {
    const now = today(getLocalTimeZone());
    mountPicker({ modelValue: now.toString(), min: now.toString() });
    await openCalendar();

    const chosen = getDay(now.toString());
    expect(chosen.getAttribute("aria-current")).toBe("date");
    expect(getCellOf(chosen).getAttribute("aria-selected")).toBe("true");

    const before = getDay(now.subtract({ days: 1 }).toString());
    expect(before.getAttribute("aria-disabled")).toBe("true");
    expect(before.getAttribute("aria-current")).toBeNull();
    expect(getCellOf(before).getAttribute("aria-selected")).toBeNull();
  });

  it("keeps a day outside the bounds unreachable by keyboard", async () => {
    const now = today(getLocalTimeZone());
    mountPicker({ min: now.toString() });
    await openCalendar();

    expect(getDay(now.subtract({ days: 1 }).toString()).hasAttribute("tabindex")).toBe(false);
    expect(getDay(now.toString()).getAttribute("tabindex")).toBe("0");
  });

  it("moves the grid's own single Tab stop with the arrow keys", async () => {
    mountPicker({ modelValue: ISO });
    await openCalendar();

    const start = getDay(ISO);
    start.focus();
    pressKey(start, "ArrowRight");
    await settle();

    expect(document.activeElement).toBe(getDay("2026-03-15"));
  });

  it("still opens when the whole visible month is out of bounds", async () => {
    mountPicker({ min: "2099-01-01" });
    await openCalendar();

    // No day can hold the grid's roving stop here, which is exactly the case
    // that would strand the open-focus handler on a null element.
    expect(getGrid()).not.toBeNull();
    expect(getDays().some((day) => day.getAttribute("tabindex") === "0")).toBe(false);
  });

  it("brings the cells in with the panel rather than staggering them", async () => {
    mountPicker({ modelValue: ISO });
    await openCalendar();

    // A 42-cell grid rippling in cell by cell reads as a rendering glitch, so
    // the panel is the only thing that animates and the cells arrive with it.
    expect(getDays().every((day) => day.style.animationDelay === "")).toBe(true);
  });

  it("scopes the panel's entrance animation to the open state", async () => {
    mountPicker({ modelValue: ISO });
    await openCalendar();

    const classes = getPanel().className.split(/\s+/);
    // Unconditional, the closed panel never re-fires the animation, Reka never
    // unmounts it, and an invisible overlay is left eating clicks.
    expect(classes).toContain("data-[state=open]:animate-fade-rise");
    expect(classes).not.toContain("animate-fade-rise");
  });
});

describe("DatePicker overlay focus", () => {
  it("opens onto the day the calendar is already sitting on", async () => {
    mountPicker({ modelValue: ISO });
    await openCalendar();

    expect(document.activeElement).toBe(getDay(ISO));
  });

  it("closes behind the chosen day and hands focus back to the trigger", async () => {
    mountPicker({ modelValue: ISO });
    await openCalendar();

    getDay("2026-03-20").click();
    await settle();

    expect(getGrid()).toBeNull();
    expect(document.activeElement).toBe(getTrigger());
  });

  it("closes on Escape and hands focus back to the trigger", async () => {
    mountPicker({ modelValue: ISO });
    await openCalendar();

    pressKey(document, "Escape");
    await settle();

    expect(getGrid()).toBeNull();
    expect(getTrigger().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(getTrigger());
  });

  it("closes when a pointer lands outside it", async () => {
    mountPicker({ modelValue: ISO });
    await openCalendar();

    const outside = attachToBody(document.createElement("button"));
    firePointer(outside, "pointerdown");
    await settle();

    expect(getGrid()).toBeNull();
    expect(getTrigger().getAttribute("aria-expanded")).toBe("false");
  });
});

describe("DatePicker unavailable and invalid", () => {
  it("refuses to open while disabled, and leaves nothing in the tab order", async () => {
    mountPicker({ modelValue: ISO, disabled: true });
    await settle();

    expect(getTrigger().disabled).toBe(true);
    expect(getSegments().some((segment) => segment.hasAttribute("tabindex"))).toBe(false);

    await openCalendar();
    expect(getGrid()).toBeNull();
  });

  it("paints the destructive border and announces the error while invalid", async () => {
    mountPicker({ modelValue: ISO, invalid: true });
    await settle();

    const field = getField();
    expect(field.className).toContain("border-destructive");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    // On the anchor, not the field: Reka spells its own out-of-range marker
    // `data-invalid` on the field group already.
    expect(getAnchor().hasAttribute("data-invalid")).toBe(true);
  });

  it("stays quiet while valid, with no invalid marker to explain away", async () => {
    mountPicker({ modelValue: ISO });
    await settle();

    const field = getField();
    expect(field.className).not.toContain("border-destructive");
    expect(field.getAttribute("aria-invalid")).toBeNull();
  });
});

describe("DatePicker attribute routing", () => {
  it("merges a caller's class onto the anchor, so it sizes the whole control", async () => {
    mountPicker({ modelValue: ISO }, { class: "max-w-xs" });
    await settle();

    expect(getAnchor().className).toContain("max-w-xs");
    expect(getField().className).not.toContain("max-w-xs");
  });

  it("routes every other fallthrough attribute onto the field group it describes", async () => {
    mountPicker({ modelValue: ISO }, { "aria-describedby": "due-hint", "data-testid": "due-date" });
    await settle();

    const field = getField();
    expect(field.getAttribute("aria-describedby")).toBe("due-hint");
    expect(field.getAttribute("data-testid")).toBe("due-date");
  });
});

describe("DatePicker read-only", () => {
  it("keeps a read-only field a Tab stop and its segments readable, where a disabled one is neither", async () => {
    mountPicker({ modelValue: ISO, readonly: true });
    await settle();

    // The whole difference between the two states: a read-only date is a value
    // on show and a reader still arrows across it to read it.
    expect(getSegments().map((segment) => segment.getAttribute("tabindex"))).toEqual([
      "0",
      "-1",
      "-1",
    ]);
    expect(getField().hasAttribute("data-readonly")).toBe(true);
    expect(getSegments().map((segment) => segment.textContent.trim())).toEqual(["3", "14", "2026"]);
  });

  it("refuses the edit a read-only field is showing", async () => {
    const wrapper = mountPicker({ modelValue: ISO, readonly: true });
    await settle();

    const [, day] = getSegments();
    if (!day) throw new Error("expected a day segment");
    day.focus();
    pressKey(day, "ArrowUp");
    await settle();

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(getSegments().map((segment) => segment.textContent.trim())).toEqual(["3", "14", "2026"]);
  });

  it("drops the calendar button while read-only rather than offering a panel that can choose nothing", async () => {
    mountPicker({ modelValue: ISO, readonly: true });
    await settle();

    expect(document.querySelector('[aria-label="Open calendar"]')).toBeNull();
  });

  it("shows a read-only field as filled rather than dimmed, so it does not read as unavailable", async () => {
    const readOnly = mountPicker({ modelValue: ISO, readonly: true });
    await settle();
    expect(getField().className).toContain("bg-muted");
    expect(getField().className).not.toContain("opacity-50");
    // Off the document before the next mount: `getField()` reads the first
    // group in it, and two pickers at once would answer for each other.
    readOnly.unmount();

    mountPicker({ modelValue: ISO, disabled: true });
    await settle();
    expect(getField().className).toContain("opacity-50");
    expect(getField().className).not.toContain("bg-muted");
    expect(getField().hasAttribute("data-readonly")).toBe(false);
  });
});

describe("DatePicker inside a Field", () => {
  it("takes its id, description, name, required and invalid state from the row it sits in", async () => {
    mountRow(
      {
        controlId: "due",
        describedBy: "due-description",
        name: "due",
        required: true,
        invalid: true,
      },
      h(DatePicker, { modelValue: ISO }),
    );
    await settle();

    // `id` and `name` reach the hidden input the field submits through, which is
    // what makes the row's `<label for>` resolve to a labelable element.
    expect(getFormInput().id).toBe("due");
    expect(getFormInput().name).toBe("due");
    // Everything announced belongs on the group, which a screen reader reads
    // once on entering the field rather than once per segment.
    const field = getField();
    expect(field.getAttribute("aria-describedby")).toBe("due-description");
    expect(field.getAttribute("aria-required")).toBe("true");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(getSegments().some((segment) => segment.hasAttribute("aria-describedby"))).toBe(false);
    expect(getAnchor().hasAttribute("data-invalid")).toBe(true);
  });

  it("takes disabled and readonly from the row, each with its own consequence", async () => {
    mountRow({ disabled: true }, h(DatePicker, { modelValue: ISO }));
    await settle();
    expect(getSegments().some((segment) => segment.hasAttribute("tabindex"))).toBe(false);
    expect(getTrigger().disabled).toBe(true);

    const readOnly = mountRow({ readonly: true }, h(DatePicker, { modelValue: ISO }));
    await settle();
    expect(readOnly.find("[data-readonly]").exists()).toBe(true);
    expect(readOnly.find('[aria-label="Open calendar"]').exists()).toBe(false);
  });

  it("lets an explicit prop overrule the row in both directions", async () => {
    const optedOut = mountRow(
      { invalid: true, required: true, disabled: true, readonly: true },
      h(DatePicker, {
        modelValue: ISO,
        invalid: false,
        required: false,
        disabled: false,
        readonly: false,
      }),
    );
    await settle();
    const optedOutField = optedOut.get('[role="group"]');
    expect(optedOutField.attributes("aria-invalid")).toBeUndefined();
    expect(optedOutField.attributes("aria-required")).toBeUndefined();
    expect(optedOut.find('[aria-label="Open calendar"]').exists()).toBe(true);
    expect(
      optedOut.findAll('[role="spinbutton"]').some((segment) => segment.attributes("tabindex")),
    ).toBe(true);
    optedOut.unmount();

    const optedIn = mountRow({}, h(DatePicker, { modelValue: ISO, invalid: true, required: true }));
    await settle();
    const optedInField = optedIn.get('[role="group"]');
    expect(optedInField.attributes("aria-invalid")).toBe("true");
    expect(optedInField.attributes("aria-required")).toBe("true");
  });

  it("adds the row's description to one the caller already set rather than replacing it", async () => {
    mountRow(
      { describedBy: "due-description" },
      h(DatePicker, { modelValue: ISO, "aria-describedby": "sprint-rules" }),
    );
    await settle();

    expect(getField().getAttribute("aria-describedby")).toBe("sprint-rules due-description");
  });

  it("keeps the caller's own id and name ahead of the row's", async () => {
    mountRow(
      { controlId: "row-id", name: "row-name" },
      h(DatePicker, { modelValue: ISO, id: "mine", name: "mine" }),
    );
    await settle();

    // The row's generated id clobbering the caller's would break their
    // `<label for>`, their selectors and browser autofill all at once.
    expect(getFormInput().id).toBe("mine");
    expect(getFormInput().name).toBe("mine");
  });

  it("renders exactly what it renders outside a Field when there is no row above it", async () => {
    mountPicker({ modelValue: ISO });
    await settle();

    const field = getField();
    expect(field.hasAttribute("aria-describedby")).toBe(false);
    expect(field.hasAttribute("aria-required")).toBe(false);
    expect(field.hasAttribute("aria-invalid")).toBe(false);
    expect(field.hasAttribute("data-readonly")).toBe(false);
    expect(getFormInput().hasAttribute("id")).toBe(false);
    expect(getFormInput().hasAttribute("name")).toBe(false);
    expect(getAnchor().hasAttribute("data-invalid")).toBe(false);
  });
});

// A host declaring a vocabulary, with the source left reactive on purpose:
// `provideLoomLabels` takes a getter so that a language switch repaints, and
// only a reactive source can pin that.
const LabelHost = defineComponent({
  props: {
    vocabulary: {
      type: Function as PropType<() => LoomLabelOverrides>,
      default: (): LoomLabelOverrides => ({}),
    },
  },
  setup(props, { slots }) {
    provideLoomLabels(() => props.vocabulary());
    return () => h("div", slots.default?.());
  },
});

function mountUnder(vocabulary: () => LoomLabelOverrides, node: VNode) {
  return mount(LabelHost, {
    props: { vocabulary },
    slots: { default: () => node },
    attachTo: document.body,
  });
}

function segmentNames(): (string | null)[] {
  return getSegments().map((segment) => segment.getAttribute("aria-label"));
}

describe("DatePicker labels", () => {
  it("names every segment and every control in English with no vocabulary above it", async () => {
    mountPicker({ modelValue: ISO });
    await settle();
    await openCalendar();

    expect(segmentNames()).toEqual(["Month", "Day", "Year"]);
    expect(getTrigger().getAttribute("aria-label")).toBe("Open calendar");
    expect(document.querySelector('[aria-label="Previous month"]')).not.toBeNull();
    expect(document.querySelector('[aria-label="Next month"]')).not.toBeNull();
  });

  it("replaces the name Reka gives the calendar itself, which is not a literal but a prop", async () => {
    mountPicker({ modelValue: ISO });
    await settle();
    await openCalendar();

    // Reka's own default is `"Event Date"`, published both here and in a
    // visually-hidden live region it renders itself — so a fallthrough
    // attribute could not have reached it and the prop is the only way in.
    const named = [...document.querySelectorAll("[aria-label]")].map((el) =>
      el.getAttribute("aria-label"),
    );
    expect(named.some((name) => name?.startsWith("Calendar,"))).toBe(true);
    expect(named.some((name) => name?.startsWith("Event Date"))).toBe(false);
  });

  it("takes an instance's own labels prop over its English, key by key", async () => {
    mountPicker({ modelValue: ISO, labels: { day: "Ngày", openCalendar: "Mở lịch" } });
    await settle();

    expect(segmentNames()).toEqual(["Month", "Ngày", "Year"]);
    // The keys the prop did not name stay English rather than blanking out —
    // an unnamed spinbutton is the worst available reading of a partial bag.
    expect(getTrigger().getAttribute("aria-label")).toBe("Mở lịch");
  });

  it("takes a host's vocabulary for both of its slots", async () => {
    mountUnder(
      () => ({
        dateSegments: { month: "Tháng", day: "Ngày", year: "Năm" },
        calendarPanel: { openCalendar: "Mở lịch", previousMonth: "Tháng trước" },
      }),
      h(DatePicker, { modelValue: ISO }),
    );
    await settle();
    await openCalendar();

    expect(segmentNames()).toEqual(["Tháng", "Ngày", "Năm"]);
    expect(getTrigger().getAttribute("aria-label")).toBe("Mở lịch");
    expect(document.querySelector('[aria-label="Tháng trước"]')).not.toBeNull();
    expect(document.querySelector('[aria-label="Next month"]')).not.toBeNull();
  });

  it("lets the instance's prop beat the host's vocabulary", async () => {
    mountUnder(
      () => ({ calendarPanel: { openCalendar: "Mở lịch" } }),
      h(DatePicker, { modelValue: ISO, labels: { openCalendar: "Chọn ngày" } }),
    );
    await settle();

    expect(getTrigger().getAttribute("aria-label")).toBe("Chọn ngày");
  });

  it("repaints every name when the host switches language under it", async () => {
    const locale = ref("en");
    mountUnder(
      () =>
        locale.value === "en"
          ? {}
          : { dateSegments: { day: "Ngày" }, calendarPanel: { openCalendar: "Mở lịch" } },
      h(DatePicker, { modelValue: ISO }),
    );
    await settle();
    expect(getTrigger().getAttribute("aria-label")).toBe("Open calendar");

    locale.value = "vi";
    await settle();

    // This is the assertion that fails the moment a label is resolved once in
    // `setup` instead of inside the render effect — a change that passes every
    // other test here and breaks every language switch.
    expect(segmentNames()).toEqual(["Month", "Ngày", "Year"]);
    expect(getTrigger().getAttribute("aria-label")).toBe("Mở lịch");
  });

  it("reads an explicitly undefined override as no opinion rather than as a blank name", async () => {
    mountPicker({ modelValue: ISO, labels: { day: undefined } });
    await settle();

    expect(segmentNames()).toEqual(["Month", "Day", "Year"]);
  });
});
