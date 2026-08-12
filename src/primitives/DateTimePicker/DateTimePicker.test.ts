import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref, type PropType, type VNode } from "vue";
import { getLocalTimeZone, today } from "@internationalized/date";
import DateTimePicker from "./DateTimePicker.vue";
import { provideFieldContext } from "../../lib/field-context";
import { provideLoomLabels, type LoomLabelOverrides } from "../../lib/labels";
import { attachToBody } from "../../testing/attach-to-body";

// The calendar is portalled to `document.body` and Reka drives it with real
// pointer capture, focus and layout APIs, none of which jsdom implements. Each
// is stubbed to the shape Reka reads rather than mocked away, so the library
// itself stays the real thing under test — the same set DatePicker needs.
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

// The calendar is portalled, so wiping `document.body` alone would tear the
// nodes out from under a component that is still mounted. Unmounting is what
// actually ends the test.
enableAutoUnmount(afterEach);

// `@vue/test-utils`' `trigger` builds a plain `Event` and assigns the extra keys
// onto it, which throws on `MouseEvent.button` — a getter with no setter. Reka
// reads `button` to tell a primary click from any other.
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

// Reka defers several steps past the render queue on purpose: the dismiss layer
// registers its document listener on a `setTimeout(0)` so the pointerdown that
// opened the panel cannot immediately close it, and the portalled content's
// focus scope settles a tick later again.
async function settle() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

function mountPicker(
  props: Partial<InstanceType<typeof DateTimePicker>["$props"]> = {},
  attrs = {},
) {
  return mount(DateTimePicker, {
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

function getSegment(part: string): HTMLElement {
  const segment = document.querySelector<HTMLElement>(`[data-reka-date-field-segment="${part}"]`);
  if (!segment) throw new Error(`no ${part} segment rendered`);
  return segment;
}

// Capitalised because these are Loom's names, not Reka's: Reka writes
// `"month, "`, `"hour, "` and their siblings into its own render function, and
// asserting the capitalisation is what pins whose string reached the DOM.
function segmentNames(): (string | null)[] {
  return getSegments().map((segment) => segment.getAttribute("aria-label"));
}

function segmentValues(): string[] {
  return getSegments().map((segment) => segment.textContent.trim());
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

/** Cells carry the whole instant as their value, so a day is matched by prefix. */
function getDay(isoDay: string): HTMLElement {
  const day = document.querySelector<HTMLElement>(`[data-value^="${isoDay}T"]`);
  if (!day) throw new Error(`no cell for ${isoDay}`);
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
// `event.code`, so an event carrying only one silently exercises half of it.
function pressKey(el: EventTarget, key: string) {
  el.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key, code: key }),
  );
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

const ISO = "2026-03-14T09:30";

describe("DateTimePicker field", () => {
  it("renders one spinbutton per date and time part, each with its own accessible name", async () => {
    mountPicker({ modelValue: ISO, hourCycle: 24 });
    await settle();

    expect(segmentNames()).toEqual(["Month", "Day", "Year", "Hour", "Minute"]);
  });

  it("shows the bound instant across the segments rather than as one string", async () => {
    mountPicker({ modelValue: ISO, hourCycle: 24 });
    await settle();

    expect(segmentValues()).toEqual(["3", "14", "2026", "09", "30"]);
  });

  it("orders the segments the way the locale writes an instant", async () => {
    const wrapper = mountPicker({ modelValue: ISO, locale: "en-GB", hourCycle: 24 });
    await settle();
    expect(segmentValues()).toEqual(["14", "03", "2026", "09", "30"]);

    await wrapper.setProps({ locale: "en-US" });
    await settle();
    expect(segmentValues()).toEqual(["3", "14", "2026", "09", "30"]);
  });

  it("is a single Tab stop across the date and the time alike", async () => {
    mountPicker({ modelValue: ISO, hourCycle: 24 });
    await settle();

    expect(getSegments().map((segment) => segment.getAttribute("tabindex"))).toEqual([
      "0",
      "-1",
      "-1",
      "-1",
      "-1",
    ]);
  });

  it("moves the Tab stop with focus as the arrow keys walk from the date into the time", async () => {
    mountPicker({ modelValue: ISO, hourCycle: 24 });
    await settle();

    const year = getSegment("year");
    year.focus();
    pressKey(year, "ArrowRight");
    await settle();

    expect(document.activeElement).toBe(getSegment("hour"));
    // The point of the roving stop: Shift+Tab back into the field returns to the
    // segment the reader left, not to the month it starts at.
    expect(getSegments().map((segment) => segment.getAttribute("tabindex"))).toEqual([
      "-1",
      "-1",
      "-1",
      "0",
      "-1",
    ]);
  });

  it("grows an AM/PM segment on a 12-hour cycle and none on a 24-hour one", async () => {
    const wrapper = mountPicker({ modelValue: ISO, hourCycle: 12 });
    await settle();
    expect(segmentNames()).toContain("AM or PM");

    await wrapper.setProps({ hourCycle: 24 });
    await settle();
    expect(segmentNames()).not.toContain("AM or PM");
  });

  it("announces the hour as the reader sees it, not as the value stores it", async () => {
    mountPicker({ modelValue: "2026-03-14T13:30", hourCycle: 12 });
    await settle();

    const hour = getSegment("hour");
    // Reka publishes `aria-valuenow` off the internal 24-hour value while
    // declaring the range as 1–12, so half past one announces as "13 PM".
    expect(hour.textContent.trim()).toBe("1");
    expect(hour.getAttribute("aria-valuenow")).toBe("1");
    expect(hour.getAttribute("aria-valuetext")).toBe("1 PM");
  });

  it("leaves the hour placeholder alone rather than announcing a number it is not showing", async () => {
    // Nothing chosen, so there is no hour to rewrite — and `Number("hh")` is
    // the one input that would otherwise publish `aria-valuenow="NaN"`.
    mountPicker({ hourCycle: 12 });
    await settle();

    const hour = getSegment("hour");
    expect(hour.hasAttribute("data-placeholder")).toBe(true);
    expect(hour.getAttribute("aria-valuenow")).not.toBe("NaN");
  });

  it("keeps a tab stop when the segment holding it is taken away", async () => {
    const wrapper = mountPicker({
      modelValue: "2026-03-14T09:30:45",
      granularity: "second",
      hourCycle: 24,
    });
    await settle();
    getSegment("second").focus();
    await settle();

    await wrapper.setProps({ granularity: "minute" });
    await settle();

    // A field remembering a segment that no longer exists is a field with no tab
    // stop at all, which is a field a keyboard cannot reach.
    expect(
      getSegments().filter((segment) => segment.getAttribute("tabindex") === "0"),
    ).toHaveLength(1);
  });

  it("names the whole control once, on the group the segments sit in", async () => {
    mountPicker({ modelValue: ISO }, { "aria-label": "Send at" });
    await settle();

    expect(getField().getAttribute("aria-label")).toBe("Send at");
    // Not repeated onto each segment, which would have a screen reader announce
    // "Send at" five times for one field.
    expect(getSegments().every((segment) => segment.getAttribute("aria-label") !== "Send at")).toBe(
      true,
    );
  });
});

describe("DateTimePicker ISO boundary", () => {
  it("reports a typed change as a local ISO date-time string", async () => {
    const wrapper = mountPicker({ modelValue: ISO, hourCycle: 24 });
    await settle();

    const minute = getSegment("minute");
    minute.focus();
    pressKey(minute, "ArrowUp");
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([["2026-03-14T09:31"]]);
  });

  it("carries no timezone, offset or seconds it never showed", async () => {
    const wrapper = mountPicker({ modelValue: ISO, hourCycle: 24 });
    await settle();

    getSegment("day").focus();
    pressKey(getSegment("day"), "ArrowUp");
    await settle();

    const emitted = wrapper.emitted("update:modelValue")?.at(-1)?.at(0);
    expect(emitted).toBe("2026-03-15T09:30");
    expect(emitted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("reports seconds only where the granularity asks for them", async () => {
    const wrapper = mountPicker({
      modelValue: "2026-03-14T09:30:45",
      granularity: "second",
      hourCycle: 24,
    });
    await settle();

    expect(segmentNames()).toEqual(["Month", "Day", "Year", "Hour", "Minute", "Second"]);

    getSegment("second").focus();
    pressKey(getSegment("second"), "ArrowUp");
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([["2026-03-14T09:30:46"]]);
  });

  it("drops the seconds it is not showing rather than reporting a value nobody could see", async () => {
    const wrapper = mountPicker({ modelValue: "2026-03-14T09:30:45", hourCycle: 24 });
    await settle();

    expect(segmentNames()).not.toContain("Second");

    getSegment("minute").focus();
    pressKey(getSegment("minute"), "ArrowUp");
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([["2026-03-14T09:31"]]);
  });

  it("reads a bare date as midnight on that day", async () => {
    mountPicker({ modelValue: "2026-03-14", hourCycle: 24 });
    await settle();

    expect(segmentValues()).toEqual(["3", "14", "2026", "00", "00"]);
  });

  it("reads a value that does not parse as nothing chosen, rather than throwing", async () => {
    // An absolute instant is not this component's value, and `parseDateTime`
    // refuses the `Z` rather than silently dropping it.
    mountPicker({ modelValue: "2026-03-14T09:30:00Z" });
    await openCalendar();

    expect(getDays().some((day) => day.hasAttribute("data-selected"))).toBe(false);
    // Every segment the reader has to fill. Reka seeds AM/PM to "AM" rather
    // than leaving it empty, so it is never a placeholder to begin with.
    expect(
      getSegments()
        .filter((segment) => segment.dataset.rekaDateFieldSegment !== "dayPeriod")
        .every((segment) => segment.hasAttribute("data-placeholder")),
    ).toBe(true);
  });

  it("reads an empty value as nothing chosen", async () => {
    mountPicker({ modelValue: "" });
    await openCalendar();

    expect(getDays().some((day) => day.hasAttribute("data-selected"))).toBe(false);
  });

  it("reports no value at all once the field has been emptied", async () => {
    const wrapper = mountPicker({ modelValue: ISO, hourCycle: 24 });
    await settle();

    const minute = getSegment("minute");
    minute.focus();
    // Two presses: the first drops a digit, the second empties the segment, and
    // an empty segment is what makes the whole instant no instant.
    pressKey(minute, "Backspace");
    pressKey(minute, "Backspace");
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([undefined]);
  });

  it("hands back a Gregorian ISO string even where the locale reads another calendar", async () => {
    // `th-TH` resolves to the Buddhist calendar, so every `data-value` in the
    // grid is a Buddhist date whose `toString()` is a well-formed ISO string for
    // the wrong year. The boundary conversion is the only thing between that and
    // a host storing 2569 as a send time.
    const wrapper = mountPicker({ locale: "th-TH" });
    await openCalendar();

    const day = document.querySelector<HTMLElement>("[data-today]");
    expect(day).not.toBeNull();
    day?.click();
    await settle();

    const now = today(getLocalTimeZone());
    expect(getSegment("year").textContent.trim()).toBe(String(now.year + 543));
    expect(wrapper.emitted("update:modelValue")).toEqual([[`${now.toString()}T00:00`]]);
  });

  it("follows a value the host changes underneath it", async () => {
    const wrapper = mountPicker({ modelValue: ISO, hourCycle: 24 });
    await wrapper.setProps({ modelValue: "2026-03-25T16:45" });
    await settle();

    expect(segmentValues()).toEqual(["3", "25", "2026", "16", "45"]);
  });
});

// The round trip is the whole component: two halves of one value, each entered
// through a different path, and each path is a chance to throw the other half
// away.
describe("DateTimePicker round trip between the day and the time", () => {
  it("keeps the time already entered when a day is picked out of the calendar", async () => {
    const wrapper = mountPicker({ modelValue: ISO, hourCycle: 24 });
    await openCalendar();

    getDay("2026-03-20").click();
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([["2026-03-20T09:30"]]);
  });

  it("keeps the time across a day picked in a different month", async () => {
    const wrapper = mountPicker({ modelValue: ISO, hourCycle: 24 });
    await openCalendar();

    document.querySelector<HTMLElement>('[aria-label="Next month"]')?.click();
    await settle();
    getDay("2026-04-02").click();
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([["2026-04-02T09:30"]]);
  });

  it("keeps the day already chosen when the time is typed", async () => {
    const wrapper = mountPicker({ modelValue: ISO, hourCycle: 24 });
    await settle();

    const hour = getSegment("hour");
    hour.focus();
    pressKey(hour, "ArrowUp");
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([["2026-03-14T10:30"]]);
  });

  it("keeps the time through a full pick, echo and re-pick", async () => {
    const wrapper = mountPicker({ modelValue: ISO, hourCycle: 24 });
    await openCalendar();

    getDay("2026-03-20").click();
    await settle();
    // The host echoing the emitted value back down is what a real `v-model`
    // does, and the second pick is where a placeholder that failed to follow
    // would quietly hand back midnight.
    await wrapper.setProps({ modelValue: "2026-03-20T09:30" });
    await openCalendar();
    getDay("2026-03-21").click();
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["2026-03-21T09:30"]);
  });

  it("keeps the seconds too, at second granularity", async () => {
    const wrapper = mountPicker({
      modelValue: "2026-03-14T09:30:45",
      granularity: "second",
      hourCycle: 24,
    });
    await openCalendar();

    getDay("2026-03-20").click();
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([["2026-03-20T09:30:45"]]);
  });

  // Observed, and not fixed here: with the date segments still empty, a time
  // typed into the field is not part of any value yet — Reka publishes a model
  // value only once every segment is filled, and holds the half-entered time in
  // a `segmentValues` ref it does not expose. So the calendar's cells still
  // carry the placeholder's midnight, and the model update that follows the
  // click resyncs the segments from it, overwriting what was typed. Reading the
  // time back out of the rendered segments is the only handle from out here, and
  // it means parsing locale-formatted digits back into numbers — a worse defect
  // than the one it fixes. Filling the day first, by typing or from the
  // calendar, is unaffected, which is the path the segment order already leads.
  it.todo("keeps a time typed before any day was chosen");

  it("means midnight when a day is chosen before any time is", async () => {
    // The honest default, and the one a reader has to be able to predict: a
    // deadline set to "Friday" is Friday at 00:00, never "some time on Friday".
    const wrapper = mountPicker({ hourCycle: 24 });
    await openCalendar();

    const iso = today(getLocalTimeZone()).set({ day: 1 }).toString();
    getDay(iso).click();
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([[`${iso}T00:00`]]);
  });
});

describe("DateTimePicker instant bounds", () => {
  it("leaves the boundary day choosable even when the held time falls outside the bound", async () => {
    // The bound is an instant, so 16 March is choosable from 09:00 to 17:00 —
    // but the grid cell carries the field's current time, 18:30. Bounding the
    // calendar by the instant would disable the one day the reader wants, for a
    // reason nothing on screen explains.
    mountPicker({
      modelValue: "2026-03-16T18:30",
      min: "2026-03-16T09:00",
      max: "2026-03-16T17:00",
    });
    await openCalendar();

    const boundary = getDay("2026-03-16");
    expect(boundary.getAttribute("aria-disabled")).toBeNull();
    expect(boundary.getAttribute("tabindex")).toBe("0");
  });

  it("disables a day that lies wholly outside the bounds, and skips it by keyboard", async () => {
    mountPicker({
      modelValue: "2026-03-16T12:00",
      min: "2026-03-16T09:00",
      max: "2026-03-16T17:00",
    });
    await openCalendar();

    const before = getDay("2026-03-15");
    const after = getDay("2026-03-17");
    expect(before.getAttribute("aria-disabled")).toBe("true");
    expect(after.getAttribute("aria-disabled")).toBe("true");
    expect(before.hasAttribute("tabindex")).toBe(false);
    expect(getCellOf(before).getAttribute("aria-selected")).toBeNull();
  });

  it("flags an instant outside the bounds on a day the calendar allowed", async () => {
    // The half the calendar gave up. Without this, "the right day, an hour
    // late" looks perfectly well-formed while being unschedulable.
    mountPicker({
      modelValue: "2026-03-16T18:30",
      min: "2026-03-16T09:00",
      max: "2026-03-16T17:00",
    });
    await settle();

    expect(getField().getAttribute("aria-invalid")).toBe("true");
    expect(getField().className).toContain("border-destructive");
    // A separate marker from the host's own `invalid`, because they are separate
    // claims about the same control.
    expect(getAnchor().hasAttribute("data-out-of-range")).toBe(true);
    expect(getAnchor().hasAttribute("data-invalid")).toBe(false);
  });

  it("flags an instant before the lower bound as readily as one after the upper", async () => {
    const wrapper = mountPicker({ modelValue: "2026-03-16T08:00", min: "2026-03-16T09:00" });
    await settle();
    expect(getAnchor().hasAttribute("data-out-of-range")).toBe(true);

    await wrapper.setProps({ modelValue: "2026-03-16T09:00" });
    await settle();
    expect(getAnchor().hasAttribute("data-out-of-range")).toBe(false);
    expect(getField().getAttribute("aria-invalid")).toBeNull();
  });

  it("stays quiet when no bounds were given at all", async () => {
    mountPicker({ modelValue: ISO });
    await settle();

    expect(getAnchor().hasAttribute("data-out-of-range")).toBe(false);
    expect(getField().getAttribute("aria-invalid")).toBeNull();
  });

  it("holds no opinion about an unparseable value against a bound", async () => {
    mountPicker({ modelValue: "not an instant", min: "2026-03-16T09:00" });
    await settle();

    expect(getAnchor().hasAttribute("data-out-of-range")).toBe(false);
  });
});

describe("DateTimePicker calendar", () => {
  it("renders a real grid with a full week of day-of-week headers", async () => {
    mountPicker({ modelValue: ISO });
    await openCalendar();

    expect(getGrid()).not.toBeNull();
    expect(document.querySelectorAll("th")).toHaveLength(7);
    expect(getDays().length % 7).toBe(0);
  });

  it("selects exactly the day the instant names", async () => {
    mountPicker({ modelValue: ISO });
    await openCalendar();

    const selected = getDays().filter((day) => day.hasAttribute("data-selected"));
    expect(selected).toHaveLength(1);
    expect(getCellOf(getDay("2026-03-14")).getAttribute("aria-selected")).toBe("true");
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

  it("marks today without using colour, on the day rather than the instant", async () => {
    const now = today(getLocalTimeZone());
    mountPicker({ modelValue: `${now.toString()}T09:30` });
    await openCalendar();

    const chosen = getDay(now.toString());
    expect(chosen.getAttribute("aria-current")).toBe("date");
    expect(getCellOf(chosen).getAttribute("aria-selected")).toBe("true");
  });

  it("moves the grid's own single Tab stop with the arrow keys", async () => {
    mountPicker({ modelValue: ISO });
    await openCalendar();

    const start = getDay("2026-03-14");
    start.focus();
    pressKey(start, "ArrowRight");
    await settle();

    expect(document.activeElement).toBe(getDay("2026-03-15"));
  });

  it("still opens when the whole visible month is out of bounds", async () => {
    mountPicker({ min: "2099-01-01T00:00" });
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

describe("DateTimePicker overlay focus", () => {
  it("opens onto the day the calendar is already sitting on", async () => {
    mountPicker({ modelValue: ISO });
    await openCalendar();

    expect(document.activeElement).toBe(getDay("2026-03-14"));
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

describe("DateTimePicker unavailable and invalid", () => {
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
    expect(getAnchor().hasAttribute("data-invalid")).toBe(false);
  });
});

describe("DateTimePicker attribute routing", () => {
  it("merges a caller's class onto the anchor, so it sizes the whole control", async () => {
    mountPicker({ modelValue: ISO }, { class: "max-w-xs" });
    await settle();

    expect(getAnchor().className).toContain("max-w-xs");
    expect(getField().className).not.toContain("max-w-xs");
  });

  it("routes every other fallthrough attribute onto the field group it describes", async () => {
    mountPicker({ modelValue: ISO }, { "aria-describedby": "send-hint", "data-testid": "send-at" });
    await settle();

    const field = getField();
    expect(field.getAttribute("aria-describedby")).toBe("send-hint");
    expect(field.getAttribute("data-testid")).toBe("send-at");
  });
});

describe("DateTimePicker shape changes", () => {
  it("keeps the same instant when the hour cycle changes underneath it", async () => {
    const wrapper = mountPicker({ modelValue: "2026-03-14T13:30", hourCycle: 24 });
    await settle();
    expect(segmentValues()).toEqual(["3", "14", "2026", "13", "30"]);

    await wrapper.setProps({ hourCycle: 12 });
    await settle();

    // Reka builds its formatter and seeds its segment values once, so a field
    // left to patch itself relabels 13:30 as "1:30 AM" — half a day wrong.
    expect(getSegment("hour").textContent.trim()).toBe("1");
    expect(getSegment("dayPeriod").textContent.trim()).toBe("PM");
  });

  it("gives a widened granularity a real segment even when nothing is chosen", async () => {
    const wrapper = mountPicker({ hourCycle: 24 });
    await settle();
    expect(segmentNames()).not.toContain("Second");

    await wrapper.setProps({ granularity: "second" });
    await settle();

    expect(segmentNames()).toContain("Second");
    expect(getSegment("second").getAttribute("role")).toBe("spinbutton");
  });

  it("rewrites the segments for a locale without rebuilding the field", async () => {
    const wrapper = mountPicker({ modelValue: ISO, locale: "en-US", hourCycle: 24 });
    await settle();
    const before = getField();

    await wrapper.setProps({ locale: "en-GB" });
    await settle();

    expect(segmentValues()).toEqual(["14", "03", "2026", "09", "30"]);
    // Rebuilding on a change Reka already handles would throw away focus
    // mid-edit, which is why `locale` is not in the field's key.
    expect(getField()).toBe(before);
  });
});

describe("DateTimePicker read-only", () => {
  it("keeps a read-only field a Tab stop and its segments readable, where a disabled one is neither", async () => {
    mountPicker({ modelValue: ISO, hourCycle: 24, readonly: true });
    await settle();

    // The whole difference between the two states: a read-only instant is a
    // value on show and a reader still arrows across it to read it.
    expect(getSegments().map((segment) => segment.getAttribute("tabindex"))).toEqual([
      "0",
      "-1",
      "-1",
      "-1",
      "-1",
    ]);
    expect(getField().hasAttribute("data-readonly")).toBe(true);
    expect(segmentValues()).toEqual(["3", "14", "2026", "09", "30"]);
  });

  it("refuses the edit a read-only field is showing", async () => {
    const wrapper = mountPicker({ modelValue: ISO, hourCycle: 24, readonly: true });
    await settle();

    const minute = getSegment("minute");
    minute.focus();
    pressKey(minute, "ArrowUp");
    await settle();

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(segmentValues()).toEqual(["3", "14", "2026", "09", "30"]);
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

describe("DateTimePicker inside a Field", () => {
  it("takes its id, description, name, required and invalid state from the row it sits in", async () => {
    mountRow(
      {
        controlId: "send-at",
        describedBy: "send-at-description",
        name: "sendAt",
        required: true,
        invalid: true,
      },
      h(DateTimePicker, { modelValue: ISO }),
    );
    await settle();

    expect(getFormInput().id).toBe("send-at");
    expect(getFormInput().name).toBe("sendAt");
    // Everything announced belongs on the group, which a screen reader reads
    // once on entering the field rather than once per segment.
    const field = getField();
    expect(field.getAttribute("aria-describedby")).toBe("send-at-description");
    expect(field.getAttribute("aria-required")).toBe("true");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(getSegments().some((segment) => segment.hasAttribute("aria-describedby"))).toBe(false);
    expect(getAnchor().hasAttribute("data-invalid")).toBe(true);
  });

  it("takes disabled and readonly from the row, each with its own consequence", async () => {
    const disabled = mountRow({ disabled: true }, h(DateTimePicker, { modelValue: ISO }));
    await settle();
    expect(getSegments().some((segment) => segment.hasAttribute("tabindex"))).toBe(false);
    expect(getTrigger().disabled).toBe(true);
    disabled.unmount();

    mountRow({ readonly: true }, h(DateTimePicker, { modelValue: ISO }));
    await settle();
    expect(getField().hasAttribute("data-readonly")).toBe(true);
    expect(document.querySelector('[aria-label="Open calendar"]')).toBeNull();
  });

  it("lets an explicit prop overrule the row in both directions", async () => {
    const optedOut = mountRow(
      { invalid: true, required: true, disabled: true, readonly: true },
      h(DateTimePicker, {
        modelValue: ISO,
        invalid: false,
        required: false,
        disabled: false,
        readonly: false,
      }),
    );
    await settle();
    expect(getField().getAttribute("aria-invalid")).toBeNull();
    expect(getField().getAttribute("aria-required")).toBeNull();
    expect(getTrigger().disabled).toBe(false);
    expect(getSegments().some((segment) => segment.hasAttribute("tabindex"))).toBe(true);
    optedOut.unmount();

    mountRow({}, h(DateTimePicker, { modelValue: ISO, invalid: true, required: true }));
    await settle();
    expect(getField().getAttribute("aria-invalid")).toBe("true");
    expect(getField().getAttribute("aria-required")).toBe("true");
  });

  it("keeps an out-of-range instant invalid even where the row and the caller both say otherwise", async () => {
    // The two markers stay separate claims: `data-invalid` is the row's or the
    // caller's, `data-out-of-range` is the measurement, and only the error
    // presentation is shared.
    mountRow(
      { invalid: false },
      h(DateTimePicker, {
        modelValue: "2026-03-16T18:30",
        min: "2026-03-16T09:00",
        max: "2026-03-16T17:00",
        invalid: false,
      }),
    );
    await settle();

    expect(getField().getAttribute("aria-invalid")).toBe("true");
    expect(getField().className).toContain("border-destructive");
    expect(getAnchor().hasAttribute("data-out-of-range")).toBe(true);
    expect(getAnchor().hasAttribute("data-invalid")).toBe(false);
  });

  it("adds the row's description to one the caller already set rather than replacing it", async () => {
    mountRow(
      { describedBy: "send-at-description" },
      h(DateTimePicker, { modelValue: ISO, "aria-describedby": "schedule-rules" }),
    );
    await settle();

    expect(getField().getAttribute("aria-describedby")).toBe("schedule-rules send-at-description");
  });

  it("keeps the caller's own id and name ahead of the row's", async () => {
    mountRow(
      { controlId: "row-id", name: "row-name" },
      h(DateTimePicker, { modelValue: ISO, id: "mine", name: "mine" }),
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

describe("DateTimePicker labels", () => {
  it("names every segment and every control in English with no vocabulary above it", async () => {
    mountPicker({ modelValue: ISO, hourCycle: 12 });
    await settle();
    await openCalendar();

    expect(segmentNames()).toEqual(["Month", "Day", "Year", "Hour", "Minute", "AM or PM"]);
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
    mountPicker({
      modelValue: ISO,
      hourCycle: 24,
      labels: { day: "Ngày", hour: "Giờ", openCalendar: "Mở lịch" },
    });
    await settle();

    // The keys the prop did not name stay English rather than blanking out —
    // an unnamed spinbutton is the worst available reading of a partial bag.
    expect(segmentNames()).toEqual(["Month", "Ngày", "Year", "Giờ", "Minute"]);
    expect(getTrigger().getAttribute("aria-label")).toBe("Mở lịch");
  });

  it("takes a host's vocabulary across all three of its slots", async () => {
    mountUnder(
      () => ({
        dateSegments: { month: "Tháng", day: "Ngày", year: "Năm" },
        timeSegments: { hour: "Giờ", minute: "Phút" },
        calendarPanel: { openCalendar: "Mở lịch", nextMonth: "Tháng sau" },
      }),
      h(DateTimePicker, { modelValue: ISO, hourCycle: 24 }),
    );
    await settle();
    await openCalendar();

    expect(segmentNames()).toEqual(["Tháng", "Ngày", "Năm", "Giờ", "Phút"]);
    expect(getTrigger().getAttribute("aria-label")).toBe("Mở lịch");
    expect(document.querySelector('[aria-label="Tháng sau"]')).not.toBeNull();
    expect(document.querySelector('[aria-label="Previous month"]')).not.toBeNull();
  });

  it("lets the instance's prop beat the host's vocabulary", async () => {
    mountUnder(
      () => ({ calendarPanel: { openCalendar: "Mở lịch" } }),
      h(DateTimePicker, { modelValue: ISO, labels: { openCalendar: "Chọn thời điểm" } }),
    );
    await settle();

    expect(getTrigger().getAttribute("aria-label")).toBe("Chọn thời điểm");
  });

  it("repaints every name when the host switches language under it", async () => {
    const locale = ref("en");
    mountUnder(
      () =>
        locale.value === "en"
          ? {}
          : {
              dateSegments: { day: "Ngày" },
              timeSegments: { hour: "Giờ" },
              calendarPanel: { openCalendar: "Mở lịch" },
            },
      h(DateTimePicker, { modelValue: ISO, hourCycle: 24 }),
    );
    await settle();
    expect(getTrigger().getAttribute("aria-label")).toBe("Open calendar");

    locale.value = "vi";
    await settle();

    // This is the assertion that fails the moment a label is resolved once in
    // `setup` instead of inside the render effect — a change that passes every
    // other test here and breaks every language switch.
    expect(segmentNames()).toEqual(["Month", "Ngày", "Year", "Giờ", "Minute"]);
    expect(getTrigger().getAttribute("aria-label")).toBe("Mở lịch");
  });

  it("reads an explicitly undefined override as no opinion rather than as a blank name", async () => {
    mountPicker({ modelValue: ISO, hourCycle: 24, labels: { day: undefined } });
    await settle();

    expect(segmentNames()).toEqual(["Month", "Day", "Year", "Hour", "Minute"]);
  });
});
