import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import VirtualList from "../src/VirtualList.vue";
import { virtualWindow } from "../src/virtual-window";

enableAutoUnmount(afterEach);

const ROW_HEIGHT = 32;
const ROWS = Array.from({ length: 500 }, (_, i) => `row-${String(i)}`);

/** Impose viewport geometry on the scroll container (jsdom measures nothing). */
function stubGeometry(
  el: HTMLElement,
  geometry: { clientHeight: number; scrollTop: number },
): void {
  Object.defineProperty(el, "clientHeight", { configurable: true, value: geometry.clientHeight });
  Object.defineProperty(el, "scrollTop", {
    configurable: true,
    value: geometry.scrollTop,
    writable: true,
  });
}

function mountList(rows: unknown[] = ROWS, overrides: Record<string, unknown> = {}) {
  const active = ref(-1);
  const activated: number[] = [];
  // Every `update:activeIndex` the component emits, in order — a boundary
  // press must emit nothing, which "active did not change" cannot prove
  // (re-emitting the current value would not move it either).
  const updates: number[] = [];
  const host = mount(
    defineComponent({
      props: { items: { type: Array, required: true } },
      setup(props) {
        return () =>
          h(
            VirtualList,
            {
              items: props.items,
              itemHeight: ROW_HEIGHT,
              label: "Test rows",
              activeIndex: active.value,
              "onUpdate:activeIndex": (index: number) => {
                updates.push(index);
                active.value = index;
              },
              onActivate: (index: number) => activated.push(index),
              ...overrides,
            },
            {
              default: (slot: { item: unknown; index: number }) =>
                h("div", { class: "row", "data-idx": slot.index }, String(slot.index)),
            },
          );
      },
    }),
    { attachTo: document.body, props: { items: rows } },
  );
  const element = host.element as HTMLElement;
  // A typed seam for tests that shrink the list: re-mounting with fewer rows
  // is what exercises the active-index clamp watch.
  const setItems = (items: unknown[]) => host.setProps({ items });
  return { host, element, setItems, active, activated, updates };
}

/** The full-height spacer div — the model's answer for the list's total extent. */
function spacer(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement;
}

function pressRow(element: HTMLElement, index: number, key: string): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  element.querySelector(`[data-virtual-index="${String(index)}"]`)!.dispatchEvent(event);
  return event;
}

function mountMeasured(overrides: Record<string, unknown> = {}, rows: unknown[] = ROWS) {
  const mounted = mountList(rows, overrides);
  // The component's root is a fragment (the template's eslint comment precedes
  // the root div), so the wrapper's element is the app container — the scroll
  // container is the [data-loom-virtual-list] descendant. Scoping the query to
  // this mount keeps a loop over degenerate inputs measuring its own list,
  // not the first list still attached by an earlier iteration.
  const container = mounted.element.querySelector<HTMLElement>("[data-loom-virtual-list]")!;
  stubGeometry(container, { clientHeight: 400, scrollTop: 0 });
  container.dispatchEvent(new Event("scroll"));
  return { ...mounted, container };
}

describe("virtualWindow", () => {
  it("windows the viewport with overscan above and below", () => {
    expect(virtualWindow(0, 400, ROW_HEIGHT, 500, 8)).toEqual({ start: 0, end: 21 });
  });

  it("moves the window with the scroll position", () => {
    expect(virtualWindow(3200, 400, ROW_HEIGHT, 500, 8)).toEqual({ start: 92, end: 121 });
  });

  it("clamps the window to the list ends", () => {
    // Scrolled past the last row (browsers clamp scrollTop; jsdom does not).
    expect(virtualWindow(1_000_000, 400, ROW_HEIGHT, 500, 8)).toEqual({ start: 491, end: 500 });
    // Negative scrollTop positions behave as the top of the list.
    expect(virtualWindow(-50, 400, ROW_HEIGHT, 500, 8)).toEqual({ start: 0, end: 21 });
  });

  it("can render with no overscan at all", () => {
    expect(virtualWindow(3200, 400, ROW_HEIGHT, 500, 0)).toEqual({ start: 100, end: 113 });
  });

  it("covers the whole list once overscan meets or exceeds the item count", () => {
    // Overscan past the list's extent must not invert or overflow the window:
    // the clamp to [0, count] is what keeps an oversized buffer safe.
    expect(virtualWindow(0, 400, ROW_HEIGHT, 10, 50)).toEqual({ start: 0, end: 10 });
    expect(virtualWindow(3200, 400, ROW_HEIGHT, 10, 10)).toEqual({ start: 0, end: 10 });
  });

  it("degrades to an empty window when there is nothing or no room to render", () => {
    expect(virtualWindow(0, 400, ROW_HEIGHT, 0, 8)).toEqual({ start: 0, end: 0 });
    expect(virtualWindow(0, 400, 0, 500, 8)).toEqual({ start: 0, end: 0 });
    // The `itemHeight <= 0` branch must answer a negative height the same
    // way: `count * itemHeight` would be a negative spacer, not a list.
    expect(virtualWindow(0, 400, -ROW_HEIGHT, 500, 8)).toEqual({ start: 0, end: 0 });
    // A zero-height viewport (jsdom, a display:none parent) renders nothing —
    // the docblock's degenerate contract; the mount-time measure supplies the
    // real height on the next scroll/ResizeObserver tick.
    expect(virtualWindow(0, 0, ROW_HEIGHT, 500, 8)).toEqual({ start: 0, end: 0 });
  });

  it("treats NaN and infinite inputs as degenerate, not as corners", () => {
    // `NaN <= 0` is false — a positivity-only guard lets NaN through, and NaN
    // indices then render a nonsense slice. Every non-finite input must land
    // on a defined window.
    expect(virtualWindow(0, 400, Number.NaN, 500, 8)).toEqual({ start: 0, end: 0 });
    expect(virtualWindow(0, 400, Number.POSITIVE_INFINITY, 500, 8)).toEqual({ start: 0, end: 0 });
    expect(virtualWindow(0, Number.NaN, ROW_HEIGHT, 500, 8)).toEqual({ start: 0, end: 0 });
    expect(virtualWindow(0, -400, ROW_HEIGHT, 500, 8)).toEqual({ start: 0, end: 0 });
  });

  it("floors and clamps overscan, never inverting the window", () => {
    // A negative overscan is a caller bug, not a licence to reorder rows:
    // -5 would turn `{start: 0, end: 21}` into `{start: 5, end: -4}`, which
    // slice() renders as almost the whole list.
    expect(virtualWindow(0, 400, ROW_HEIGHT, 500, -5)).toEqual(
      virtualWindow(0, 400, ROW_HEIGHT, 500, 0),
    );
    expect(virtualWindow(0, 400, ROW_HEIGHT, 500, 2.7)).toEqual({ start: 0, end: 15 }); // pad 2
    expect(virtualWindow(0, 400, ROW_HEIGHT, 500, Number.NaN)).toEqual(
      virtualWindow(0, 400, ROW_HEIGHT, 500, 0),
    );
    expect(virtualWindow(0, 400, ROW_HEIGHT, 500, Number.POSITIVE_INFINITY)).toEqual(
      virtualWindow(0, 400, ROW_HEIGHT, 500, 0),
    );
  });

  it("reads a non-finite scrollTop as the top of the list", () => {
    // Browsers never report a non-finite scrollTop (jsdom starts at 0), but
    // NaN would poison first/start/end — the top is the safe read.
    expect(virtualWindow(Number.NaN, 400, ROW_HEIGHT, 500, 8)).toEqual({ start: 0, end: 21 });
    expect(virtualWindow(Number.POSITIVE_INFINITY, 400, ROW_HEIGHT, 500, 8)).toEqual({
      start: 0,
      end: 21,
    });
  });
});

describe("VirtualList", () => {
  it("renders nothing until a viewport is measured, then the window", async () => {
    const { element } = mountList();
    // jsdom reports clientHeight 0: the pre-measure state must not paint rows
    // inside an invisible container — the mount-time measure supplies the
    // real height, and a scroll tick then paints the window.
    expect(element.querySelectorAll(".row")).toHaveLength(0);
    const container = document.querySelector<HTMLElement>("[data-loom-virtual-list]")!;
    stubGeometry(container, { clientHeight: 400, scrollTop: 0 });
    container.dispatchEvent(new Event("scroll"));
    await nextTick();
    expect(element.querySelectorAll(".row")).toHaveLength(21);
  });

  it("treats a NaN item height as an empty list, not a full one", async () => {
    const { element } = mountList(ROWS, { itemHeight: Number.NaN });
    const container = document.querySelector<HTMLElement>("[data-loom-virtual-list]")!;
    stubGeometry(container, { clientHeight: 400, scrollTop: 0 });
    container.dispatchEvent(new Event("scroll"));
    await nextTick();
    expect(element.querySelectorAll(".row")).toHaveLength(0);
  });

  it("clamps a negative overscan to the plain window instead of inverting it", async () => {
    const { element } = mountList(ROWS, { overscan: -5 });
    const container = document.querySelector<HTMLElement>("[data-loom-virtual-list]")!;
    stubGeometry(container, { clientHeight: 400, scrollTop: 0 });
    container.dispatchEvent(new Event("scroll"));
    await nextTick();
    // Pre-fix this rendered 491 of 500 rows (`slice(5, -4)`): ~the whole list.
    expect(element.querySelectorAll(".row")).toHaveLength(13);
    expect(element.querySelector('[data-virtual-index="490"]')).toBeNull();
  });

  it("renders only the windowed rows and reports the full set to AT", async () => {
    const { element } = mountList();
    const container = document.querySelector<HTMLElement>("[data-loom-virtual-list]")!;
    stubGeometry(container, { clientHeight: 400, scrollTop: 0 });
    container.dispatchEvent(new Event("scroll"));
    await nextTick();

    const rows = element.querySelectorAll(".row");
    // first visible = 0, visible = 13, overscan 8 above and below → 21 rows.
    expect(rows).toHaveLength(21);
    expect(container.getAttribute("role")).toBe("list");
    expect(container.getAttribute("aria-label")).toBe("Test rows");

    const firstRow = element.querySelector('[data-virtual-index="0"]')!;
    expect(firstRow.getAttribute("role")).toBe("listitem");
    expect(firstRow.getAttribute("aria-setsize")).toBe("500");
    expect(firstRow.getAttribute("aria-posinset")).toBe("1");
    const lastRow = element.querySelector('[data-virtual-index="20"]')!;
    expect(lastRow.getAttribute("aria-posinset")).toBe("21");
  });

  it("recomputes the window when scrolled", async () => {
    const { element } = mountList();
    const container = document.querySelector<HTMLElement>("[data-loom-virtual-list]")!;
    stubGeometry(container, { clientHeight: 400, scrollTop: 3200 });
    container.dispatchEvent(new Event("scroll"));
    await nextTick();

    expect(element.querySelectorAll(".row")).toHaveLength(29); // 92..120 painted.
    expect(element.querySelector('[data-virtual-index="92"]')).not.toBeNull();
    expect(element.querySelector('[data-virtual-index="121"]')).toBeNull();
    expect(element.querySelector('[data-virtual-index="500"]')).toBeNull();
  });

  it("keeps one roving tab stop on the active row", async () => {
    const { element, active } = mountList();
    const container = document.querySelector<HTMLElement>("[data-loom-virtual-list]")!;
    stubGeometry(container, { clientHeight: 400, scrollTop: 0 });
    container.dispatchEvent(new Event("scroll"));
    await nextTick();

    // No active row yet: the first row is the tab stop.
    expect(element.querySelector('[data-virtual-index="0"]')!.getAttribute("tabindex")).toBe("0");
    expect(element.querySelector('[data-virtual-index="1"]')!.getAttribute("tabindex")).toBe("-1");

    // The container is out of the tab order in every engine: Firefox seats a
    // scrollable container ahead of its rows on its own, which would make it
    // the list's first Tab stop — the defect behind ecoma-io/loom#438.
    expect(container.getAttribute("tabindex")).toBe("-1");

    active.value = 3;
    await nextTick();
    expect(element.querySelector('[data-virtual-index="3"]')!.getAttribute("tabindex")).toBe("0");
    expect(element.querySelector('[data-virtual-index="0"]')!.getAttribute("tabindex")).toBe("-1");
  });

  it("keeps a tab stop on the visible row nearest an active row outside the window", async () => {
    const { element, active } = mountList();
    const container = document.querySelector<HTMLElement>("[data-loom-virtual-list]")!;
    // Scroll far past the active row: the maintained position is no longer
    // painted, so the stop must land on the visible row nearest it rather
    // than vanishing — a stop that is not rendered is a list Tab cannot reach.
    stubGeometry(container, { clientHeight: 400, scrollTop: 3200 });
    container.dispatchEvent(new Event("scroll"));
    await nextTick();
    active.value = 400;
    await nextTick();

    const stops = element.querySelectorAll('[data-virtual-index][tabindex="0"]');
    expect(stops).toHaveLength(1);
    expect(stops[0]!.getAttribute("data-virtual-index")).toBe("120");
    expect(element.querySelector('[data-virtual-index="92"]')!.getAttribute("tabindex")).toBe("-1");
  });

  it("adopts the fallback row into the active position when it gains focus", async () => {
    // The fallback exists to be landed on: Tab arrives on the visible row
    // near the stale active position, and that row becomes the maintained
    // one — roving, not a dead end the next Arrow key has to explain.
    const { element, active } = mountList();
    const container = document.querySelector<HTMLElement>("[data-loom-virtual-list]")!;
    stubGeometry(container, { clientHeight: 400, scrollTop: 3200 });
    container.dispatchEvent(new Event("scroll"));
    await nextTick();
    active.value = 400;
    await nextTick();

    element.querySelector<HTMLElement>('[data-virtual-index="120"]')!.focus();
    await nextTick();
    expect(active.value).toBe(120);
    expect(element.querySelector('[data-virtual-index="120"]')!.getAttribute("tabindex")).toBe("0");
  });

  it("makes the first visible row the tab stop while no row is active after a scroll", async () => {
    const { element } = mountList();
    const container = document.querySelector<HTMLElement>("[data-loom-virtual-list]")!;
    stubGeometry(container, { clientHeight: 400, scrollTop: 3200 });
    container.dispatchEvent(new Event("scroll"));
    await nextTick();

    expect(element.querySelector('[data-virtual-index="92"]')!.getAttribute("tabindex")).toBe("0");
    expect(element.querySelector('[data-virtual-index="93"]')!.getAttribute("tabindex")).toBe("-1");
  });

  it("moves the active row with the arrow keys, focusing the revealed row", async () => {
    const { element, active } = mountList();
    const container = document.querySelector<HTMLElement>("[data-loom-virtual-list]")!;
    stubGeometry(container, { clientHeight: 400, scrollTop: 0 });
    container.dispatchEvent(new Event("scroll"));
    await nextTick();

    element
      .querySelector('[data-virtual-index="0"]')!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await nextTick();
    await nextTick();

    expect(active.value).toBe(1);
    expect(element.querySelector('[data-virtual-index="1"]')!.getAttribute("tabindex")).toBe("0");
    expect(document.activeElement).toBe(element.querySelector('[data-virtual-index="1"]'));

    element
      .querySelector('[data-virtual-index="1"]')!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    await nextTick();
    await nextTick();
    expect(active.value).toBe(0);
  });

  it("jumps to the first and last row with Home and End", async () => {
    const { element, active } = mountList();
    const container = document.querySelector<HTMLElement>("[data-loom-virtual-list]")!;
    stubGeometry(container, { clientHeight: 400, scrollTop: 0 });
    container.dispatchEvent(new Event("scroll"));
    await nextTick();

    element
      .querySelector('[data-virtual-index="0"]')!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    await nextTick();
    await nextTick();
    expect(active.value).toBe(499);

    element
      .querySelector('[data-virtual-index="491"]')!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    await nextTick();
    await nextTick();
    expect(active.value).toBe(0);
  });

  it("pages by the viewport height", async () => {
    const { element, active } = mountList();
    const container = document.querySelector<HTMLElement>("[data-loom-virtual-list]")!;
    stubGeometry(container, { clientHeight: 400, scrollTop: 0 });
    container.dispatchEvent(new Event("scroll"));
    await nextTick();

    element
      .querySelector('[data-virtual-index="0"]')!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", bubbles: true }));
    await nextTick();
    await nextTick();
    expect(active.value).toBe(12);

    element
      .querySelector('[data-virtual-index="12"]')!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp", bubbles: true }));
    await nextTick();
    await nextTick();
    expect(active.value).toBe(0);
  });

  it("activates the active row with Enter and Space", async () => {
    const { element, active, activated } = mountList();
    const container = document.querySelector<HTMLElement>("[data-loom-virtual-list]")!;
    stubGeometry(container, { clientHeight: 400, scrollTop: 0 });
    container.dispatchEvent(new Event("scroll"));
    await nextTick();

    active.value = 4;
    await nextTick();

    element
      .querySelector('[data-virtual-index="4"]')!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await nextTick();
    expect(activated).toEqual([4]);

    element
      .querySelector('[data-virtual-index="4"]')!
      .dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    await nextTick();
    expect(activated).toEqual([4, 4]);
  });

  it("leaves keys whose target is not a row to the nested control", async () => {
    const { element, active } = mountList();
    const container = document.querySelector<HTMLElement>("[data-loom-virtual-list]")!;
    stubGeometry(container, { clientHeight: 400, scrollTop: 0 });
    container.dispatchEvent(new Event("scroll"));
    await nextTick();

    // A typed keydown inside a row's nested button must not move the active row.
    const nested = document.createElement("button");
    element.querySelector('[data-virtual-index="0"]')!.append(nested);
    nested.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await nextTick();
    expect(active.value).toBe(-1);
  });

  it("clamps the active index when the list shrinks past it", async () => {
    const { active, setItems } = mountList();
    const container = document.querySelector<HTMLElement>("[data-loom-virtual-list]")!;
    stubGeometry(container, { clientHeight: 400, scrollTop: 3200 });
    container.dispatchEvent(new Event("scroll"));
    await nextTick();

    active.value = 400;
    await nextTick();
    await setItems([]);
    await nextTick();
    expect(active.value).toBe(-1);
  });

  it("renders nothing for an empty list without erroring", async () => {
    const { element } = mountList([]);
    const container = document.querySelector<HTMLElement>("[data-loom-virtual-list]")!;
    stubGeometry(container, { clientHeight: 400, scrollTop: 0 });
    container.dispatchEvent(new Event("scroll"));
    await nextTick();
    expect(element.querySelectorAll(".row")).toHaveLength(0);
    expect(container.getAttribute("aria-label")).toBe("Test rows");
  });

  it("renders an empty list with an empty spacer and answers no keys for a degenerate item height", async () => {
    // A degenerate itemHeight empties the window; the spacer must degrade
    // with it ("empty window, empty spacer") instead of painting a NaNpx,
    // Infinitypx or negative-pixel scrollbar over no rows, and the keyboard
    // must be inert — moveTo's bounds are positivity checks, which NaN
    // passes both ways, so PageDown once emitted `NaN` as the active index.
    for (const itemHeight of [0, -ROW_HEIGHT, Number.NaN, Number.POSITIVE_INFINITY]) {
      const { element, container, active, updates } = mountMeasured({ itemHeight });
      await nextTick();
      expect(element.querySelectorAll(".row")).toHaveLength(0);
      expect(spacer(container).style.height).toBe("0px");

      const pageDown = new KeyboardEvent("keydown", {
        key: "PageDown",
        bubbles: true,
        cancelable: true,
      });
      container.dispatchEvent(pageDown);
      await nextTick();
      expect(updates).toEqual([]);
      expect(active.value).toBe(-1);
      // Unclaimed: an inert list must not even swallow the key.
      expect(pageDown.defaultPrevented).toBe(false);
    }
  });

  it("keeps a sane window for a NaN, infinite or fractional overscan", async () => {
    // A non-finite overscan reads as 0 in the helper; the component must show
    // the same answer, not a crash or a whole-list paint.
    for (const overscan of [Number.NaN, Number.POSITIVE_INFINITY, 2.7]) {
      const { element } = mountMeasured({ overscan });
      await nextTick();
      // pad 2 renders 15 rows at the top of the list — the above-pad is
      // clipped by the list's edge (pad 0 renders 13).
      const expected = overscan === 2.7 ? 15 : 13;
      expect(element.querySelectorAll(".row")).toHaveLength(expected);
    }
  });

  it("renders the whole list once overscan meets the item count", async () => {
    const { element } = mountMeasured({ overscan: 500 }, ROWS.slice(0, 10));
    await nextTick();
    expect(element.querySelectorAll(".row")).toHaveLength(10);
    expect(element.querySelector('[data-virtual-index="9"]')).not.toBeNull();
  });

  it("keeps the painted window small at ten thousand rows", async () => {
    // The e2e suite pins 50k in a browser; this is the unit-level at-scale
    // pin: a window sized by the viewport, never by the item count.
    const tenThousand = Array.from({ length: 10_000 }, (_, i) => `row-${String(i)}`);
    const { element, container } = mountMeasured({}, tenThousand);
    await nextTick();
    expect(element.querySelectorAll(".row")).toHaveLength(21);
    expect(spacer(container).style.height).toBe("320000px");
    expect(element.querySelector('[data-virtual-index="9999"]')).toBeNull();
  });

  it("renders exactly one row for a viewport smaller than one row and pages by zero", async () => {
    const { element, active, updates } = mountList(ROWS, { overscan: 0 });
    const list = element.querySelector<HTMLElement>("[data-loom-virtual-list]")!;
    stubGeometry(list, { clientHeight: 20, scrollTop: 0 });
    list.dispatchEvent(new Event("scroll"));
    await nextTick();
    // Math.max(1, …): a viewport shorter than one row still paints a row.
    expect(element.querySelectorAll(".row")).toHaveLength(1);
    expect(element.querySelector('[data-virtual-index="0"]')).not.toBeNull();

    // page = floor(20 / 32) = 0: a press that cannot move the active row is
    // a no-op, not a re-emission of the position it already holds.
    active.value = 5;
    await nextTick();
    const pageDown = pressRow(element, 0, "PageDown");
    await nextTick();
    expect(updates).toEqual([]);
    expect(pageDown.defaultPrevented).toBe(true);
  });

  it("pages by the fully visible rows, not the window's ceil", async () => {
    // 340px holds 10.6 rows: the window paints 11 (ceil), a page moves 10
    // (floor) — landing the active row on the partial edge row would rest
    // half-clipped under the fold.
    const { element, active } = mountList(ROWS, { overscan: 0 });
    const list = document.querySelector<HTMLElement>("[data-loom-virtual-list]")!;
    stubGeometry(list, { clientHeight: 340, scrollTop: 0 });
    list.dispatchEvent(new Event("scroll"));
    await nextTick();

    pressRow(element, 0, "PageDown");
    await nextTick();
    await nextTick();
    expect(active.value).toBe(10);

    pressRow(element, 10, "PageUp");
    await nextTick();
    await nextTick();
    expect(active.value).toBe(0);
  });

  it("falls back to activating row 0 on Enter and Space while no row is active", async () => {
    const { element, activated, updates } = mountMeasured();
    await nextTick();

    pressRow(element, 0, "Enter");
    await nextTick();
    expect(activated).toEqual([0]);

    pressRow(element, 0, " ");
    await nextTick();
    expect(activated).toEqual([0, 0]);
    // Activation is not a move: the roving position stays unadopted.
    expect(updates).toEqual([]);
  });

  it("clamps the active index when the list shrinks to a smaller non-empty list", async () => {
    // The empty-list clamp is one arm of the shrink watch; this is the
    // non-zero arm — the position must clamp to the new last row, not ride
    // past it.
    const { active, setItems } = mountMeasured();
    await nextTick();
    active.value = 400;
    await nextTick();
    await setItems(ROWS.slice(0, 10));
    await nextTick();
    expect(active.value).toBe(9);
  });

  it("presses at the boundaries are claimed but silent", async () => {
    // A key the list owns but cannot act on still belongs to the list —
    // preventDefault stands so the browser does not scroll — but it emits
    // nothing: re-announcing the position the host already holds is noise.
    const { element, active, updates } = mountMeasured();
    await nextTick();

    active.value = 0;
    await nextTick();
    expect(pressRow(element, 0, "ArrowUp").defaultPrevented).toBe(true);
    expect(pressRow(element, 0, "PageUp").defaultPrevented).toBe(true);
    expect(updates).toEqual([]);

    const bottom = 500 * ROW_HEIGHT - 400;
    stubGeometry(document.querySelector<HTMLElement>("[data-loom-virtual-list]")!, {
      clientHeight: 400,
      scrollTop: bottom,
    });
    document
      .querySelector<HTMLElement>("[data-loom-virtual-list]")!
      .dispatchEvent(new Event("scroll"));
    await nextTick();
    active.value = 499;
    await nextTick();
    expect(pressRow(element, 499, "ArrowDown").defaultPrevented).toBe(true);
    expect(pressRow(element, 499, "PageDown").defaultPrevented).toBe(true);
    expect(updates).toEqual([]);
  });

  it("keeps row geometry and the spacer sane for a fractional item height", async () => {
    const { element, container } = mountMeasured({ itemHeight: 32.5 });
    await nextTick();
    expect(element.querySelectorAll(".row")).toHaveLength(21); // 13 visible + 8 overscan
    expect(element.querySelector<HTMLElement>('[data-virtual-index="1"]')!.style.top).toBe(
      "32.5px",
    );
    expect(element.querySelector<HTMLElement>('[data-virtual-index="1"]')!.style.height).toBe(
      "32.5px",
    );
    expect(spacer(container).style.height).toBe("16250px");
  });
});
