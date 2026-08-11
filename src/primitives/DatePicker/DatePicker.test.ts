import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { getLocalTimeZone, today } from "@internationalized/date";
import DatePicker from "./DatePicker.vue";
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

function getTrigger(): HTMLButtonElement {
  const trigger = document.querySelector<HTMLButtonElement>('[aria-label="Open calendar"]');
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

    const named = getSegments().map((segment) =>
      segment.getAttribute("aria-label")?.trim().replace(/,$/, ""),
    );
    expect(named).toEqual(["month", "day", "year"]);
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
