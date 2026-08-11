import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import TimePicker from "./TimePicker.vue";

// Nothing here is portalled — there is no panel — so the jsdom stubs DatePicker
// needs for Reka's dismiss layer and floating machinery have nothing to answer
// for. What is still needed is a tree that is really in the document: Reka
// collects the segment elements on mount by walking the rendered field, and
// focus does not move in jsdom for a detached node.
enableAutoUnmount(afterEach);

// Reka reads the segment elements in `onMounted` and rebuilds them a tick after
// a locale change, so the assertions wait for the queue to drain rather than
// reading a field that is still assembling itself.
async function settle() {
  await nextTick();
  await nextTick();
}

function mountPicker(props: Partial<InstanceType<typeof TimePicker>["$props"]> = {}, attrs = {}) {
  return mount(TimePicker, { props, attrs, attachTo: document.body });
}

function getField(): HTMLElement {
  const field = document.querySelector<HTMLElement>('[role="group"]');
  if (!field) throw new Error("no field rendered");
  return field;
}

/** The editable segments only — Reka renders the `:` separator as a segment too. */
function getSegments(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[role="spinbutton"]')];
}

function getSegment(part: string): HTMLElement {
  const segment = document.querySelector<HTMLElement>(`[data-reka-time-field-segment="${part}"]`);
  if (!segment) throw new Error(`no ${part} segment rendered`);
  return segment;
}

function segmentNames(): (string | undefined)[] {
  return getSegments().map((segment) =>
    segment.getAttribute("aria-label")?.trim().replace(/,$/, ""),
  );
}

function segmentValues(): string[] {
  return getSegments().map((segment) => segment.textContent.trim());
}

// `code` as well as `key`: Reka's field navigation switches on `event.key`, and
// an event carrying only one of the two silently exercises half the component.
function pressKey(el: EventTarget, key: string) {
  el.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key, code: key }),
  );
}

describe("TimePicker field", () => {
  it("renders one spinbutton per time part, each with its own accessible name", async () => {
    mountPicker({ modelValue: "09:30", hourCycle: 24 });
    await settle();

    expect(segmentNames()).toEqual(["hour", "minute"]);
  });

  it("shows the bound time across the segments rather than as one string", async () => {
    mountPicker({ modelValue: "09:30", hourCycle: 24 });
    await settle();

    expect(segmentValues()).toEqual(["09", "30"]);
  });

  it("is a single Tab stop, with the segments roving inside it", async () => {
    mountPicker({ modelValue: "09:30", hourCycle: 24 });
    await settle();

    expect(getSegments().map((segment) => segment.getAttribute("tabindex"))).toEqual(["0", "-1"]);
  });

  it("moves the Tab stop with focus as the arrow keys walk the segments", async () => {
    mountPicker({ modelValue: "09:30", hourCycle: 24 });
    await settle();

    const hour = getSegment("hour");
    hour.focus();
    pressKey(hour, "ArrowRight");
    await settle();

    expect(document.activeElement).toBe(getSegment("minute"));
    // The point of the roving stop: Shift+Tab back into the field returns to
    // the segment the reader left, not to the first one.
    expect(getSegments().map((segment) => segment.getAttribute("tabindex"))).toEqual(["-1", "0"]);
  });

  it("leaves the separator out of the accessibility tree and out of the tab order", async () => {
    mountPicker({ modelValue: "09:30", hourCycle: 24 });
    await settle();

    const literal = document.querySelector<HTMLElement>('[data-reka-time-field-segment="literal"]');
    expect(literal?.getAttribute("aria-hidden")).toBe("true");
    expect(literal?.hasAttribute("tabindex")).toBe(false);
  });

  it("names the whole control once, on the group the segments sit in", async () => {
    mountPicker({ modelValue: "09:30" }, { "aria-label": "Starts at" });
    await settle();

    expect(getField().getAttribute("aria-label")).toBe("Starts at");
    // Not repeated onto each segment, which would have a screen reader announce
    // "Starts at" once per segment for one field.
    expect(
      getSegments().every((segment) => segment.getAttribute("aria-label") !== "Starts at"),
    ).toBe(true);
  });

  it("carries no timezone segment, because a time of day has no timezone", async () => {
    mountPicker({ modelValue: "09:30" });
    await settle();

    expect(document.querySelector('[data-segment="timeZoneName"]')).toBeNull();
    expect(segmentNames()).not.toContain("timezone");
  });
});

describe("TimePicker clock-string boundary", () => {
  it("reports a typed change as a 24-hour HH:mm string", async () => {
    const wrapper = mountPicker({ modelValue: "09:30", hourCycle: 24 });
    await settle();

    const minute = getSegment("minute");
    minute.focus();
    pressKey(minute, "ArrowUp");
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([["09:31"]]);
  });

  it("keeps the value 24-hour while the field is displaying it as 12-hour", async () => {
    const wrapper = mountPicker({ modelValue: "13:30", hourCycle: 12 });
    await settle();

    expect(segmentValues()).toEqual(["1", "30", "PM"]);

    const minute = getSegment("minute");
    minute.focus();
    pressKey(minute, "ArrowUp");
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([["13:31"]]);
  });

  it("reports seconds only where the granularity asks for them", async () => {
    const wrapper = mountPicker({ modelValue: "09:30:15", granularity: "second", hourCycle: 24 });
    await settle();

    expect(segmentNames()).toEqual(["hour", "minute", "second"]);

    const second = getSegment("second");
    second.focus();
    pressKey(second, "ArrowUp");
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([["09:30:16"]]);
  });

  it("drops the seconds it is not showing rather than reporting a value the field never displayed", async () => {
    const wrapper = mountPicker({ modelValue: "09:30:45", hourCycle: 24 });
    await settle();

    expect(segmentNames()).toEqual(["hour", "minute"]);

    const minute = getSegment("minute");
    minute.focus();
    pressKey(minute, "ArrowUp");
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([["09:31"]]);
  });

  it("renders the hour alone at hour granularity and still reports HH:mm", async () => {
    const wrapper = mountPicker({ modelValue: "09:00", granularity: "hour", hourCycle: 24 });
    await settle();

    expect(segmentNames()).toEqual(["hour"]);

    const hour = getSegment("hour");
    hour.focus();
    pressKey(hour, "ArrowUp");
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([["10:00"]]);
  });

  it("accepts a seconds-bearing string at minute granularity without throwing", async () => {
    mountPicker({ modelValue: "23:59:59", hourCycle: 24 });
    await settle();

    expect(segmentValues()).toEqual(["23", "59"]);
  });

  it("reads a value that does not parse as no time chosen, rather than throwing", async () => {
    const wrapper = mountPicker({ modelValue: "half past nine", hourCycle: 24 });
    await settle();

    expect(getSegments().every((segment) => segment.hasAttribute("data-placeholder"))).toBe(true);
    // Nothing is reported back either: a host's bad string is read as empty,
    // not quietly rewritten to a time nobody chose.
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("reads an empty value as no time chosen", async () => {
    mountPicker({ modelValue: "", hourCycle: 24 });
    await settle();

    expect(getSegments().every((segment) => segment.hasAttribute("data-placeholder"))).toBe(true);
  });

  it("reports no value at all once the field has been emptied", async () => {
    const wrapper = mountPicker({ modelValue: "09:30", hourCycle: 24 });
    await settle();

    const minute = getSegment("minute");
    minute.focus();
    // Two presses: the first drops a digit, the second empties the segment, and
    // an empty segment is what makes the whole time no time.
    pressKey(minute, "Backspace");
    pressKey(minute, "Backspace");
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([undefined]);
  });

  it("follows a value the host changes underneath it", async () => {
    const wrapper = mountPicker({ modelValue: "09:30", hourCycle: 24 });
    await settle();

    await wrapper.setProps({ modelValue: "17:45" });
    await settle();

    expect(segmentValues()).toEqual(["17", "45"]);
  });
});

describe("TimePicker hour cycle", () => {
  it("follows the locale when no cycle is asked for", async () => {
    const american = mountPicker({ modelValue: "13:30", locale: "en-US" });
    await settle();
    expect(segmentNames()).toEqual(["hour", "minute", "AM/PM"]);
    expect(segmentValues()).toEqual(["1", "30", "PM"]);
    american.unmount();

    mountPicker({ modelValue: "13:30", locale: "en-GB" });
    await settle();
    expect(segmentNames()).toEqual(["hour", "minute"]);
    expect(segmentValues()).toEqual(["13", "30"]);
  });

  it("shows an AM/PM segment on a 12-hour cycle and none on a 24-hour one", async () => {
    const twelve = mountPicker({ modelValue: "13:30", hourCycle: 12, locale: "en-GB" });
    await settle();
    expect(segmentNames()).toEqual(["hour", "minute", "AM/PM"]);
    twelve.unmount();

    mountPicker({ modelValue: "13:30", hourCycle: 24, locale: "en-US" });
    await settle();
    expect(segmentNames()).toEqual(["hour", "minute"]);
  });

  it("announces the hour segment as the reader sees it, not as the value stores it", async () => {
    mountPicker({ modelValue: "13:30", hourCycle: 12 });
    await settle();

    const hour = getSegment("hour");
    // Reka publishes the internal 24-hour value here against a 1–12 range, so
    // half past one in the afternoon announces itself as "13 PM" — out of the
    // segment's own declared bounds.
    expect(hour.getAttribute("aria-valuemax")).toBe("12");
    expect(hour.getAttribute("aria-valuenow")).toBe("1");
    expect(hour.getAttribute("aria-valuetext")).toBe("1 PM");
  });

  it("keeps announcing an unfilled hour as empty rather than as a number", async () => {
    mountPicker({ hourCycle: 12 });
    await settle();

    // The rewritten announcement has nothing to say about a segment showing its
    // placeholder, and Reka's "Empty" is already the right thing to say.
    expect(getSegment("hour").getAttribute("aria-valuetext")).toBe("Empty");
  });

  it("leaves the hour announcement to the formatter on a 24-hour cycle", async () => {
    mountPicker({ modelValue: "13:30", hourCycle: 24 });
    await settle();

    const hour = getSegment("hour");
    expect(hour.getAttribute("aria-valuemax")).toBe("23");
    expect(hour.getAttribute("aria-valuenow")).toBe("13");
  });
});

describe("TimePicker midnight and noon", () => {
  it("displays midnight as 12 AM and noon as 12 PM", async () => {
    const midnight = mountPicker({ modelValue: "00:00", hourCycle: 12 });
    await settle();
    expect(segmentValues()).toEqual(["12", "00", "AM"]);
    midnight.unmount();

    mountPicker({ modelValue: "12:00", hourCycle: 12 });
    await settle();
    expect(segmentValues()).toEqual(["12", "00", "PM"]);
  });

  it("stores 12 AM as 00 and 12 PM as 12", async () => {
    const wrapper = mountPicker({ modelValue: "00:30", hourCycle: 12 });
    await settle();

    // AM to PM on the same displayed hour: 12:30 AM is half past midnight and
    // 12:30 PM is half past noon, twelve hours apart rather than one.
    const period = getSegment("dayPeriod");
    period.focus();
    pressKey(period, "p");
    await settle();
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["12:30"]);

    pressKey(period, "a");
    await settle();
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["00:30"]);
  });

  it("moves the whole value by twelve hours when AM/PM is toggled from the keyboard", async () => {
    const wrapper = mountPicker({ modelValue: "09:15", hourCycle: 12 });
    await settle();

    const period = getSegment("dayPeriod");
    period.focus();
    pressKey(period, "ArrowUp");
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["21:15"]);
  });

  it("reaches the AM/PM segment by keyboard alone", async () => {
    mountPicker({ modelValue: "09:15", hourCycle: 12 });
    await settle();

    const hour = getSegment("hour");
    hour.focus();
    pressKey(hour, "ArrowRight");
    await settle();
    pressKey(document.activeElement as HTMLElement, "ArrowRight");
    await settle();

    expect(document.activeElement).toBe(getSegment("dayPeriod"));
    expect(getSegment("dayPeriod").getAttribute("tabindex")).toBe("0");
  });
});

describe("TimePicker unavailable and invalid", () => {
  it("leaves nothing in the tab order while disabled, and refuses the keyboard", async () => {
    const wrapper = mountPicker({ modelValue: "09:30", hourCycle: 24, disabled: true });
    await settle();

    expect(getField().getAttribute("aria-disabled")).toBe("true");
    expect(getSegments().some((segment) => segment.hasAttribute("tabindex"))).toBe(false);

    const minute = getSegment("minute");
    pressKey(minute, "ArrowUp");
    await settle();

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(getField().className).toContain("cursor-not-allowed");
  });

  it("paints the destructive border and announces the error while invalid", async () => {
    mountPicker({ modelValue: "09:30", invalid: true });
    await settle();

    const field = getField();
    expect(field.className).toContain("border-destructive");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(field.className).not.toContain("focus-within:shadow-halo");
  });

  it("stays quiet while valid, with no invalid marker to explain away", async () => {
    mountPicker({ modelValue: "09:30" });
    await settle();

    const field = getField();
    expect(field.className).not.toContain("border-destructive");
    expect(field.getAttribute("aria-invalid")).toBeNull();
  });
});

describe("TimePicker attribute routing", () => {
  it("merges a caller's class onto the group, so it sizes the whole control", async () => {
    mountPicker({ modelValue: "09:30" }, { class: "max-w-[10rem]" });
    await settle();

    const field = getField();
    expect(field.className).toContain("max-w-[10rem]");
    // A caller's own height replaces the control scale's rather than being
    // concatenated after it, which is the whole reason `class` goes through
    // `cn()` instead of Vue's own fallthrough merge.
    expect(field.className).toContain("h-9");
  });

  it("lets a caller's height replace the control scale's rather than stack with it", async () => {
    mountPicker({ modelValue: "09:30" }, { class: "h-11" });
    await settle();

    const classes = getField().className.split(/\s+/);
    expect(classes).toContain("h-11");
    expect(classes).not.toContain("h-9");
  });

  it("routes every other fallthrough attribute onto the group it describes", async () => {
    mountPicker(
      { modelValue: "09:30" },
      { "aria-describedby": "starts-hint", "data-testid": "starts-at" },
    );
    await settle();

    const field = getField();
    expect(field.getAttribute("aria-describedby")).toBe("starts-hint");
    expect(field.getAttribute("data-testid")).toBe("starts-at");
  });
});

describe("TimePicker shape changes", () => {
  it("keeps the same instant when the hour cycle changes underneath it", async () => {
    const wrapper = mountPicker({ modelValue: "13:30", hourCycle: 24 });
    await settle();
    expect(segmentValues()).toEqual(["13", "30"]);

    await wrapper.setProps({ hourCycle: 12 });
    await settle();

    // Reka builds its formatter once and never watches `hourCycle`, so without
    // the rebuild the AM/PM segment arrives at its initial value and this reads
    // "1:30 AM" — half a day wrong, and reported as such the moment the field
    // is touched.
    expect(segmentValues()).toEqual(["1", "30", "PM"]);
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("gives a widened granularity a real segment even when nothing is chosen", async () => {
    const wrapper = mountPicker({ hourCycle: 24 });
    await settle();

    await wrapper.setProps({ granularity: "second" });
    await settle();

    // Reka seeds its segment values from the granularity it started with, so
    // an unrebuilt field renders the new seconds segment with no entry to read
    // and no `role` at all — a contenteditable div a screen reader cannot see.
    expect(segmentNames()).toEqual(["hour", "minute", "second"]);
    expect(getSegment("second").getAttribute("role")).toBe("spinbutton");
  });

  it("keeps a tab stop when the segment holding it is taken away", async () => {
    const wrapper = mountPicker({
      modelValue: "13:30:20",
      hourCycle: 24,
      granularity: "second",
    });
    await settle();

    const second = getSegment("second");
    second.focus();
    await settle();
    expect(second.getAttribute("tabindex")).toBe("0");

    await wrapper.setProps({ granularity: "minute" });
    await settle();

    // The remembered segment is gone, so the stop falls back to the first one.
    // A field that remembered a segment it no longer has would have no tab stop
    // at all, which is a control a keyboard cannot reach.
    expect(getSegments().map((segment) => segment.getAttribute("tabindex"))).toEqual(["0", "-1"]);
  });

  it("rewrites the segments for a locale without rebuilding the field", async () => {
    const wrapper = mountPicker({ modelValue: "13:30", locale: "en-US" });
    await settle();
    expect(segmentValues()).toEqual(["1", "30", "PM"]);

    await wrapper.setProps({ locale: "en-GB" });
    await settle();

    // `locale` is deliberately outside the rebuild key: Reka watches it and
    // re-reads the segments itself, so a field being retyped survives a locale
    // change with its focus intact.
    expect(segmentValues()).toEqual(["13", "30"]);
  });
});
