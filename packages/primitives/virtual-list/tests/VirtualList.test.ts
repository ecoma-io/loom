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

function mountList(rows: unknown[] = ROWS) {
  const active = ref(-1);
  const activated: number[] = [];
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
                active.value = index;
              },
              onActivate: (index: number) => activated.push(index),
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
  return { host, element, setItems, active, activated };
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

  it("degrades to an empty window when there is nothing or no room to render", () => {
    expect(virtualWindow(0, 400, ROW_HEIGHT, 0, 8)).toEqual({ start: 0, end: 0 });
    expect(virtualWindow(0, 400, 0, 500, 8)).toEqual({ start: 0, end: 0 });
    // A zero-height viewport (hidden container) still paints the overscan rows.
    expect(virtualWindow(0, 0, ROW_HEIGHT, 500, 8)).toEqual({ start: 0, end: 9 });
  });
});

describe("VirtualList", () => {
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
});
