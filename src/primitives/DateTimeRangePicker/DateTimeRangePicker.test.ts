import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref, type PropType, type VNode } from "vue";
import { getLocalTimeZone, today } from "@internationalized/date";
import DateTimeRangePicker from "./DateTimeRangePicker.vue";
import { provideFieldContext } from "../../lib/field-context";
import { provideLoomLabels, type LoomLabelOverrides } from "../../lib/labels";
import { attachToBody } from "../../testing/attach-to-body";

// The same jsdom gaps both parents' suites stub, for the same reason: the panel
// is portalled and Reka drives it with real pointer capture, focus and layout
// APIs. Each is stubbed to the shape Reka reads rather than mocked away.
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

enableAutoUnmount(afterEach);

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

async function settle() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

function mountPicker(
  props: Partial<InstanceType<typeof DateTimeRangePicker>["$props"]> = {},
  attrs = {},
) {
  return mount(DateTimeRangePicker, { props, attrs, attachTo: document.body });
}

/** The outer field group — the two half-groups inside it carry a name of their own. */
function getField(): HTMLElement {
  const field = document.querySelector<HTMLElement>(
    '[role="group"]:not([aria-label="Start date and time"]):not([aria-label="End date and time"])',
  );
  if (!field) throw new Error("no field rendered");
  return field;
}

function getAnchor(): HTMLElement {
  const anchor = getField().parentElement;
  if (!anchor) throw new Error("no anchor rendered");
  return anchor;
}

function getHalf(type: "Start" | "End"): HTMLElement {
  const half = document.querySelector<HTMLElement>(
    `[role="group"][aria-label="${type} date and time"]`,
  );
  if (!half) throw new Error(`no ${type} half rendered`);
  return half;
}

/** Every editable segment of the whole field, in tab order across both halves. */
function getSegments(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[role="spinbutton"]')];
}

function getSegmentsOf(type: "Start" | "End"): HTMLElement[] {
  return [...getHalf(type).querySelectorAll<HTMLElement>('[role="spinbutton"]')];
}

function getSegment(type: "Start" | "End", part: string): HTMLElement {
  const segment = getHalf(type).querySelector<HTMLElement>(
    `[data-reka-date-field-segment="${part}"]`,
  );
  if (!segment) throw new Error(`no ${part} segment in the ${type} half`);
  return segment;
}

// Capitalised because these are Loom's names, not Reka's: Reka writes
// `"month, "`, `"hour, "` and their siblings into its own render function, and
// asserting the capitalisation is what pins whose string reached the DOM.
function segmentNamesOf(type: "Start" | "End"): (string | null)[] {
  return getSegmentsOf(type).map((segment) => segment.getAttribute("aria-label"));
}

function segmentValuesOf(type: "Start" | "End"): string[] {
  return getSegmentsOf(type).map((segment) => segment.textContent.trim());
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

function getGrids(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[role="grid"]')];
}

function getPanel(): HTMLElement {
  const panel = getGrids()[0]?.closest<HTMLElement>("[data-state]");
  if (!panel) throw new Error("no open panel");
  return panel;
}

function getDays(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>("[data-reka-calendar-cell-trigger]")];
}

/**
 * The cell for a day in the month it belongs to. Cells carry the whole instant
 * as their value, so the day is matched by prefix — and with two months on
 * screen the same date also appears as a spill-over cell in the neighbouring
 * grid, so the outside-view copy is excluded rather than picked at random.
 */
function getDay(isoDay: string): HTMLElement {
  const day = document.querySelector<HTMLElement>(
    `[data-value^="${isoDay}T"]:not([data-outside-view])`,
  );
  if (!day) throw new Error(`no cell for ${isoDay}`);
  return day;
}

function getCellOf(day: HTMLElement): HTMLElement {
  const cell = day.closest<HTMLElement>('[role="gridcell"]');
  if (!cell) throw new Error("cell trigger is not inside a gridcell");
  return cell;
}

function getStatus(): HTMLElement {
  const status = document.querySelector<HTMLElement>('[role="status"]');
  if (!status) throw new Error("no status line rendered");
  return status;
}

async function openCalendar() {
  getTrigger().click();
  await settle();
}

// `code` as well as `key`: Reka's field navigation switches on `event.key`
// while its calendar navigation switches on `event.code`.
function pressKey(el: EventTarget, key: string) {
  el.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key, code: key }),
  );
}

/**
 * The visually-hidden `<input>` Reka puts inside the outer field group — the
 * element that carries the control's `id` and `name`, and the one a
 * `<label for>` can name, a `role="group"` div not being labelable.
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

const START = "2026-03-14T09:30";
const END = "2026-03-20T17:00";
const RANGE = { start: START, end: END };
/** The most ordinary span this control holds: one day, two times. */
const MEETING = { start: "2026-03-16T09:00", end: "2026-03-16T10:00" };

// A range picked by clicking has to be picked out of the month the calendar
// actually opens on, and with nothing bound that is the month containing
// today — so these move with the clock while the pair above stays fixed for the
// tests that bind a value and read it back.
const VISIBLE_MONTH = today(getLocalTimeZone()).set({ day: 1 });
const PICK_START = VISIBLE_MONTH.set({ day: 8 }).toString();
const PICK_END = VISIBLE_MONTH.set({ day: 14 }).toString();

describe("DateTimeRangePicker field", () => {
  it("renders one spinbutton per date and time part of each half", async () => {
    mountPicker({ modelValue: RANGE, hourCycle: 24 });
    await settle();

    expect(segmentNamesOf("Start")).toEqual(["Month", "Day", "Year", "Hour", "Minute"]);
    expect(segmentNamesOf("End")).toEqual(["Month", "Day", "Year", "Hour", "Minute"]);
  });

  it("shows both instants across the segments rather than as two strings", async () => {
    mountPicker({ modelValue: RANGE, hourCycle: 24 });
    await settle();

    expect(segmentValuesOf("Start")).toEqual(["3", "14", "2026", "09", "30"]);
    expect(segmentValuesOf("End")).toEqual(["3", "20", "2026", "17", "00"]);
  });

  it("names the halves rather than leaving ten segments called month, day, year, hour and minute", async () => {
    mountPicker({ modelValue: RANGE, hourCycle: 24 });
    await settle();

    // Reka labels a segment by its part alone, so both halves say "hour".
    // Without the group name there is nothing to tell a reader which end of the
    // span they are typing into.
    expect(getHalf("Start").getAttribute("aria-label")).toBe("Start date and time");
    expect(getHalf("End").getAttribute("aria-label")).toBe("End date and time");
  });

  it("orders the segments the way the locale writes an instant", async () => {
    const wrapper = mountPicker({ modelValue: RANGE, locale: "en-GB", hourCycle: 24 });
    await settle();
    expect(segmentValuesOf("Start")).toEqual(["14", "03", "2026", "09", "30"]);

    await wrapper.setProps({ locale: "en-US" });
    await settle();
    expect(segmentValuesOf("Start")).toEqual(["3", "14", "2026", "09", "30"]);
  });

  it("is a single Tab stop across both halves and both clocks", async () => {
    mountPicker({ modelValue: RANGE, hourCycle: 24 });
    await settle();

    // Ten segments, one stop. A stop per half, or per date-and-time, would be an
    // arbitrary place to make a keyboard user press Tab.
    const stops = getSegments().map((segment) => segment.getAttribute("tabindex"));
    expect(stops).toHaveLength(10);
    expect(stops).toEqual(["0", "-1", "-1", "-1", "-1", "-1", "-1", "-1", "-1", "-1"]);
  });

  it("moves the Tab stop with focus as the arrow keys walk out of one half into the other", async () => {
    mountPicker({ modelValue: RANGE, hourCycle: 24 });
    await settle();

    const minute = getSegment("Start", "minute");
    minute.focus();
    pressKey(minute, "ArrowRight");
    await settle();

    expect(document.activeElement).toBe(getSegment("End", "month"));
    // The point of the roving stop: Shift+Tab back into the field returns to the
    // segment the reader left, not to the start's month.
    expect(getSegments().map((segment) => segment.getAttribute("tabindex"))).toEqual([
      "-1",
      "-1",
      "-1",
      "-1",
      "-1",
      "0",
      "-1",
      "-1",
      "-1",
      "-1",
    ]);
  });

  it("grows an AM/PM segment in both halves on a 12-hour cycle and none on a 24-hour one", async () => {
    const wrapper = mountPicker({ modelValue: RANGE, hourCycle: 12 });
    await settle();
    expect(segmentNamesOf("Start")).toContain("AM or PM");
    expect(segmentNamesOf("End")).toContain("AM or PM");

    await wrapper.setProps({ hourCycle: 24 });
    await settle();
    expect(segmentNamesOf("Start")).not.toContain("AM or PM");
    expect(segmentNamesOf("End")).not.toContain("AM or PM");
  });

  it("announces each hour as the reader sees it, not as the value stores it", async () => {
    mountPicker({
      modelValue: { start: "2026-03-14T09:30", end: "2026-03-14T13:30" },
      hourCycle: 12,
    });
    await settle();

    // Reka publishes `aria-valuenow` off the internal 24-hour value while
    // declaring the range as 1–12, so half past one announces as "13 PM" — and
    // the two hours are two segments showing two different numbers.
    const start = getSegment("Start", "hour");
    const end = getSegment("End", "hour");
    expect(start.getAttribute("aria-valuenow")).toBe("9");
    expect(start.getAttribute("aria-valuetext")).toBe("9 AM");
    expect(end.textContent.trim()).toBe("1");
    expect(end.getAttribute("aria-valuenow")).toBe("1");
    expect(end.getAttribute("aria-valuetext")).toBe("1 PM");
  });

  it("leaves an hour placeholder alone rather than announcing a number it is not showing", async () => {
    mountPicker({ hourCycle: 12 });
    await settle();

    const hour = getSegment("Start", "hour");
    expect(hour.hasAttribute("data-placeholder")).toBe(true);
    expect(hour.getAttribute("aria-valuenow")).not.toBe("NaN");
  });

  it("keeps a tab stop when the segment holding it is taken away", async () => {
    const wrapper = mountPicker({
      modelValue: { start: "2026-03-14T09:30:45", end: "2026-03-20T17:00:15" },
      granularity: "second",
      hourCycle: 24,
    });
    await settle();
    getSegment("End", "second").focus();
    await settle();

    await wrapper.setProps({ granularity: "minute" });
    await settle();

    // A field remembering a segment that no longer exists is a field with no tab
    // stop at all, which is a field a keyboard cannot reach.
    expect(
      getSegments().filter((segment) => segment.getAttribute("tabindex") === "0"),
    ).toHaveLength(1);
  });

  it("names the whole control once, on the group both halves sit in", async () => {
    mountPicker({ modelValue: RANGE }, { "aria-label": "Meeting" });
    await settle();

    expect(getField().getAttribute("aria-label")).toBe("Meeting");
    expect(getSegments().every((segment) => segment.getAttribute("aria-label") !== "Meeting")).toBe(
      true,
    );
  });
});

describe("DateTimeRangePicker ISO boundary", () => {
  it("reports a typed change as a pair of local ISO date-time strings", async () => {
    const wrapper = mountPicker({ modelValue: RANGE, hourCycle: 24 });
    await settle();

    const minute = getSegment("End", "minute");
    minute.focus();
    pressKey(minute, "ArrowUp");
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      { start: START, end: "2026-03-20T17:01" },
    ]);
  });

  it("carries no timezone, offset or seconds it never showed", async () => {
    const wrapper = mountPicker({ modelValue: RANGE, hourCycle: 24 });
    await settle();

    const day = getSegment("Start", "day");
    day.focus();
    pressKey(day, "ArrowUp");
    await settle();

    const emitted = wrapper.emitted("update:modelValue")?.at(-1)?.at(0) as {
      start?: string;
      end?: string;
    };
    expect(emitted.start).toBe("2026-03-15T09:30");
    expect(emitted.start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(emitted.end).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("reports seconds in both halves only where the granularity asks for them", async () => {
    const wrapper = mountPicker({
      modelValue: { start: "2026-03-14T09:30:45", end: "2026-03-20T17:00:15" },
      granularity: "second",
      hourCycle: 24,
    });
    await settle();

    expect(segmentNamesOf("End")).toEqual(["Month", "Day", "Year", "Hour", "Minute", "Second"]);

    const second = getSegment("End", "second");
    second.focus();
    pressKey(second, "ArrowUp");
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      { start: "2026-03-14T09:30:45", end: "2026-03-20T17:00:16" },
    ]);
  });

  it("drops the seconds it is not showing rather than reporting a value nobody could see", async () => {
    const wrapper = mountPicker({
      modelValue: { start: "2026-03-14T09:30:45", end: "2026-03-20T17:00:15" },
      hourCycle: 24,
    });
    await settle();

    expect(segmentNamesOf("Start")).not.toContain("Second");

    const minute = getSegment("Start", "minute");
    minute.focus();
    pressKey(minute, "ArrowUp");
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      { start: "2026-03-14T09:31", end: "2026-03-20T17:00" },
    ]);
  });

  it("reads a bare date in either half as midnight on that day", async () => {
    mountPicker({ modelValue: { start: "2026-03-14", end: "2026-03-20T17:00" }, hourCycle: 24 });
    await settle();

    expect(segmentValuesOf("Start")).toEqual(["3", "14", "2026", "00", "00"]);
    expect(segmentValuesOf("End")).toEqual(["3", "20", "2026", "17", "00"]);
  });

  it("reads a half that does not parse as that half not chosen, rather than throwing", async () => {
    // An absolute instant is not this component's value, and `parseDateTime`
    // refuses the `Z` rather than silently dropping it. The surviving half is in
    // the month the calendar opens on, because with no start to follow the
    // placeholder is today.
    mountPicker({ modelValue: { start: "2026-03-14T09:30:00Z", end: `${PICK_END}T17:00` } });
    await openCalendar();

    const selected = getDays().filter(
      (day) => day.hasAttribute("data-selected") && !day.hasAttribute("data-outside-view"),
    );
    expect(selected.map((day) => day.getAttribute("data-value")?.slice(0, 10))).toEqual([PICK_END]);
  });

  it("reads an empty value as nothing chosen", async () => {
    mountPicker({ modelValue: {}, hourCycle: 24 });
    await openCalendar();

    expect(getDays().some((day) => day.hasAttribute("data-selected"))).toBe(false);
    expect(getSegments().every((segment) => segment.hasAttribute("data-placeholder"))).toBe(true);
  });

  it("reports the half that is left once one of them has been emptied", async () => {
    const wrapper = mountPicker({ modelValue: RANGE, hourCycle: 24 });
    await settle();

    const minute = getSegment("End", "minute");
    minute.focus();
    // Two presses: the first drops a digit, the second empties the segment, and
    // an empty segment is what makes that half no instant.
    pressKey(minute, "Backspace");
    pressKey(minute, "Backspace");
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([{ start: START }]);
  });

  it("hands back Gregorian ISO strings even where the locale reads another calendar", async () => {
    // `th-TH` resolves to the Buddhist calendar, so every `data-value` in the
    // grid is a Buddhist date whose `toString()` is a well-formed ISO string for
    // the wrong year.
    const wrapper = mountPicker({ locale: "th-TH" });
    await openCalendar();

    const now = today(getLocalTimeZone());
    document.querySelector<HTMLElement>("[data-today]")?.click();
    await settle();

    expect(getSegment("Start", "year").textContent.trim()).toBe(String(now.year + 543));
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      { start: `${now.toString()}T00:00` },
    ]);
  });

  it("follows a span the host changes underneath it", async () => {
    const wrapper = mountPicker({ modelValue: RANGE, hourCycle: 24 });
    await wrapper.setProps({ modelValue: { start: "2026-03-02T08:15", end: "2026-03-04T12:45" } });
    await settle();

    expect(segmentValuesOf("Start")).toEqual(["3", "2", "2026", "08", "15"]);
    expect(segmentValuesOf("End")).toEqual(["3", "4", "2026", "12", "45"]);
  });
});

// The round trip is the whole component, and here it has three parts rather
// than DateTimePicker's one: the start's time, the end's time, and a span whose
// ends fall on the same day at different times.
describe("DateTimeRangePicker round trip between the days and the times", () => {
  it("keeps the start's time when the start's day is picked out of the calendar", async () => {
    const wrapper = mountPicker({ modelValue: RANGE, hourCycle: 24 });
    await openCalendar();

    getDay("2026-03-16").click();
    await settle();

    // The first click of a new range, so the end is dropped by Reka's own
    // two-click protocol — but the start's time survives the day moving.
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([{ start: "2026-03-16T09:30" }]);
  });

  it("keeps the end's own time when the end's day is picked, rather than handing it the start's", async () => {
    const wrapper = mountPicker({ modelValue: RANGE, hourCycle: 24 });
    await openCalendar();

    getDay("2026-03-16").click();
    await settle();
    getDay("2026-03-18").click();
    await settle();

    // Every calendar cell carries the placeholder's time and the placeholder
    // follows the start, so left to Reka the end would come back at 09:30. The
    // end kept its own 17:00 across both clicks, including the half-made state
    // in between where it was not in the model at all.
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      { start: "2026-03-16T09:30", end: "2026-03-18T17:00" },
    ]);
  });

  it("keeps both times through a full pick, echo and re-pick", async () => {
    const wrapper = mountPicker({ modelValue: RANGE, hourCycle: 24 });
    await openCalendar();

    getDay("2026-03-16").click();
    await settle();
    // The host echoing each emitted value straight back down is what a real
    // `v-model` does, and it is where a time remembered only in the model would
    // quietly go missing.
    await wrapper.setProps({ modelValue: { start: "2026-03-16T09:30" } });
    await settle();
    getDay("2026-03-18").click();
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      { start: "2026-03-16T09:30", end: "2026-03-18T17:00" },
    ]);
  });

  it("keeps the seconds too, at second granularity", async () => {
    const wrapper = mountPicker({
      modelValue: { start: "2026-03-14T09:30:45", end: "2026-03-20T17:00:15" },
      granularity: "second",
      hourCycle: 24,
    });
    await openCalendar();

    getDay("2026-03-16").click();
    await settle();
    getDay("2026-03-18").click();
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      { start: "2026-03-16T09:30:45", end: "2026-03-18T17:00:15" },
    ]);
  });

  it("keeps the days already chosen when a time is typed", async () => {
    const wrapper = mountPicker({ modelValue: RANGE, hourCycle: 24 });
    await settle();

    const hour = getSegment("End", "hour");
    hour.focus();
    pressKey(hour, "ArrowUp");
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      { start: START, end: "2026-03-20T18:00" },
    ]);
  });

  it("collapses a span onto one day and keeps both times, which is a meeting", async () => {
    const wrapper = mountPicker({ modelValue: RANGE, hourCycle: 24 });
    await openCalendar();

    // The same cell twice: the first click begins a new range, the second closes
    // it on the same day. A calendar that refused this, or that reported one
    // instant for it, would be broken for the commonest thing anyone binds here.
    getDay("2026-03-16").click();
    await settle();
    getDay("2026-03-16").click();
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      { start: "2026-03-16T09:30", end: "2026-03-16T17:00" },
    ]);
  });

  it("moves a same-day span to another day with both of its times", async () => {
    const wrapper = mountPicker({ modelValue: MEETING, hourCycle: 24 });
    await openCalendar();

    getDay("2026-03-19").click();
    await settle();
    getDay("2026-03-19").click();
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      { start: "2026-03-19T09:00", end: "2026-03-19T10:00" },
    ]);
  });

  it("means midnight at both ends when days are chosen before any time is", async () => {
    // The honest default, and the one a reader has to be able to predict: a
    // window of "Monday to Friday" opens at 00:00 on the Monday.
    const wrapper = mountPicker({ hourCycle: 24 });
    await openCalendar();

    getDay(PICK_START).click();
    await settle();
    getDay(PICK_END).click();
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      { start: `${PICK_START}T00:00`, end: `${PICK_END}T00:00` },
    ]);
  });

  it("holds a half-made range rather than waiting for the second click", async () => {
    const wrapper = mountPicker({ hourCycle: 24 });
    await openCalendar();

    getDay(PICK_START).click();
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      { start: `${PICK_START}T00:00` },
    ]);
    // And the calendar is still there, because the reader is not finished.
    expect(getGrids()).not.toHaveLength(0);
  });

  // Observed, and inherited rather than fixed: with a half's date segments still
  // empty, a time typed into it is not part of any value yet — Reka publishes a
  // half only once every one of its segments is filled, and holds the
  // half-entered time in a `segmentValues` ref it does not expose. So the
  // calendar's cells still carry the placeholder's midnight, and the model
  // update that follows the click resyncs the segments from it, overwriting what
  // was typed. DateTimePicker records the same defect for the same reason, and
  // nothing about having two halves changes it: reading the time back out of the
  // rendered segments would mean parsing locale-formatted digits into numbers, a
  // worse defect than the one it fixes. Filling the day first, which is the
  // order the segments already read in, is unaffected.
  it.todo("keeps a time typed into a half before that half's day was chosen");
});

describe("DateTimeRangePicker ordering", () => {
  it("sorts days picked backwards rather than refusing the second click", async () => {
    const wrapper = mountPicker({ hourCycle: 24 });
    await openCalendar();

    getDay(PICK_END).click();
    await settle();
    getDay(PICK_START).click();
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      { start: `${PICK_START}T00:00`, end: `${PICK_END}T00:00` },
    ]);
  });

  it("sorts the days of a backwards pick and still gives each end its own time", async () => {
    const wrapper = mountPicker({ modelValue: RANGE, hourCycle: 24 });
    await openCalendar();

    getDay("2026-03-18").click();
    await settle();
    getDay("2026-03-16").click();
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      { start: "2026-03-16T09:30", end: "2026-03-18T17:00" },
    ]);
  });

  it("flags rather than reorders a span that collapsing onto one day turned backwards", async () => {
    // 17:00 on the 14th to 09:00 on the 20th is a perfectly ordinary span, and
    // both times survive the two clicks that put both ends on one day — which
    // is what makes it backwards. Swapping the times would be inventing an
    // order the reader never expressed; this reports what they built and paints
    // it as wrong.
    const wrapper = mountPicker({
      modelValue: { start: "2026-03-14T17:00", end: "2026-03-20T09:00" },
      hourCycle: 24,
    });
    await openCalendar();

    getDay("2026-03-16").click();
    await settle();
    getDay("2026-03-16").click();
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      { start: "2026-03-16T17:00", end: "2026-03-16T09:00" },
    ]);

    await wrapper.setProps({ modelValue: { start: "2026-03-16T17:00", end: "2026-03-16T09:00" } });
    await settle();
    expect(getAnchor().hasAttribute("data-backwards")).toBe(true);
    expect(getField().getAttribute("aria-invalid")).toBe("true");
  });

  it("announces a typed span that runs backwards instead of silently swapping it", async () => {
    // Across days and within one, the same answer. Reordering what someone is
    // in the middle of typing is how a field fights its reader.
    const wrapper = mountPicker({
      modelValue: { start: "2026-03-16T10:00", end: "2026-03-16T09:00" },
      hourCycle: 24,
    });
    await settle();

    expect(getField().getAttribute("aria-invalid")).toBe("true");
    expect(getField().className).toContain("border-destructive");
    expect(getAnchor().hasAttribute("data-backwards")).toBe(true);
    expect(getAnchor().hasAttribute("data-invalid")).toBe(false);
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("flags a span that runs backwards by an hour on one day as readily as one backwards by a week", async () => {
    const wrapper = mountPicker({
      modelValue: { start: "2026-03-20T09:00", end: "2026-03-14T09:00" },
      hourCycle: 24,
    });
    await settle();
    expect(getAnchor().hasAttribute("data-backwards")).toBe(true);

    await wrapper.setProps({ modelValue: MEETING });
    await settle();
    // A same-day span whose end is after its start is not backwards, and neither
    // is one whose ends coincide.
    expect(getAnchor().hasAttribute("data-backwards")).toBe(false);
    expect(getField().getAttribute("aria-invalid")).toBeNull();

    await wrapper.setProps({
      modelValue: { start: "2026-03-16T09:00", end: "2026-03-16T09:00" },
    });
    await settle();
    expect(getAnchor().hasAttribute("data-backwards")).toBe(false);
  });

  it("holds no opinion about the order while only one half is chosen", async () => {
    mountPicker({ modelValue: { start: START }, hourCycle: 24 });
    await settle();

    expect(getAnchor().hasAttribute("data-backwards")).toBe(false);
    expect(getField().getAttribute("aria-invalid")).toBeNull();
  });
});

describe("DateTimeRangePicker instant bounds", () => {
  it("leaves the boundary day choosable even when a held time falls outside the bound", async () => {
    // The bound is an instant, so 16 March is choosable from 09:00 to 17:00 —
    // but the grid cell carries the field's current time, 18:30. Bounding the
    // calendar by the instant would disable the one day the reader wants, for a
    // reason nothing on screen explains.
    mountPicker({
      modelValue: { start: "2026-03-16T18:30", end: "2026-03-16T19:00" },
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
      modelValue: MEETING,
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

  it("flags an end past the upper bound on a day the calendar allowed", async () => {
    mountPicker({
      modelValue: { start: "2026-03-16T09:00", end: "2026-03-16T18:30" },
      min: "2026-03-16T09:00",
      max: "2026-03-16T17:00",
    });
    await settle();

    expect(getField().getAttribute("aria-invalid")).toBe("true");
    expect(getField().className).toContain("border-destructive");
    expect(getAnchor().hasAttribute("data-out-of-range")).toBe(true);
    // A separate marker from the host's own `invalid`, because they are separate
    // claims about the same control.
    expect(getAnchor().hasAttribute("data-invalid")).toBe(false);
  });

  it("flags a start before the lower bound as readily as an end past the upper", async () => {
    // Both ends are measured, not just the one the field happens to end on.
    const wrapper = mountPicker({
      modelValue: { start: "2026-03-16T08:00", end: "2026-03-16T12:00" },
      min: "2026-03-16T09:00",
    });
    await settle();
    expect(getAnchor().hasAttribute("data-out-of-range")).toBe(true);

    await wrapper.setProps({ modelValue: { start: "2026-03-16T09:00", end: "2026-03-16T12:00" } });
    await settle();
    expect(getAnchor().hasAttribute("data-out-of-range")).toBe(false);
    expect(getField().getAttribute("aria-invalid")).toBeNull();
  });

  it("stays quiet when no bounds were given at all", async () => {
    mountPicker({ modelValue: RANGE });
    await settle();

    expect(getAnchor().hasAttribute("data-out-of-range")).toBe(false);
    expect(getField().getAttribute("aria-invalid")).toBeNull();
  });

  it("holds no opinion about an unparseable half against a bound", async () => {
    mountPicker({ modelValue: { start: "not an instant" }, min: "2026-03-16T09:00" });
    await settle();

    expect(getAnchor().hasAttribute("data-out-of-range")).toBe(false);
  });
});

describe("DateTimeRangePicker range states", () => {
  it("tells the first day, the last day and the days between apart without using colour", async () => {
    mountPicker({ modelValue: RANGE });
    await openCalendar();

    expect(getDay("2026-03-14").getAttribute("aria-label")).toContain("first day of the range");
    expect(getDay("2026-03-20").getAttribute("aria-label")).toContain("last day of the range");
    expect(getDay("2026-03-17").getAttribute("aria-label")).toContain("within the range");
    // The date itself is still the front of the name, so the part is an addition
    // rather than a replacement of what the cell is.
    expect(getDay("2026-03-14").getAttribute("aria-label")).toContain("14");
    expect(getDay("2026-03-25").getAttribute("aria-label")).not.toContain("range");
  });

  it("announces a same-day span as one day rather than as two coinciding ends", async () => {
    mountPicker({ modelValue: MEETING });
    await openCalendar();

    expect(getDay("2026-03-16").getAttribute("aria-label")).toContain(
      "the whole range, first and last day",
    );
  });

  it("gives the three states three fills and never rounds the days between", async () => {
    mountPicker({ modelValue: RANGE });
    await openCalendar();

    expect(getDay("2026-03-14").hasAttribute("data-selection-start")).toBe(true);
    expect(getDay("2026-03-20").hasAttribute("data-selection-end")).toBe(true);

    const middle = getDay("2026-03-17");
    expect(middle.hasAttribute("data-selected")).toBe(true);
    expect(middle.hasAttribute("data-selection-start")).toBe(false);
    expect(middle.hasAttribute("data-selection-end")).toBe(false);
    expect(middle.className).toContain(
      "[&[data-selected]:not([data-selection-start]):not([data-selection-end])]:bg-primary-muted",
    );
    expect(middle.className).toContain(
      "[&[data-selected]:not([data-selection-start]):not([data-selection-end])]:rounded-none",
    );
  });

  it("previews the range under the keyboard, not only under the pointer", async () => {
    mountPicker();
    await openCalendar();

    getDay(PICK_START).click();
    await settle();

    const target = getDay(VISIBLE_MONTH.set({ day: 12 }).toString());
    target.focus();
    await settle();

    // The band between the anchor and the focused day is the affordance that
    // makes a range calendar readable, and it has to follow arrow keys as well
    // as a pointer or a keyboard reader is choosing an end blind.
    expect(getDay(VISIBLE_MONTH.set({ day: 10 }).toString()).hasAttribute("data-highlighted")).toBe(
      true,
    );
    expect(target.hasAttribute("data-highlighted-end")).toBe(true);
    expect(getDay(VISIBLE_MONTH.set({ day: 16 }).toString()).hasAttribute("data-highlighted")).toBe(
      false,
    );
  });
});

describe("DateTimeRangePicker status line", () => {
  it("asks for a first day while nothing is chosen", async () => {
    mountPicker();
    await openCalendar();

    expect(getStatus().textContent).toContain("Choose the first day");
  });

  it("names the chosen end with its time and asks for the other one while the range is half made", async () => {
    mountPicker({ modelValue: { start: START }, hourCycle: 24 });
    await openCalendar();

    // The pointer reader sees the preview band; this is the same information
    // reaching a reader who cannot, and it is a live region so it arrives
    // without them going looking for it.
    const status = getStatus();
    expect(status.getAttribute("role")).toBe("status");
    expect(status.textContent).toContain("March 14, 2026");
    expect(status.textContent).toContain("09:30");
    expect(status.textContent).toContain("Choose the last day");
  });

  it("summarises the finished span and says how long it is", async () => {
    mountPicker({ modelValue: RANGE, hourCycle: 24 });
    await openCalendar();

    expect(getStatus().textContent).toBe(
      "March 14, 2026 at 09:30 to March 20, 2026 at 17:00, 6 days 7 hours 30 minutes.",
    );
  });

  it("measures a same-day span in hours rather than calling it one day", async () => {
    // DateRangePicker counts days with both ends included, which reads a meeting
    // from 09:00 to 10:00 as "1 day". A span between two instants is the
    // distance between them.
    mountPicker({ modelValue: MEETING, hourCycle: 24 });
    await openCalendar();

    expect(getStatus().textContent).toContain("1 hour.");
    expect(getStatus().textContent).not.toContain("day");
  });

  it("says a span of no length is one, rather than leaving the sentence unfinished", async () => {
    mountPicker({
      modelValue: { start: "2026-03-16T09:00", end: "2026-03-16T09:00" },
      hourCycle: 24,
    });
    await openCalendar();

    expect(getStatus().textContent).toContain("no time at all.");
  });

  it("says in words that a span runs backwards, so the destructive border is not the only cue", async () => {
    mountPicker({
      modelValue: { start: "2026-03-16T10:00", end: "2026-03-16T09:00" },
      hourCycle: 24,
    });
    await openCalendar();

    expect(getStatus().textContent).toContain("The end falls before the start.");
  });

  it("writes the summary in the locale and hour cycle the field is written in", async () => {
    mountPicker({ modelValue: RANGE, locale: "en-GB", hourCycle: 12 });
    await openCalendar();

    expect(getStatus().textContent).toContain("14 March 2026");
    expect(getStatus().textContent).toContain("9:30 am");
  });
});

describe("DateTimeRangePicker calendar", () => {
  it("shows two months at once, each named by its own month and year", async () => {
    mountPicker({ modelValue: RANGE });
    await openCalendar();

    const grids = getGrids();
    expect(grids).toHaveLength(2);
    expect(grids.map((grid) => grid.getAttribute("aria-label"))).toEqual([
      "March 2026",
      "April 2026",
    ]);
  });

  it("shows one month when a host asks for one", async () => {
    mountPicker({ modelValue: RANGE, months: 1 });
    await openCalendar();

    expect(getGrids()).toHaveLength(1);
  });

  it("keeps both months in the document so the arrow keys can cross between them", async () => {
    mountPicker({ modelValue: RANGE });
    await openCalendar();

    // Hiding the second month instead of stacking it would leave its cells
    // findable and unfocusable, and the arrow keys would stop dead at the end of
    // the first month with nothing said.
    expect(getDays().length % 7).toBe(0);
    expect(document.querySelectorAll("th")).toHaveLength(14);
  });

  it("announces the heading when paging moves the months underneath it", async () => {
    mountPicker({ modelValue: RANGE });
    await openCalendar();

    const heading = document.getElementById(getPanel().querySelector("[id]")?.id ?? "");
    expect(heading?.getAttribute("aria-live")).toBe("polite");

    const before = heading?.textContent;
    document.querySelector<HTMLElement>('[aria-label="Next month"]')?.click();
    await settle();

    expect(heading?.textContent).not.toBe(before);
    expect(getGrids().map((grid) => grid.getAttribute("aria-label"))).toEqual([
      "April 2026",
      "May 2026",
    ]);
  });

  it("gives the month buttons names rather than leaving them as bare glyphs", async () => {
    mountPicker({ modelValue: RANGE });
    await openCalendar();

    expect(document.querySelector('[aria-label="Previous month"]')?.textContent.trim()).toBe("");
    expect(document.querySelector('[aria-label="Next month"]')?.textContent.trim()).toBe("");
  });

  it("marks today without using colour, on the day rather than the instant", async () => {
    const now = today(getLocalTimeZone());
    mountPicker({ modelValue: { start: `${now.toString()}T09:30` } });
    await openCalendar();

    const chosen = getDay(now.toString());
    expect(chosen.getAttribute("aria-current")).toBe("date");
    expect(getCellOf(chosen).getAttribute("aria-selected")).toBe("true");
  });

  // The defect this pins: `data-[disabled]:opacity-50` faded the day number,
  // which is the cell's whole content — `--color-foreground` is 14.09:1 on the
  // popover and 3.13:1 at half alpha. Muted is 5.76:1, the strike is the hueless
  // cue separating an out-of-bounds day from an adjacent month's, and the colour
  // is guarded off `[data-selected]` so it never orders against the band's own.
  it("draws an out-of-bounds day in colour and a strike rather than fading its number", async () => {
    mountPicker({ modelValue: RANGE, min: "2026-03-16T09:00" });
    await openCalendar();

    const blocked = getDay("2026-03-15");
    expect(blocked.getAttribute("aria-disabled")).toBe("true");
    expect(blocked.className).not.toContain("opacity-50");
    expect(blocked.classList.contains("data-[disabled]:line-through")).toBe(true);
    expect(
      blocked.classList.contains("[&[data-disabled]:not([data-selected])]:text-muted-foreground"),
    ).toBe(true);
    expect(blocked.classList.contains("data-[selection-start]:text-primary-foreground")).toBe(true);
  });

  it("moves the grid's own single Tab stop with the arrow keys", async () => {
    mountPicker({ modelValue: RANGE });
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
    expect(getGrids()).not.toHaveLength(0);
    expect(getDays().some((day) => day.getAttribute("tabindex") === "0")).toBe(false);
  });

  it("brings the cells in with the panel rather than staggering them", async () => {
    mountPicker({ modelValue: RANGE });
    await openCalendar();

    expect(getDays().every((day) => day.style.animationDelay === "")).toBe(true);
  });

  it("scopes the panel's entrance animation to the open state", async () => {
    mountPicker({ modelValue: RANGE });
    await openCalendar();

    const classes = getPanel().className.split(/\s+/);
    // Unconditional, the closed panel never re-fires the animation, Reka never
    // unmounts it, and an invisible overlay is left eating clicks.
    expect(classes).toContain("data-[state=open]:animate-fade-rise");
    expect(classes).not.toContain("animate-fade-rise");
  });
});

describe("DateTimeRangePicker overlay focus", () => {
  it("opens onto the day the calendar is already sitting on", async () => {
    mountPicker({ modelValue: RANGE });
    await openCalendar();

    expect(document.activeElement).toBe(getDay("2026-03-14"));
  });

  it("closes only once both ends are chosen, and hands focus back to the trigger", async () => {
    mountPicker();
    await openCalendar();

    getDay(PICK_START).click();
    await settle();
    expect(getGrids()).not.toHaveLength(0);

    getDay(PICK_END).click();
    await settle();

    expect(getGrids()).toHaveLength(0);
    expect(document.activeElement).toBe(getTrigger());
  });

  it("closes on Escape and hands focus back to the trigger", async () => {
    mountPicker({ modelValue: RANGE });
    await openCalendar();

    pressKey(document, "Escape");
    await settle();

    expect(getGrids()).toHaveLength(0);
    expect(getTrigger().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(getTrigger());
  });

  it("closes when a pointer lands outside it", async () => {
    mountPicker({ modelValue: RANGE });
    await openCalendar();

    const outside = attachToBody(document.createElement("button"));
    firePointer(outside, "pointerdown");
    await settle();

    expect(getGrids()).toHaveLength(0);
    expect(getTrigger().getAttribute("aria-expanded")).toBe("false");
  });
});

describe("DateTimeRangePicker unavailable and invalid", () => {
  it("refuses to open while disabled, and leaves nothing in the tab order", async () => {
    mountPicker({ modelValue: RANGE, disabled: true });
    await settle();

    expect(getTrigger().disabled).toBe(true);
    expect(getSegments().some((segment) => segment.hasAttribute("tabindex"))).toBe(false);

    await openCalendar();
    expect(getGrids()).toHaveLength(0);
  });

  it("paints the destructive border and announces the error while invalid", async () => {
    mountPicker({ modelValue: RANGE, invalid: true });
    await settle();

    const field = getField();
    expect(field.className).toContain("border-destructive");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    // On the anchor, not the field: Reka spells a marker of its own
    // `data-invalid` on the field group already.
    expect(getAnchor().hasAttribute("data-invalid")).toBe(true);
  });

  it("stays quiet while valid, with no invalid marker to explain away", async () => {
    mountPicker({ modelValue: RANGE });
    await settle();

    const field = getField();
    expect(field.className).not.toContain("border-destructive");
    expect(field.getAttribute("aria-invalid")).toBeNull();
    expect(getAnchor().hasAttribute("data-invalid")).toBe(false);
    expect(getAnchor().hasAttribute("data-out-of-range")).toBe(false);
    expect(getAnchor().hasAttribute("data-backwards")).toBe(false);
  });
});

describe("DateTimeRangePicker attribute routing", () => {
  it("merges a caller's class onto the anchor, so it sizes the whole control", async () => {
    mountPicker({ modelValue: RANGE }, { class: "max-w-xl" });
    await settle();

    expect(getAnchor().className).toContain("max-w-xl");
    expect(getField().className).not.toContain("max-w-xl");
  });

  it("routes every other fallthrough attribute onto the field group it describes", async () => {
    mountPicker(
      { modelValue: RANGE },
      { "aria-describedby": "meeting-hint", "data-testid": "meeting" },
    );
    await settle();

    const field = getField();
    expect(field.getAttribute("aria-describedby")).toBe("meeting-hint");
    expect(field.getAttribute("data-testid")).toBe("meeting");
  });
});

describe("DateTimeRangePicker shape changes", () => {
  it("keeps the same instants when the hour cycle changes underneath it", async () => {
    const wrapper = mountPicker({
      modelValue: { start: "2026-03-14T13:30", end: "2026-03-20T17:00" },
      hourCycle: 24,
    });
    await settle();
    expect(segmentValuesOf("Start")).toEqual(["3", "14", "2026", "13", "30"]);

    await wrapper.setProps({ hourCycle: 12 });
    await settle();

    // Reka builds its formatter and seeds its segment values once, so a field
    // left to patch itself relabels 13:30 as "1:30 AM" — half a day wrong, in
    // both halves at once.
    expect(getSegment("Start", "hour").textContent.trim()).toBe("1");
    expect(getSegment("Start", "dayPeriod").textContent.trim()).toBe("PM");
    expect(getSegment("End", "dayPeriod").textContent.trim()).toBe("PM");
  });

  it("gives a widened granularity a real segment in both halves even when nothing is chosen", async () => {
    const wrapper = mountPicker({ hourCycle: 24 });
    await settle();
    expect(segmentNamesOf("End")).not.toContain("Second");

    await wrapper.setProps({ granularity: "second" });
    await settle();

    expect(segmentNamesOf("End")).toContain("Second");
    expect(getSegment("End", "second").getAttribute("role")).toBe("spinbutton");
  });

  it("rewrites the segments for a locale without rebuilding the field", async () => {
    const wrapper = mountPicker({ modelValue: RANGE, locale: "en-US", hourCycle: 24 });
    await settle();
    const before = getField();

    await wrapper.setProps({ locale: "en-GB" });
    await settle();

    expect(segmentValuesOf("Start")).toEqual(["14", "03", "2026", "09", "30"]);
    // Rebuilding on a change Reka already handles would throw away focus
    // mid-edit, which is why `locale` is not in the field's key.
    expect(getField()).toBe(before);
  });
});

describe("DateTimeRangePicker read-only", () => {
  it("keeps a read-only field a Tab stop and its segments readable, where a disabled one is neither", async () => {
    mountPicker({ modelValue: RANGE, hourCycle: 24, readonly: true });
    await settle();

    // The whole difference between the two states: a read-only span is a value
    // on show and a reader still arrows across both halves to read it.
    expect(
      getSegments().filter((segment) => segment.getAttribute("tabindex") === "0"),
    ).toHaveLength(1);
    expect(getField().hasAttribute("data-readonly")).toBe(true);
    expect(segmentValuesOf("End")).toEqual(["3", "20", "2026", "17", "00"]);
  });

  it("refuses the edit a read-only field is showing", async () => {
    const wrapper = mountPicker({ modelValue: RANGE, hourCycle: 24, readonly: true });
    await settle();

    const hour = getSegment("Start", "hour");
    hour.focus();
    pressKey(hour, "ArrowUp");
    await settle();

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(segmentValuesOf("Start")).toEqual(["3", "14", "2026", "09", "30"]);
  });

  it("drops the calendar button while read-only rather than offering a panel that can choose nothing", async () => {
    mountPicker({ modelValue: RANGE, readonly: true });
    await settle();

    expect(document.querySelector('[aria-label="Open calendar"]')).toBeNull();
  });

  it("tells available, read-only and disabled apart on fill, text colour and border weight", async () => {
    // Three resting appearances, and each pair differs on more than hue.
    // Read-only and disabled used to share `bg-muted` and part on the text
    // colour alone, which is the one distinction a reader with a colour
    // deficiency never receives.
    const available = mountPicker({ modelValue: RANGE });
    await settle();
    expect(getField().classList.contains("bg-background")).toBe(true);
    expect(getField().classList.contains("border-input")).toBe(true);
    // Off the document before the next mount: `getField()` reads the first group
    // in it, and two pickers at once would answer for each other.
    available.unmount();

    const readOnly = mountPicker({ modelValue: RANGE, readonly: true });
    await settle();
    expect(getField().classList.contains("bg-subtle")).toBe(true);
    expect(getField().classList.contains("bg-muted")).toBe(false);
    // A value on show keeps full-strength segments and the crisp rim of a
    // control that is still a Tab stop and still submitted.
    expect(getField().classList.contains("text-foreground")).toBe(true);
    expect(getField().classList.contains("border-input")).toBe(true);
    expect(getField().className).not.toContain("opacity-50");
    readOnly.unmount();

    // The defect this pins: `opacity-50` on the group faded all ten segments and
    // the dash between the halves along with the box, and those are the whole
    // content of the control — `--color-foreground` is 14.09:1 on the field's
    // fill and 2.99:1 once composited at half alpha, the dash 2.02:1. The state
    // is a measured set of colours now, 4.68:1, and all three channels move: the
    // fill drains a step past read-only, the text goes grey, the rim slackens
    // from `input` to `border`.
    mountPicker({ modelValue: RANGE, disabled: true });
    await settle();
    expect(getField().className).not.toContain("opacity-50");
    expect(getField().classList.contains("bg-muted")).toBe(true);
    expect(getField().classList.contains("bg-subtle")).toBe(false);
    expect(getField().classList.contains("text-muted-foreground")).toBe(true);
    expect(getField().classList.contains("text-foreground")).toBe(false);
    expect(getField().classList.contains("border-border")).toBe(true);
    expect(getField().classList.contains("border-input")).toBe(false);
    expect(getField().hasAttribute("data-readonly")).toBe(false);
    // Inheritance is what carries that colour down to the segments, so a
    // segment declaring `text-foreground` of its own would take the fix back.
    expect(getSegments().some((segment) => segment.classList.contains("text-foreground"))).toBe(
      false,
    );
  });

  it("gives the fill to the field group so the ten segments do not come out striped", async () => {
    // Ten segments, their slashes, commas and colons, and the dash between the
    // halves — every one of those a node of its own. A fill declared per segment
    // would leave every separator on the resting colour and write the span as a
    // row of lozenges on a stripe, so nothing inside the group may carry a
    // resting fill — `focus:bg-primary-muted`, which marks the segment under the
    // cursor, is prefixed and therefore not one.
    mountPicker({ modelValue: RANGE, readonly: true });
    await settle();
    expect(getField().classList.contains("bg-subtle")).toBe(true);
    expect(
      [...getField().querySelectorAll<HTMLElement>("*")]
        .filter((node) => [...node.classList].some((name) => name.startsWith("bg-")))
        .map((node) => node.className),
    ).toEqual([]);
  });

  it("keeps the destructive rim on a field that is both invalid and unavailable", async () => {
    // The disabled rule and the invalid rule both name a border colour and
    // `cn()` resolves that by order, so this pins the order: an error that
    // stops being visible the moment the field goes unavailable is an error
    // nobody can act on.
    mountPicker({ modelValue: RANGE, disabled: true, invalid: true });
    await settle();
    expect(getField().classList.contains("border-destructive")).toBe(true);
    expect(getField().classList.contains("border-border")).toBe(false);
    expect(getField().classList.contains("bg-muted")).toBe(true);
  });
});

describe("DateTimeRangePicker inside a Field", () => {
  it("takes its id, description, name, required and invalid state from the row it sits in", async () => {
    mountRow(
      {
        controlId: "meeting",
        describedBy: "meeting-description",
        name: "meeting",
        required: true,
        invalid: true,
      },
      h(DateTimeRangePicker, { modelValue: RANGE }),
    );
    await settle();

    expect(getFormInput().id).toBe("meeting");
    expect(getFormInput().name).toBe("meeting");
    // On the outer group and neither half: the row describes the span, and a
    // description repeated onto the start and the end is read out twice for one
    // value.
    const field = getField();
    expect(field.getAttribute("aria-describedby")).toBe("meeting-description");
    expect(field.getAttribute("aria-required")).toBe("true");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(getHalf("Start").hasAttribute("aria-describedby")).toBe(false);
    expect(getHalf("End").hasAttribute("aria-describedby")).toBe(false);
    expect(getAnchor().hasAttribute("data-invalid")).toBe(true);
  });

  it("takes disabled and readonly from the row, each with its own consequence", async () => {
    const disabled = mountRow({ disabled: true }, h(DateTimeRangePicker, { modelValue: RANGE }));
    await settle();
    expect(getSegments().some((segment) => segment.hasAttribute("tabindex"))).toBe(false);
    expect(getTrigger().disabled).toBe(true);
    disabled.unmount();

    mountRow({ readonly: true }, h(DateTimeRangePicker, { modelValue: RANGE }));
    await settle();
    expect(getField().hasAttribute("data-readonly")).toBe(true);
    expect(document.querySelector('[aria-label="Open calendar"]')).toBeNull();
  });

  it("lets an explicit prop overrule the row in both directions", async () => {
    const optedOut = mountRow(
      { invalid: true, required: true, disabled: true, readonly: true },
      h(DateTimeRangePicker, {
        modelValue: RANGE,
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

    mountRow({}, h(DateTimeRangePicker, { modelValue: RANGE, invalid: true, required: true }));
    await settle();
    expect(getField().getAttribute("aria-invalid")).toBe("true");
    expect(getField().getAttribute("aria-required")).toBe("true");
  });

  it("keeps an out-of-range instant invalid even where the row and the caller both say otherwise", async () => {
    // The markers stay separate claims: `data-invalid` is the row's or the
    // caller's, `data-out-of-range` is the measurement, and only the error
    // presentation is shared.
    mountRow(
      { invalid: false },
      h(DateTimeRangePicker, {
        modelValue: { start: "2026-03-16T09:00", end: "2026-03-16T18:30" },
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
      { describedBy: "meeting-description" },
      h(DateTimeRangePicker, { modelValue: RANGE, "aria-describedby": "booking-rules" }),
    );
    await settle();

    expect(getField().getAttribute("aria-describedby")).toBe("booking-rules meeting-description");
  });

  it("keeps the caller's own id and name ahead of the row's", async () => {
    mountRow(
      { controlId: "row-id", name: "row-name" },
      h(DateTimeRangePicker, { modelValue: RANGE, id: "mine", name: "mine" }),
    );
    await settle();

    // The row's generated id clobbering the caller's would break their
    // `<label for>`, their selectors and browser autofill all at once.
    expect(getFormInput().id).toBe("mine");
    expect(getFormInput().name).toBe("mine");
  });

  it("renders exactly what it renders outside a Field when there is no row above it", async () => {
    mountPicker({ modelValue: RANGE });
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

/**
 * The two half-groups by position rather than by name. `getHalf` finds them by
 * the very string these tests replace, so it cannot be the one that finds them
 * here — and neither can `segmentNamesOf`, which goes through it.
 */
function halves(): HTMLElement[] {
  return [...getField().querySelectorAll<HTMLElement>('[role="group"]')];
}

function halfNames(): (string | null)[] {
  return halves().map((half) => half.getAttribute("aria-label"));
}

function segmentNamesAt(half: 0 | 1): (string | null)[] {
  return [...(halves()[half]?.querySelectorAll<HTMLElement>('[role="spinbutton"]') ?? [])].map(
    (segment) => segment.getAttribute("aria-label"),
  );
}

describe("DateTimeRangePicker labels", () => {
  it("names every segment, both halves and every control in English with no vocabulary above it", async () => {
    mountPicker({ modelValue: RANGE, hourCycle: 24 });
    await settle();
    await openCalendar();

    expect(segmentNamesOf("Start")).toEqual(["Month", "Day", "Year", "Hour", "Minute"]);
    expect(halfNames()).toEqual(["Start date and time", "End date and time"]);
    expect(getTrigger().getAttribute("aria-label")).toBe("Open calendar");
    expect(document.querySelector('[aria-label="Previous month"]')).not.toBeNull();
    expect(document.querySelector('[aria-label="Next month"]')).not.toBeNull();
  });

  it("replaces the name Reka gives the calendar itself, which is not a literal but a prop", async () => {
    mountPicker({ modelValue: RANGE });
    await settle();
    await openCalendar();

    // Reka's own default is `"Event Date"`, published both as the calendar's
    // `aria-label` and inside a visually-hidden live region it renders itself —
    // so a fallthrough attribute could not have reached it.
    const named = [...document.querySelectorAll("[aria-label]")].map((el) =>
      el.getAttribute("aria-label"),
    );
    expect(named.some((name) => name?.startsWith("Calendar,"))).toBe(true);
    expect(named.some((name) => name?.startsWith("Event Date"))).toBe(false);
  });

  it("hands the status line the duration as a signed number of minutes, never as words", async () => {
    mountUnder(
      () => ({
        dateTimeRange: {
          status: ({ minutes }) => (minutes === undefined ? "Chưa chọn" : `${String(minutes)}p`),
        },
      }),
      h(DateTimeRangePicker, {
        modelValue: { start: "2026-03-14T09:00", end: "2026-03-14T10:30" },
      }),
    );
    await settle();
    await openCalendar();

    // 90, not "1 hour 30 minutes". The `unit(count, name)` that appended an
    // `"s"` here is deleted rather than extracted: a host with
    // `Intl.DurationFormat`, or a language with one plural form, builds its own
    // sentence out of the number.
    expect(getStatus().textContent).toBe("90p");
  });

  it("signs the duration so an end before its start needs no second flag", async () => {
    mountUnder(
      () => ({
        dateTimeRange: {
          status: ({ minutes }) =>
            minutes !== undefined && minutes < 0 ? "Ngược" : String(minutes ?? "?"),
        },
      }),
      h(DateTimeRangePicker, {
        modelValue: { start: "2026-03-14T17:00", end: "2026-03-14T09:00" },
      }),
    );
    await settle();
    await openCalendar();

    expect(getStatus().textContent).toBe("Ngược");
  });

  it("hands a calendar cell its date and its part in the range rather than a joined phrase", async () => {
    mountUnder(
      () => ({
        rangeCell: {
          cell: ({ date, part }) =>
            part === undefined ? `ngày ${String(date.day)}` : `${part}: ${String(date.day)}`,
        },
      }),
      h(DateTimeRangePicker, { modelValue: RANGE }),
    );
    await settle();
    await openCalendar();

    expect(getDay("2026-03-14").getAttribute("aria-label")).toBe("start: 14");
    expect(getDay("2026-03-20").getAttribute("aria-label")).toBe("end: 20");
    expect(getDay("2026-03-17").getAttribute("aria-label")).toBe("within: 17");
    expect(getDay("2026-03-25").getAttribute("aria-label")).toBe("ngày 25");
  });

  it("takes an instance's own labels prop over its English, key by key", async () => {
    mountPicker({
      modelValue: RANGE,
      hourCycle: 24,
      labels: { hour: "Giờ", startDate: "Bắt đầu" },
    });
    await settle();

    // The keys the prop did not name stay English rather than blanking out.
    expect(segmentNamesAt(1)).toEqual(["Month", "Day", "Year", "Giờ", "Minute"]);
    expect(halfNames()).toEqual(["Bắt đầu", "End date and time"]);
  });

  it("takes a host's vocabulary across all five of its slots", async () => {
    mountUnder(
      () => ({
        dateSegments: { month: "Tháng", day: "Ngày", year: "Năm" },
        timeSegments: { hour: "Giờ", minute: "Phút" },
        calendarPanel: { openCalendar: "Mở lịch" },
        rangeCell: { cell: ({ date }) => `ngày ${String(date.day)}` },
        dateTimeRange: { startDate: "Bắt đầu", endDate: "Kết thúc" },
      }),
      h(DateTimeRangePicker, { modelValue: RANGE, hourCycle: 24 }),
    );
    await settle();
    await openCalendar();

    expect(segmentNamesAt(0)).toEqual(["Tháng", "Ngày", "Năm", "Giờ", "Phút"]);
    expect(halfNames()).toEqual(["Bắt đầu", "Kết thúc"]);
    expect(getTrigger().getAttribute("aria-label")).toBe("Mở lịch");
    expect(getDay("2026-03-17").getAttribute("aria-label")).toBe("ngày 17");
  });

  it("lets the instance's prop beat the host's vocabulary", async () => {
    mountUnder(
      () => ({ dateTimeRange: { startDate: "Bắt đầu" } }),
      h(DateTimeRangePicker, { modelValue: RANGE, labels: { startDate: "Nhận phòng" } }),
    );
    await settle();

    expect(halfNames()).toEqual(["Nhận phòng", "End date and time"]);
  });

  it("repaints every name when the host switches language under it", async () => {
    const locale = ref("en");
    mountUnder(
      () =>
        locale.value === "en"
          ? {}
          : {
              timeSegments: { hour: "Giờ" },
              calendarPanel: { openCalendar: "Mở lịch" },
              dateTimeRange: { startDate: "Bắt đầu" },
            },
      h(DateTimeRangePicker, { modelValue: RANGE, hourCycle: 24 }),
    );
    await settle();
    expect(getTrigger().getAttribute("aria-label")).toBe("Open calendar");

    locale.value = "vi";
    await settle();

    // This is the assertion that fails the moment a label is resolved once in
    // `setup` instead of inside the render effect — a change that passes every
    // other test here and breaks every language switch.
    expect(segmentNamesAt(0)).toEqual(["Month", "Day", "Year", "Giờ", "Minute"]);
    expect(halfNames()).toEqual(["Bắt đầu", "End date and time"]);
    expect(getTrigger().getAttribute("aria-label")).toBe("Mở lịch");
  });

  it("reads an explicitly undefined override as no opinion rather than as a blank name", async () => {
    mountPicker({ modelValue: RANGE, labels: { startDate: undefined } });
    await settle();

    expect(halfNames()).toEqual(["Start date and time", "End date and time"]);
  });
});
