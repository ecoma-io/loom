import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import Pagination from "./Pagination.vue";

// The focus hand-off moves real focus, and focus only works for a tree that is
// actually in the document.
enableAutoUnmount(afterEach);

// Not `Partial<…>`: `total` is the one required prop, and widening it away
// here would let a test mount a Pagination the type system forbids.
function mountPagination(
  props: InstanceType<typeof Pagination>["$props"],
  attrs: Record<string, unknown> = {},
) {
  return mount(Pagination, { props, attrs, attachTo: document.body });
}

/** Every page button, in the order they are rendered. */
function pages(wrapper: ReturnType<typeof mountPagination>): string[] {
  return wrapper.findAll('[data-type="page"]').map((b) => b.text());
}

function button(wrapper: ReturnType<typeof mountPagination>, label: string): HTMLButtonElement {
  return wrapper.get(`[aria-label="${label}"]`).element as HTMLButtonElement;
}

// The hand-off runs on the tick after the new page has been applied, so an
// assertion about where focus landed has to let that render flush first.
async function settle(): Promise<void> {
  await nextTick();
  await nextTick();
}

// A real `MouseEvent`, not test-utils' `trigger`: `trigger` assigns its init
// keys onto a synthetic event and `UIEvent.detail` is a getter with no setter
// — and `detail` is exactly what separates a click synthesised by Enter or
// Space (0) from a pointer click (1), which is the distinction the focus
// hand-off turns on.
function press(target: HTMLElement, detail: number): void {
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail }));
}

describe("Pagination", () => {
  it("is a navigation landmark carrying an accessible name, so two on one page stay distinguishable", () => {
    const wrapper = mountPagination({ total: 50, page: 1 });
    expect((wrapper.element as HTMLElement).tagName).toBe("NAV");
    expect(wrapper.attributes("aria-label")).toBe("Pagination");

    const named = mountPagination({ total: 50, page: 1, label: "Invoices, bottom" });
    expect(named.attributes("aria-label")).toBe("Invoices, bottom");
  });

  it("marks the current page with aria-current and leaves every other page without it", () => {
    const wrapper = mountPagination({ total: 50, page: 3 });
    const marked = wrapper
      .findAll('[data-type="page"]')
      .filter((b) => b.attributes("aria-current") === "page");
    expect(marked).toHaveLength(1);
    expect(marked[0]!.text()).toBe("3");
  });

  it("emits the page a reader asked for instead of moving itself when the host owns the value", async () => {
    const wrapper = mountPagination({ total: 50, page: 1 });
    await wrapper.get('[aria-label="Page 4"]').trigger("click");
    expect(wrapper.emitted("update:page")).toEqual([[4]]);
    // The host did not honour it, so the control did not move.
    expect(wrapper.get('[aria-current="page"]').text()).toBe("1");
  });

  it("keeps its own page when the host supplies none, rather than sticking on page one", async () => {
    const wrapper = mountPagination({ total: 50 });
    await wrapper.get('[aria-label="Next Page"]').trigger("click");
    expect(wrapper.emitted("update:page")).toEqual([[2]]);
    expect(wrapper.get('[aria-current="page"]').text()).toBe("2");
  });

  it("genuinely disables the backward controls on the first page, rather than only dimming them", () => {
    const wrapper = mountPagination({ total: 50, page: 1 });
    expect(button(wrapper, "First Page").disabled).toBe(true);
    expect(button(wrapper, "Previous Page").disabled).toBe(true);
    expect(button(wrapper, "Next Page").disabled).toBe(false);
    expect(button(wrapper, "Last Page").disabled).toBe(false);
  });

  it("genuinely disables the forward controls on the last page, rather than only dimming them", () => {
    const wrapper = mountPagination({ total: 50, page: 5 });
    expect(button(wrapper, "Next Page").disabled).toBe(true);
    expect(button(wrapper, "Last Page").disabled).toBe(true);
    expect(button(wrapper, "Previous Page").disabled).toBe(false);
  });

  it("does not fire a disabled direction, so a control that looks unavailable is unavailable", async () => {
    const wrapper = mountPagination({ total: 50, page: 1 });
    await wrapper.get('[aria-label="Previous Page"]').trigger("click");
    expect(wrapper.emitted("update:page")).toBeUndefined();
  });

  it("hands keyboard focus to the current page when the control it was on becomes disabled", async () => {
    const wrapper = mountPagination({ total: 20 });
    const next = button(wrapper, "Next Page");
    next.focus();

    press(next, 0);
    await settle();

    expect(next.disabled).toBe(true);
    expect(document.activeElement).toBe(button(wrapper, "Page 2"));
    expect((document.activeElement as HTMLElement).getAttribute("aria-current")).toBe("page");
  });

  it("hands focus to the mirror control when the variant has no page buttons to land on", async () => {
    const wrapper = mountPagination({ total: 20, variant: "simple" });
    const next = button(wrapper, "Next Page");
    next.focus();
    press(next, 0);
    await settle();

    expect(document.activeElement).toBe(button(wrapper, "Previous Page"));
  });

  it("leaves focus alone for a pointer press, which has no place in the document to lose", async () => {
    const wrapper = mountPagination({ total: 20 });
    press(button(wrapper, "Next Page"), 1);
    await settle();

    expect(document.activeElement).toBe(document.body);
  });

  it("renders the ellipsis as an unfocusable, unpressable marker rather than a control", () => {
    const wrapper = mountPagination({ total: 1000, page: 37 });
    const gaps = wrapper.findAll('[data-type="ellipsis"]');
    expect(gaps).toHaveLength(2);
    for (const gap of gaps) {
      expect(gap.element.tagName).toBe("SPAN");
      expect(gap.attributes("tabindex")).toBeUndefined();
      expect(gap.attributes("disabled")).toBeUndefined();
      // The glyph is hidden; the words beside it are what a reader hears.
      expect(gap.get('[aria-hidden="true"]').text()).toBe("…");
      expect(gap.text()).toContain("More pages");
    }
  });

  it("anchors the first and last page either side of the window once both ellipses are needed", () => {
    const wrapper = mountPagination({ total: 1000, page: 37 });
    expect(pages(wrapper)).toEqual(["1", "36", "37", "38", "100"]);
  });

  it("shows no ellipsis at all while every page fits, instead of a gap standing for nothing", () => {
    const wrapper = mountPagination({ total: 50, page: 1 });
    expect(pages(wrapper)).toEqual(["1", "2", "3", "4", "5"]);
    expect(wrapper.findAll('[data-type="ellipsis"]')).toHaveLength(0);
  });

  it("floors an empty result set at one page, so the control never renders zero pages", () => {
    const wrapper = mountPagination({ total: 0, page: 1 });
    expect(pages(wrapper)).toEqual(["1"]);
    expect(button(wrapper, "Previous Page").disabled).toBe(true);
    expect(button(wrapper, "Next Page").disabled).toBe(true);
  });

  it("keeps a single page reachable and both directions closed when everything fits on it", () => {
    const wrapper = mountPagination({ total: 6, page: 1 });
    expect(pages(wrapper)).toEqual(["1"]);
    expect(wrapper.get('[aria-current="page"]').text()).toBe("1");
    expect(button(wrapper, "First Page").disabled).toBe(true);
    expect(button(wrapper, "Last Page").disabled).toBe(true);
  });

  it("reads the position out as text in the compact variant, with no numbered row", () => {
    const wrapper = mountPagination({ total: 120, page: 3, variant: "compact" });
    expect(wrapper.get('[role="status"]').text().replace(/\s+/g, " ")).toBe("Page 3 of 12");
    expect(wrapper.findAll('[data-type="page"]')).toHaveLength(0);
    expect(wrapper.find('[aria-label="First Page"]').exists()).toBe(false);
  });

  it("leaves the simple variant with prev and next alone, announcing the position only to a reader", () => {
    const wrapper = mountPagination({ total: 120, page: 3, variant: "simple" });
    expect(wrapper.findAll("button").map((b) => b.attributes("aria-label"))).toEqual([
      "Previous Page",
      "Next Page",
    ]);
    expect(wrapper.get('[role="status"]').classes()).toContain("sr-only");
  });

  it("gives the full variant no live region, so the numbered row is not announced twice", () => {
    const wrapper = mountPagination({ total: 120, page: 3 });
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
  });

  it("disables every control at once and refuses to move the page while disabled", async () => {
    const wrapper = mountPagination({ total: 120, page: 3, disabled: true });
    expect(wrapper.findAll("button").every((b) => (b.element as HTMLButtonElement).disabled)).toBe(
      true,
    );
    await wrapper.get('[aria-label="Page 4"]').trigger("click");
    expect(wrapper.emitted("update:page")).toBeUndefined();
  });

  it("widens the window with siblingCount rather than needing a different variant", () => {
    const wrapper = mountPagination({ total: 1000, page: 37, siblingCount: 2 });
    expect(pages(wrapper)).toEqual(["1", "35", "36", "37", "38", "39", "100"]);
  });

  it("drops the anchored ends and the ellipses entirely when showEdges is off", () => {
    const wrapper = mountPagination({ total: 1000, page: 37, showEdges: false });
    expect(pages(wrapper)).toEqual(["36", "37", "38"]);
    expect(wrapper.findAll('[data-type="ellipsis"]')).toHaveLength(0);
  });

  it("recounts the pages from itemsPerPage, not from a fixed page size", () => {
    const wrapper = mountPagination({ total: 120, page: 1, itemsPerPage: 60 });
    expect(pages(wrapper)).toEqual(["1", "2"]);
  });

  it("keeps a page that survives a change on its own DOM node, so the row never re-renders under a reader", async () => {
    const wrapper = mountPagination({ total: 100, page: 3 });
    expect(pages(wrapper)).toEqual(["1", "2", "3", "4", "5", "10"]);
    const anchor = button(wrapper, "Page 1");
    const survivor = button(wrapper, "Page 5");
    const far = button(wrapper, "Page 10");

    await wrapper.setProps({ page: 6 });
    expect(pages(wrapper)).toEqual(["1", "5", "6", "7", "10"]);

    expect(button(wrapper, "Page 1")).toBe(anchor);
    expect(button(wrapper, "Page 5")).toBe(survivor);
    expect(button(wrapper, "Page 10")).toBe(far);
  });

  it("merges a caller's class through cn rather than concatenating it onto the nav's own", () => {
    const wrapper = mountPagination({ total: 50, page: 1 }, { class: "gap-4" });
    expect(wrapper.classes()).toContain("gap-4");
    expect(wrapper.classes()).not.toContain("gap-1");
  });

  it("routes every other fallthrough attribute onto the nav, which is the node they describe", () => {
    const wrapper = mountPagination({ total: 50, page: 1 }, { "data-testid": "invoices" });
    expect(wrapper.attributes("data-testid")).toBe("invoices");
  });
});
