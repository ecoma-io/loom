import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, type VNode } from "vue";
import { getLocalTimeZone, today } from "@internationalized/date";
import DateRangePicker from "./DateRangePicker.vue";
import { provideFieldContext } from "../../lib/field-context";
import { attachToBody } from "../../testing/attach-to-body";

// The same jsdom gaps DatePicker's suite stubs, for the same reason: the panel
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
  props: Partial<InstanceType<typeof DateRangePicker>["$props"]> = {},
  attrs = {},
) {
  return mount(DateRangePicker, { props, attrs, attachTo: document.body });
}

/** The outer field group — the two half-groups inside it carry a name of their own. */
function getField(): HTMLElement {
  const field = document.querySelector<HTMLElement>(
    '[role="group"]:not([aria-label="Start date"]):not([aria-label="End date"])',
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
  const half = document.querySelector<HTMLElement>(`[role="group"][aria-label="${type} date"]`);
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

function getTrigger(): HTMLButtonElement {
  const trigger = document.querySelector<HTMLButtonElement>('[aria-label="Open calendar"]');
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
 * The cell for a day in the month it belongs to. With two months on screen the
 * same date is also rendered as a spill-over cell in the neighbouring grid, so
 * matching on `data-value` alone picks an arbitrary one of the two.
 */
function getDay(iso: string): HTMLElement {
  const day = document.querySelector<HTMLElement>(`[data-value="${iso}"]:not([data-outside-view])`);
  if (!day) throw new Error(`no cell for ${iso}`);
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

const START = "2026-03-14";
const END = "2026-03-20";
const RANGE = { start: START, end: END };

// A range picked by clicking has to be picked out of the month the calendar
// actually opens on, and with nothing bound that is the month containing
// today — so the two dates below move with the clock while the pair above
// stays fixed for the tests that bind a value and read it back.
const VISIBLE_MONTH = today(getLocalTimeZone()).set({ day: 1 });
const PICK_START = VISIBLE_MONTH.set({ day: 8 }).toString();
const PICK_END = VISIBLE_MONTH.set({ day: 14 }).toString();

describe("DateRangePicker field", () => {
  it("renders both halves of the range as their own named group of segments", async () => {
    mountPicker({ modelValue: RANGE });
    await settle();

    expect(getSegmentsOf("Start").map((segment) => segment.textContent.trim())).toEqual([
      "3",
      "14",
      "2026",
    ]);
    expect(getSegmentsOf("End").map((segment) => segment.textContent.trim())).toEqual([
      "3",
      "20",
      "2026",
    ]);
  });

  it("names the halves rather than leaving six segments called month, day and year", async () => {
    mountPicker({ modelValue: RANGE });
    await settle();

    // Reka labels a segment by its part alone, so both halves say "month".
    // Without the group name there is nothing to tell a reader which end of
    // the range they are typing into.
    const labels = getSegments().map((segment) =>
      segment.getAttribute("aria-label")?.trim().replace(/,$/, ""),
    );
    expect(labels).toEqual(["month", "day", "year", "month", "day", "year"]);
    expect(getHalf("Start").getAttribute("aria-label")).toBe("Start date");
    expect(getHalf("End").getAttribute("aria-label")).toBe("End date");
  });

  it("orders the segments the way the locale writes a date", async () => {
    const wrapper = mountPicker({ modelValue: RANGE, locale: "en-GB" });
    await settle();
    expect(getSegmentsOf("Start").map((segment) => segment.textContent.trim())).toEqual([
      "14",
      "03",
      "2026",
    ]);

    await wrapper.setProps({ locale: "en-US" });
    await settle();
    expect(getSegmentsOf("Start").map((segment) => segment.textContent.trim())).toEqual([
      "3",
      "14",
      "2026",
    ]);
  });

  it("is a single Tab stop across both halves, not one per half", async () => {
    mountPicker({ modelValue: RANGE });
    await settle();

    expect(getSegments().map((segment) => segment.getAttribute("tabindex"))).toEqual([
      "0",
      "-1",
      "-1",
      "-1",
      "-1",
      "-1",
    ]);
  });

  it("moves the Tab stop with focus as the arrow keys walk from one half into the other", async () => {
    mountPicker({ modelValue: RANGE });
    await settle();

    // Three ArrowRights from the start's month reach the end's month, which is
    // the run the single Tab stop exists to keep whole.
    const segments = getSegments();
    const from = segments[0];
    if (!from) throw new Error("expected a first segment");
    from.focus();
    pressKey(from, "ArrowRight");
    pressKey(document.activeElement ?? from, "ArrowRight");
    pressKey(document.activeElement ?? from, "ArrowRight");
    await settle();

    expect(document.activeElement).toBe(getSegmentsOf("End")[0]);
    expect(getSegments().map((segment) => segment.getAttribute("tabindex"))).toEqual([
      "-1",
      "-1",
      "-1",
      "0",
      "-1",
      "-1",
    ]);
  });

  it("reports the whole range when one segment of one half is typed", async () => {
    const wrapper = mountPicker({ modelValue: RANGE });
    await settle();

    const day = getSegmentsOf("End")[1];
    if (!day) throw new Error("expected an end day segment");
    day.focus();
    pressKey(day, "ArrowUp");
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      { start: START, end: "2026-03-21" },
    ]);
  });

  it("names the whole control once, on the group both halves sit in", async () => {
    mountPicker({ modelValue: RANGE }, { "aria-label": "Report window" });
    await settle();

    expect(getField().getAttribute("aria-label")).toBe("Report window");
    expect(
      getSegments().every((segment) => segment.getAttribute("aria-label") !== "Report window"),
    ).toBe(true);
  });
});

describe("DateRangePicker ISO boundary", () => {
  it("selects exactly the days the two ISO strings fence, ends included", async () => {
    mountPicker({ modelValue: RANGE });
    await openCalendar();

    const selected = getDays()
      .filter((day) => day.hasAttribute("data-selected") && !day.hasAttribute("data-outside-view"))
      .map((day) => day.getAttribute("data-value"));
    expect(selected).toEqual([
      "2026-03-14",
      "2026-03-15",
      "2026-03-16",
      "2026-03-17",
      "2026-03-18",
      "2026-03-19",
      "2026-03-20",
    ]);
    expect(getCellOf(getDay(START)).getAttribute("aria-selected")).toBe("true");
    expect(getCellOf(getDay("2026-03-21")).getAttribute("aria-selected")).toBeNull();
  });

  it("reports both clicked days back as ISO strings", async () => {
    const wrapper = mountPicker();
    await openCalendar();

    getDay(PICK_START).click();
    await settle();
    getDay(PICK_END).click();
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      { start: PICK_START, end: PICK_END },
    ]);
  });

  it("holds a half-made range rather than waiting for the second click", async () => {
    const wrapper = mountPicker();
    await openCalendar();

    getDay(PICK_START).click();
    await settle();

    // The state between the two clicks is a real one and the model can say it:
    // a start, no end, and no invented second value standing in for one.
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([{ start: PICK_START }]);
    // And the calendar is still there, because the reader is not finished.
    expect(getGrids()).not.toHaveLength(0);
  });

  it("sorts a range picked backwards rather than refusing the second click", async () => {
    const wrapper = mountPicker();
    await openCalendar();

    getDay(PICK_END).click();
    await settle();
    getDay(PICK_START).click();
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      { start: PICK_START, end: PICK_END },
    ]);
  });

  it("holds a range of one day, where the first day is also the last", async () => {
    const wrapper = mountPicker();
    await openCalendar();

    getDay(PICK_START).click();
    await settle();
    getDay(PICK_START).click();
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      { start: PICK_START, end: PICK_START },
    ]);
  });

  it("reads a half that does not parse as that half not chosen, rather than throwing", async () => {
    mountPicker({ modelValue: { start: "14/03/2026", end: PICK_END } });
    await openCalendar();

    const selected = getDays().filter((day) => day.hasAttribute("data-selected"));
    expect(selected.map((day) => day.getAttribute("data-value"))).toEqual([PICK_END]);
  });

  it("reads an empty value as nothing chosen", async () => {
    mountPicker({ modelValue: {} });
    await openCalendar();

    expect(getDays().some((day) => day.hasAttribute("data-selected"))).toBe(false);
    expect(getSegments().every((segment) => segment.hasAttribute("data-placeholder"))).toBe(true);
  });

  it("hands back Gregorian ISO strings even where the locale reads another calendar", async () => {
    const wrapper = mountPicker({ locale: "th-TH" });
    await openCalendar();

    const now = today(getLocalTimeZone());
    const day = document.querySelector<HTMLElement>("[data-today]");
    day?.click();
    await settle();

    expect(getSegmentsOf("Start").at(-1)?.textContent.trim()).toBe(String(now.year + 543));
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([{ start: now.toString() }]);
  });

  it("follows a range the host changes underneath it", async () => {
    const wrapper = mountPicker({ modelValue: RANGE });
    await wrapper.setProps({ modelValue: { start: "2026-03-02", end: "2026-03-04" } });
    await openCalendar();

    const selected = getDays()
      .filter((day) => day.hasAttribute("data-selected") && !day.hasAttribute("data-outside-view"))
      .map((day) => day.getAttribute("data-value"));
    expect(selected).toEqual(["2026-03-02", "2026-03-03", "2026-03-04"]);
  });
});

describe("DateRangePicker range states", () => {
  it("tells the first day, the last day and the days between apart without using colour", async () => {
    mountPicker({ modelValue: RANGE });
    await openCalendar();

    expect(getDay(START).getAttribute("aria-label")).toContain("first day of the range");
    expect(getDay(END).getAttribute("aria-label")).toContain("last day of the range");
    expect(getDay("2026-03-17").getAttribute("aria-label")).toContain("within the range");
    // The date itself is still the front of the name, so the part is an
    // addition rather than a replacement of what the cell is.
    expect(getDay(START).getAttribute("aria-label")).toContain("14");
    expect(getDay("2026-03-25").getAttribute("aria-label")).not.toContain("range");
  });

  it("announces a one-day range as one day rather than as two coinciding ends", async () => {
    mountPicker({ modelValue: { start: START, end: START } });
    await openCalendar();

    expect(getDay(START).getAttribute("aria-label")).toContain(
      "the whole range, first and last day",
    );
  });

  it("gives the three states three fills and never rounds the days between", async () => {
    mountPicker({ modelValue: RANGE });
    await openCalendar();

    expect(getDay(START).hasAttribute("data-selection-start")).toBe(true);
    expect(getDay(END).hasAttribute("data-selection-end")).toBe(true);

    const middle = getDay("2026-03-17");
    expect(middle.hasAttribute("data-selected")).toBe(true);
    expect(middle.hasAttribute("data-selection-start")).toBe(false);
    expect(middle.hasAttribute("data-selection-end")).toBe(false);
    // The middle fill and the square corners that make the band continuous are
    // both written as `:not()` of the two ends, so no cell can take two
    // backgrounds and have the stylesheet decide which one wins.
    const classes = middle.className;
    expect(classes).toContain(
      "[&[data-selected]:not([data-selection-start]):not([data-selection-end])]:bg-primary-muted",
    );
    expect(classes).toContain(
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

describe("DateRangePicker status line", () => {
  it("asks for a first day while nothing is chosen", async () => {
    mountPicker();
    await openCalendar();

    expect(getStatus().textContent).toContain("Choose the first day");
  });

  it("names the chosen end and asks for the other one while the range is half made", async () => {
    mountPicker();
    await openCalendar();

    getDay(PICK_START).click();
    await settle();

    // The pointer reader sees the preview band; this is the same information
    // reaching a reader who cannot, and it is a live region so it arrives
    // without them going looking for it.
    const status = getStatus();
    expect(status.getAttribute("role")).toBe("status");
    expect(status.textContent).toContain(String(VISIBLE_MONTH.set({ day: 8 }).day));
    expect(status.textContent).toContain("Choose the last day");
  });

  it("summarises the finished range and counts its days, both ends included", async () => {
    mountPicker({ modelValue: RANGE });
    await openCalendar();

    expect(getStatus().textContent).toBe("March 14, 2026 to March 20, 2026, 7 days.");
  });

  it("counts a one-day range as one day", async () => {
    mountPicker({ modelValue: { start: START, end: START } });
    await openCalendar();

    expect(getStatus().textContent).toContain("1 day.");
  });

  it("writes the summary in the locale the field is written in", async () => {
    mountPicker({ modelValue: RANGE, locale: "en-GB" });
    await openCalendar();

    expect(getStatus().textContent).toContain("14 March 2026");
  });
});

describe("DateRangePicker calendar", () => {
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
    // findable and unfocusable, and the arrow keys would stop dead at the end
    // of the first month with nothing said.
    const days = getDays();
    expect(days.filter((day) => day.getAttribute("data-value") === "2026-04-01")).not.toHaveLength(
      0,
    );
    expect(days.length % 7).toBe(0);
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

  it("marks today and keeps an out-of-bounds day unreachable by keyboard", async () => {
    const now = today(getLocalTimeZone());
    mountPicker({ min: now.toString() });
    await openCalendar();

    expect(getDay(now.toString()).getAttribute("aria-current")).toBe("date");
    const before = getDay(now.subtract({ days: 1 }).toString());
    expect(before.getAttribute("aria-disabled")).toBe("true");
    expect(before.hasAttribute("tabindex")).toBe(false);
    expect(getDay(now.toString()).getAttribute("tabindex")).toBe("0");
  });

  it("moves the grid's own single Tab stop with the arrow keys", async () => {
    mountPicker({ modelValue: RANGE });
    await openCalendar();

    const start = getDay(START);
    start.focus();
    pressKey(start, "ArrowRight");
    await settle();

    expect(document.activeElement).toBe(getDay("2026-03-15"));
  });

  it("still opens when the whole visible month is out of bounds", async () => {
    mountPicker({ min: "2099-01-01" });
    await openCalendar();

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
    expect(classes).toContain("data-[state=open]:animate-fade-rise");
    expect(classes).not.toContain("animate-fade-rise");
  });
});

describe("DateRangePicker overlay focus", () => {
  it("opens onto the day the calendar is already sitting on", async () => {
    mountPicker({ modelValue: RANGE });
    await openCalendar();

    expect(document.activeElement).toBe(getDay(START));
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

describe("DateRangePicker unavailable and invalid", () => {
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
    // On the anchor, not the field: Reka spells its own out-of-range marker
    // `data-invalid` on the field group already.
    expect(getAnchor().hasAttribute("data-invalid")).toBe(true);
  });

  it("stays quiet while valid, with no invalid marker to explain away", async () => {
    mountPicker({ modelValue: RANGE });
    await settle();

    const field = getField();
    expect(field.className).not.toContain("border-destructive");
    expect(field.getAttribute("aria-invalid")).toBeNull();
  });
});

describe("DateRangePicker attribute routing", () => {
  it("merges a caller's class onto the anchor, so it sizes the whole control", async () => {
    mountPicker({ modelValue: RANGE }, { class: "max-w-md" });
    await settle();

    expect(getAnchor().className).toContain("max-w-md");
    expect(getField().className).not.toContain("max-w-md");
  });

  it("routes every other fallthrough attribute onto the field group it describes", async () => {
    mountPicker(
      { modelValue: RANGE },
      { "aria-describedby": "window-hint", "data-testid": "report-window" },
    );
    await settle();

    const field = getField();
    expect(field.getAttribute("aria-describedby")).toBe("window-hint");
    expect(field.getAttribute("data-testid")).toBe("report-window");
  });
});

describe("DateRangePicker read-only", () => {
  it("keeps a read-only field a Tab stop and its segments readable, where a disabled one is neither", async () => {
    mountPicker({ modelValue: RANGE, readonly: true });
    await settle();

    // The whole difference between the two states: a read-only span is a value
    // on show and a reader still arrows across both halves to read it.
    expect(getSegments().map((segment) => segment.getAttribute("tabindex"))).toEqual([
      "0",
      "-1",
      "-1",
      "-1",
      "-1",
      "-1",
    ]);
    expect(getField().hasAttribute("data-readonly")).toBe(true);
    expect(getSegmentsOf("End").map((segment) => segment.textContent.trim())).toEqual([
      "3",
      "20",
      "2026",
    ]);
  });

  it("refuses the edit a read-only field is showing", async () => {
    const wrapper = mountPicker({ modelValue: RANGE, readonly: true });
    await settle();

    const [day] = getSegmentsOf("Start").slice(1);
    if (!day) throw new Error("expected a start day segment");
    day.focus();
    pressKey(day, "ArrowUp");
    await settle();

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(getSegmentsOf("Start").map((segment) => segment.textContent.trim())).toEqual([
      "3",
      "14",
      "2026",
    ]);
  });

  it("drops the calendar button while read-only rather than offering a panel that can choose nothing", async () => {
    mountPicker({ modelValue: RANGE, readonly: true });
    await settle();

    expect(document.querySelector('[aria-label="Open calendar"]')).toBeNull();
  });

  it("shows a read-only field as filled rather than dimmed, so it does not read as unavailable", async () => {
    const readOnly = mountPicker({ modelValue: RANGE, readonly: true });
    await settle();
    expect(getField().className).toContain("bg-muted");
    expect(getField().className).not.toContain("opacity-50");
    // Off the document before the next mount: `getField()` reads the first
    // group in it, and two pickers at once would answer for each other.
    readOnly.unmount();

    mountPicker({ modelValue: RANGE, disabled: true });
    await settle();
    expect(getField().className).toContain("opacity-50");
    expect(getField().className).not.toContain("bg-muted");
    expect(getField().hasAttribute("data-readonly")).toBe(false);
  });
});

describe("DateRangePicker inside a Field", () => {
  it("takes its id, description, name, required and invalid state from the row it sits in", async () => {
    mountRow(
      {
        controlId: "period",
        describedBy: "period-description",
        name: "period",
        required: true,
        invalid: true,
      },
      h(DateRangePicker, { modelValue: RANGE }),
    );
    await settle();

    expect(getFormInput().id).toBe("period");
    expect(getFormInput().name).toBe("period");
    // On the outer group and neither half: the row describes the span, and a
    // description repeated onto the start and the end is read out twice for
    // one value.
    const field = getField();
    expect(field.getAttribute("aria-describedby")).toBe("period-description");
    expect(field.getAttribute("aria-required")).toBe("true");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(getHalf("Start").hasAttribute("aria-describedby")).toBe(false);
    expect(getHalf("End").hasAttribute("aria-describedby")).toBe(false);
    expect(getAnchor().hasAttribute("data-invalid")).toBe(true);
  });

  it("takes disabled and readonly from the row, each with its own consequence", async () => {
    const disabled = mountRow({ disabled: true }, h(DateRangePicker, { modelValue: RANGE }));
    await settle();
    expect(getSegments().some((segment) => segment.hasAttribute("tabindex"))).toBe(false);
    expect(getTrigger().disabled).toBe(true);
    disabled.unmount();

    mountRow({ readonly: true }, h(DateRangePicker, { modelValue: RANGE }));
    await settle();
    expect(getField().hasAttribute("data-readonly")).toBe(true);
    expect(document.querySelector('[aria-label="Open calendar"]')).toBeNull();
  });

  it("lets an explicit prop overrule the row in both directions", async () => {
    const optedOut = mountRow(
      { invalid: true, required: true, disabled: true, readonly: true },
      h(DateRangePicker, {
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

    mountRow({}, h(DateRangePicker, { modelValue: RANGE, invalid: true, required: true }));
    await settle();
    expect(getField().getAttribute("aria-invalid")).toBe("true");
    expect(getField().getAttribute("aria-required")).toBe("true");
  });

  it("adds the row's description to one the caller already set rather than replacing it", async () => {
    mountRow(
      { describedBy: "period-description" },
      h(DateRangePicker, { modelValue: RANGE, "aria-describedby": "booking-rules" }),
    );
    await settle();

    expect(getField().getAttribute("aria-describedby")).toBe("booking-rules period-description");
  });

  it("keeps the caller's own id and name ahead of the row's", async () => {
    mountRow(
      { controlId: "row-id", name: "row-name" },
      h(DateRangePicker, { modelValue: RANGE, id: "mine", name: "mine" }),
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
