import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { getLocalTimeZone, today } from "@internationalized/date";
import Calendar from "../src/Calendar.vue";

enableAutoUnmount(afterEach);

// Reka defers a step past the render queue when the placeholder moves, so
// assertions read the grid only once it has settled.
async function settle() {
  await nextTick();
}

function mountCalendar(props: Record<string, unknown> = {}, attrs: Record<string, unknown> = {}) {
  return mount(Calendar, {
    props,
    attrs,
    // Focus only works for a tree that is actually in the document, and every
    // keyboard assertion here moves focus.
    attachTo: document.body,
  });
}

function getGrid(): HTMLElement {
  const grid = document.querySelector<HTMLElement>('[role="grid"]');
  if (!grid) throw new Error("no grid rendered");
  return grid;
}

function getHeading(): HTMLElement {
  const heading = document.getElementById(getGrid().getAttribute("aria-labelledby") ?? "");
  if (!heading) throw new Error("grid has no resolvable heading");
  return heading;
}

function getDays(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>("[data-reka-calendar-cell-trigger]")];
}

function getDay(iso: string): HTMLElement {
  const day = document.querySelector<HTMLElement>(`[data-value="${iso}"]`);
  if (!day) throw new Error(`no cell for ${iso}`);
  return day;
}

function getStatus(): HTMLElement {
  const status = document.querySelector<HTMLElement>('[role="status"]');
  if (!status) throw new Error("no status line rendered");
  return status;
}

// The full-date string built the way the control builds its cell names — same
// options, same locale — so the expectation cannot drift from what Node's ICU
// actually produces.
function expectedFullDay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

// `code` as well as `key`, and neither is optional: Reka's calendar
// navigation switches on `event.code`. Space is the case where they disagree —
// its key is `" "` and its code is `"Space"` — so both arrive separately.
function pressKey(el: EventTarget, key: string, code = key) {
  el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key, code }));
}

// A date that pins the visible month to March 2026 wherever the suite runs:
// the roving Tab stop starts on the selected day, so every keyboard test
// below knows exactly which cells surround it.
const ISO = "2026-03-14";

describe("Calendar surface", () => {
  it("renders a real grid named by its month-and-year heading, not an application role", () => {
    mountCalendar({ modelValue: ISO });

    // The defect this pins: Reka writes `role="application"` on its grid,
    // which hands every key to the page and strips the table semantics. The
    // override to `grid` is load-bearing, so the assertion reads the exact
    // attribute rather than "some role exists".
    expect(getGrid().getAttribute("role")).toBe("grid");
    const heading = getHeading();
    expect(heading.textContent).toContain("March");
    expect(heading.textContent).toContain("2026");

    // The weekday row is part of the same table: seven real header cells,
    // laid out by the table itself rather than by flex.
    expect(document.querySelectorAll("th")).toHaveLength(7);
  });

  it("is one Tab stop for the whole grid, held by the roving focused day", () => {
    mountCalendar({ modelValue: ISO });

    const stops = getDays()
      .map((day) => day.getAttribute("tabindex"))
      .filter((tabindex) => tabindex !== null);
    expect(stops.filter((tabindex) => tabindex === "0")).toHaveLength(1);
    expect(stops.every((tabindex) => tabindex === "0" || tabindex === "-1")).toBe(true);
  });
});

describe("Calendar value contract", () => {
  it("reports the day that was clicked back as an ISO string", async () => {
    const wrapper = mountCalendar({ modelValue: ISO });

    getDay("2026-03-20").click();
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([["2026-03-20"]]);
  });

  it("marks the bound day selected, on both the cell and the trigger", () => {
    mountCalendar({ modelValue: ISO });

    const day = getDay(ISO);
    expect(day.hasAttribute("data-selected")).toBe(true);
    const cell = day.closest<HTMLElement>('[role="gridcell"]');
    if (!cell) throw new Error("cell trigger is not inside a gridcell");
    expect(cell.getAttribute("aria-selected")).toBe("true");
  });

  it("follows a value the host changes underneath it", async () => {
    const wrapper = mountCalendar({ modelValue: ISO });
    await wrapper.setProps({ modelValue: "2026-03-25" });
    await settle();

    const selected = getDays().filter((day) => day.hasAttribute("data-selected"));
    expect(selected.map((day) => day.getAttribute("data-value"))).toEqual(["2026-03-25"]);
  });

  it("clears the choice when the chosen day is clicked again", async () => {
    const wrapper = mountCalendar({ modelValue: ISO });

    getDay(ISO).click();
    await settle();

    // There is no field here whose clearing could be a surprise, so the
    // toggle stays live: the surface says so by emitting `undefined`, the
    // same value a host binds to mean "nothing chosen".
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([undefined]);
  });

  it("reads a value that does not parse as no date chosen, rather than throwing", () => {
    mountCalendar({ modelValue: "14/03/2026" });

    expect(getDays().some((day) => day.hasAttribute("data-selected"))).toBe(false);
  });
});

describe("Calendar selection announcement", () => {
  it("says nothing has been chosen until one is", () => {
    mountCalendar();

    const status = getStatus();
    expect(status.getAttribute("role")).toBe("status");
    expect(status.textContent).toBe("No date chosen.");
  });

  it("fills the line with the chosen day's full date exactly when choosing emits", async () => {
    // Unbound: the surface owns its state until a host binds one, which is
    // what lets the click's effect be read straight off the line. Unbound it
    // opens on the current month, so the day chosen is today.
    const wrapper = mountCalendar();
    const now = today(getLocalTimeZone());

    getDay(now.toString()).click();
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([[now.toString()]]);
    expect(getStatus().textContent).toBe(`${expectedFullDay(now.toString())} chosen.`);
  });

  it("returns the line to the cleared state when the choice is toggled off", async () => {
    const wrapper = mountCalendar({ modelValue: ISO });

    getDay(ISO).click();
    await settle();
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([undefined]);

    // The line reads the bound value, so it follows the host applying the
    // cleared emission rather than the click alone.
    await wrapper.setProps({ modelValue: undefined });
    await settle();
    expect(getStatus().textContent).toBe("No date chosen.");
  });

  it("takes both halves of the line from the labels prop", async () => {
    mountCalendar({
      labels: {
        chosen: ({ date }: { date: string }) => `Đã chọn ${date}`,
        cleared: "Chưa chọn ngày.",
      },
    });

    expect(getStatus().textContent).toBe("Chưa chọn ngày.");

    const now = today(getLocalTimeZone());
    getDay(now.toString()).click();
    await settle();
    expect(getStatus().textContent).toBe(`Đã chọn ${expectedFullDay(now.toString())}`);
  });
});

describe("Calendar today marker", () => {
  it("marks today with aria-current and the visible dot, both together", () => {
    const now = today(getLocalTimeZone());
    mountCalendar();

    const nowDay = getDay(now.toString());
    // The dot is decoration; `aria-current` is what a screen reader reads.
    // Neither is the whole cue alone, so neither may ship without the other.
    expect(nowDay.getAttribute("aria-current")).toBe("date");
    const dot = nowDay.querySelector<HTMLSpanElement>('span[aria-hidden="true"]');
    expect(dot).not.toBeNull();
    expect(dot?.className).toContain("rounded-full");
  });
});

describe("Calendar bounds", () => {
  it("announces a day outside min/max as disabled and draws it struck through, never faded", () => {
    const now = today(getLocalTimeZone());
    mountCalendar({ min: now.toString() });

    const before = getDay(now.subtract({ days: 1 }).toString());
    expect(before.getAttribute("aria-disabled")).toBe("true");
    // Colour plus strike, never alpha: the number is the cell's whole content,
    // and half opacity took `--color-foreground` from 14.09:1 to 3.13:1 when
    // this treatment was tried in the pickers.
    expect(before.className).not.toContain("opacity-50");
    expect(before.classList.contains("data-[disabled]:line-through")).toBe(true);
    expect(
      before.classList.contains("[&[data-disabled]:not([data-selected])]:text-muted-foreground"),
    ).toBe(true);
  });

  it("keeps a day outside the bounds unreachable by keyboard", () => {
    const now = today(getLocalTimeZone());
    mountCalendar({ min: now.toString() });

    // No tabindex at all, which is one step further out than `-1`: the cell
    // is not merely skipped by Tab, it is not a stop for anything to land on.
    expect(getDay(now.subtract({ days: 1 }).toString()).hasAttribute("tabindex")).toBe(false);
    expect(getDay(now.toString()).getAttribute("tabindex")).toBe("0");
  });
});

describe("Calendar keyboard", () => {
  it("moves the roving stop day by day and week by week with the arrow keys", async () => {
    mountCalendar({ modelValue: ISO });

    const start = getDay(ISO);
    start.focus();
    pressKey(start, "ArrowRight");
    await settle();
    expect(document.activeElement).toBe(getDay("2026-03-15"));

    pressKey(document.activeElement as EventTarget, "ArrowDown");
    await settle();
    expect(document.activeElement).toBe(getDay("2026-03-22"));

    pressKey(document.activeElement as EventTarget, "ArrowLeft");
    await settle();
    expect(document.activeElement).toBe(getDay("2026-03-21"));

    pressKey(document.activeElement as EventTarget, "ArrowUp");
    await settle();
    expect(document.activeElement).toBe(getDay("2026-03-14"));
  });

  it("chooses the focused day on Enter and on Space", async () => {
    const wrapper = mountCalendar({ modelValue: ISO });

    const day = getDay("2026-03-20");
    day.focus();
    pressKey(day, "Enter");
    await settle();
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["2026-03-20"]);

    const other = getDay("2026-03-21");
    other.focus();
    pressKey(other, " ", "Space");
    await settle();
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["2026-03-21"]);
  });

  it("leaves PageUp, PageDown, Home and End genuinely unwired rather than half-behaved", async () => {
    const wrapper = mountCalendar({ modelValue: ISO });

    const start = getDay(ISO);
    start.focus();
    for (const key of ["PageUp", "PageDown", "Home", "End"]) {
      pressKey(start, key);
      await settle();
      // Pinned empirically, not aspirationally: none of these keys is in
      // Reka's handled set, so nothing moves and nothing is chosen. If a
      // future Reka wires them, this test goes red and the docs page's
      // keyboard list grows with it — deliberately, in the same change.
      expect(document.activeElement).toBe(start);
      expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    }
  });
});

describe("Calendar localisation", () => {
  it("writes the heading in the locale's own language", () => {
    const now = today(getLocalTimeZone());
    mountCalendar({ locale: "vi-VN" });

    // Built from `Intl.DateTimeFormat` the same way the control builds it, so
    // the expectation cannot drift from what Node's ICU actually produces.
    const expected = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(
      new Date(now.year, now.month - 1, 1),
    );
    expect(getHeading().textContent.trim()).toBe(expected);
  });

  it("names each cell with its full date in the locale", () => {
    mountCalendar({ modelValue: ISO, locale: "vi-VN" });

    // 2026-03-14 is a Saturday; the name is the cell's whole announcement,
    // because there is no field beside this surface echoing the value back.
    expect(getDay(ISO).getAttribute("aria-label")).toBe(
      new Intl.DateTimeFormat("vi-VN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(2026, 2, 14)),
    );
  });

  it("takes an instance's labels prop over its English pager names, key by key", () => {
    mountCalendar({ labels: { previousMonth: "Tháng trước" } });

    // The unnamed key stays English rather than blanking out — an unnamed
    // button is the worst available reading of a partial bag.
    expect(document.querySelector('[aria-label="Tháng trước"]')).not.toBeNull();
    expect(document.querySelector('[aria-label="Next month"]')).not.toBeNull();
  });

  it("carries dir onto the DOM and mirrors both pager chevrons under RTL", () => {
    mountCalendar({ dir: "rtl" });

    expect(document.querySelector('[dir="rtl"][aria-label^="Calendar"]')).not.toBeNull();

    // jsdom cannot judge geometry, so the mirroring is pinned where it is
    // written: the flip lives in the class list, keyed to Tailwind's `rtl:`
    // variant, the way Switch pins its direction contract.
    const prev = document.querySelector<HTMLElement>('[aria-label="Previous month"]');
    const next = document.querySelector<HTMLElement>('[aria-label="Next month"]');
    expect(prev).not.toBeNull();
    expect(next).not.toBeNull();
    expect(prev?.querySelector("svg")?.getAttribute("class")).toContain("rtl:-scale-x-100");
    expect(next?.querySelector("svg")?.getAttribute("class")).toContain("rtl:-scale-x-100");
  });

  it("seeds the forwarded direction from the document when no prop arrives", () => {
    document.documentElement.setAttribute("dir", "rtl");
    try {
      mountCalendar({ modelValue: ISO });

      // Reka itself never reads the document — it resolves through its
      // ConfigProvider context and defaults `"ltr"` — so the seed is what
      // keeps a plain `<html dir="rtl">` host from getting mirrored chevrons
      // (CSS answers those on its own) with LTR arrow keys. The attribute on
      // the root is where the forwarding is observable.
      expect(document.querySelector('[dir="rtl"][aria-label^="Calendar"]')).not.toBeNull();
    } finally {
      document.documentElement.removeAttribute("dir");
    }
  });

  it("forwards nothing when neither the prop nor the document speaks", () => {
    mountCalendar({ modelValue: ISO });

    // Absence is not observable as no attribute — Reka resolves the key
    // through its own chain and writes the result either way — so this pins
    // the seed staying out of the way: Reka's `"ltr"` default, not something
    // injected from here.
    const root = document.querySelector('[aria-label^="Calendar"]');
    expect(root?.getAttribute("dir")).toBe("ltr");
  });
});
