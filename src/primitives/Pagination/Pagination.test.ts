import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { provideLoomLabels } from "../../lib/labels";
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

/** A host declaring an application-wide vocabulary above the control. */
function hostWith(vocabulary: () => Record<string, unknown>) {
  return defineComponent({
    setup(_props, { slots }) {
      provideLoomLabels(vocabulary);
      return () => h("div", slots.default?.());
    },
  });
}

/** Every `aria-label` on the control, in document order. */
function names(wrapper: {
  findAll: (selector: string) => { attributes: (n: string) => string | undefined }[];
}) {
  return wrapper.findAll("button").map((b) => b.attributes("aria-label"));
}

describe("Pagination", () => {
  it("is a navigation landmark carrying an accessible name, so two on one page stay distinguishable", () => {
    const wrapper = mountPagination({ total: 50, page: 1 });
    expect((wrapper.element as HTMLElement).tagName).toBe("NAV");
    expect(wrapper.attributes("aria-label")).toBe("Pagination");

    const named = mountPagination({ total: 50, page: 1, labels: { nav: "Invoices, bottom" } });
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
    await wrapper.get('[aria-label="Next page"]').trigger("click");
    expect(wrapper.emitted("update:page")).toEqual([[2]]);
    expect(wrapper.get('[aria-current="page"]').text()).toBe("2");
  });

  it("genuinely disables the backward controls on the first page, rather than only dimming them", () => {
    const wrapper = mountPagination({ total: 50, page: 1 });
    expect(button(wrapper, "First page").disabled).toBe(true);
    expect(button(wrapper, "Previous page").disabled).toBe(true);
    expect(button(wrapper, "Next page").disabled).toBe(false);
    expect(button(wrapper, "Last page").disabled).toBe(false);
  });

  it("genuinely disables the forward controls on the last page, rather than only dimming them", () => {
    const wrapper = mountPagination({ total: 50, page: 5 });
    expect(button(wrapper, "Next page").disabled).toBe(true);
    expect(button(wrapper, "Last page").disabled).toBe(true);
    expect(button(wrapper, "Previous page").disabled).toBe(false);
  });

  it("does not fire a disabled direction, so a control that looks unavailable is unavailable", async () => {
    const wrapper = mountPagination({ total: 50, page: 1 });
    await wrapper.get('[aria-label="Previous page"]').trigger("click");
    expect(wrapper.emitted("update:page")).toBeUndefined();
  });

  it("hands keyboard focus to the current page when the control it was on becomes disabled", async () => {
    const wrapper = mountPagination({ total: 20 });
    const next = button(wrapper, "Next page");
    next.focus();

    press(next, 0);
    await settle();

    expect(next.disabled).toBe(true);
    expect(document.activeElement).toBe(button(wrapper, "Page 2"));
    expect((document.activeElement as HTMLElement).getAttribute("aria-current")).toBe("page");
  });

  it("hands focus to the mirror control when the variant has no page buttons to land on", async () => {
    const wrapper = mountPagination({ total: 20, variant: "simple" });
    const next = button(wrapper, "Next page");
    next.focus();
    press(next, 0);
    await settle();

    expect(document.activeElement).toBe(button(wrapper, "Previous page"));
  });

  it("leaves focus alone for a pointer press, which has no place in the document to lose", async () => {
    const wrapper = mountPagination({ total: 20 });
    press(button(wrapper, "Next page"), 1);
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
    expect(button(wrapper, "Previous page").disabled).toBe(true);
    expect(button(wrapper, "Next page").disabled).toBe(true);
  });

  it("keeps a single page reachable and both directions closed when everything fits on it", () => {
    const wrapper = mountPagination({ total: 6, page: 1 });
    expect(pages(wrapper)).toEqual(["1"]);
    expect(wrapper.get('[aria-current="page"]').text()).toBe("1");
    expect(button(wrapper, "First page").disabled).toBe(true);
    expect(button(wrapper, "Last page").disabled).toBe(true);
  });

  it("reads the position out as text in the compact variant, with no numbered row", () => {
    const wrapper = mountPagination({ total: 120, page: 3, variant: "compact" });
    expect(wrapper.get('[role="status"]').text().replace(/\s+/g, " ")).toBe("Page 3 of 12");
    expect(wrapper.findAll('[data-type="page"]')).toHaveLength(0);
    expect(wrapper.find('[aria-label="First page"]').exists()).toBe(false);
  });

  it("leaves the simple variant with prev and next alone, announcing the position only to a reader", () => {
    const wrapper = mountPagination({ total: 120, page: 3, variant: "simple" });
    expect(wrapper.findAll("button").map((b) => b.attributes("aria-label"))).toEqual([
      "Previous page",
      "Next page",
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

  // The defect these two pin. `disabled:opacity-50` on a page button faded the
  // number written on it along with the button: 2.05:1 for an ordinary page,
  // 2.48:1 for the current one. The numbers are the only thing a pager says, so
  // the dim is replaced by measured fills — and no test of the emitted markup
  // would have caught a colour, which is why the absence of the class is
  // asserted alongside what took its place.
  it("paints a disabled page number in a measured colour rather than fading it", () => {
    const wrapper = mountPagination({ total: 120, page: 3, disabled: true });
    const other = wrapper.get('[aria-label="Page 4"]').classes();

    expect(other.some((c) => c.includes("opacity"))).toBe(false);
    // 4.67:1 — `--color-muted-foreground` over the neutral well it drains to.
    expect(other).toContain("disabled:bg-muted");
    expect(other).toContain("disabled:text-muted-foreground");
  });

  it("keeps the current page on the warp wash while disabled, so which page it is survives", () => {
    const wrapper = mountPagination({ total: 120, page: 3, disabled: true });
    const current = wrapper.get('[aria-current="page"]').classes();

    expect(current.some((c) => c.includes("opacity"))).toBe(false);
    // 6.84:1, and still the only button in the row wearing the warp — being on
    // page 3 is information, not decoration.
    expect(current).toContain("disabled:bg-primary-muted");
    expect(current).toContain("disabled:text-primary");
  });

  // The counterpart verdict, and it is deliberate rather than an oversight: an
  // edge control's entire content is an `aria-hidden` chevron, so there is no
  // text for the alpha to take down and the name it announces comes from an
  // `aria-label` no paint touches.
  it("leaves the edge controls dimming, because they hold a glyph and no text", () => {
    const wrapper = mountPagination({ total: 120, page: 1 });
    const prev = button(wrapper, "Previous page");

    expect(prev.disabled).toBe(true);
    expect(prev.className).toContain("disabled:opacity-50");
    expect(prev.textContent.trim()).toBe("");
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

  it("speaks Loom's English rather than Reka's, which no prop of Reka's can reach", () => {
    const wrapper = mountPagination({ total: 50, page: 3 });
    // Reka writes `aria-label="First Page"`, `"Previous Page"`, `"Next Page"`
    // and `"Last Page"` into its own vnode props with no prop to change them.
    // Loom's defaults differ from Reka's in exactly one respect — the second
    // word is not capitalised — and that is what makes this an assertion about
    // *whose* string reached the DOM rather than about the wording.
    expect(names(wrapper)).toEqual([
      "First page",
      "Previous page",
      "Page 1",
      "Page 2",
      "Page 3",
      "Page 4",
      "Page 5",
      "Next page",
      "Last page",
    ]);
    for (const name of names(wrapper)) {
      expect(name).not.toMatch(/ Page$/);
    }
  });

  it("replaces every name Reka supplies when a caller hands it a bag", () => {
    const wrapper = mountPagination({
      total: 50,
      page: 2,
      labels: {
        first: "Trang đầu",
        previous: "Trang trước",
        next: "Trang sau",
        last: "Trang cuối",
        page: ({ page }) => `Trang ${String(page)}`,
      },
    });
    expect(names(wrapper)).toEqual([
      "Trang đầu",
      "Trang trước",
      "Trang 1",
      "Trang 2",
      "Trang 3",
      "Trang 4",
      "Trang 5",
      "Trang sau",
      "Trang cuối",
    ]);
    // Replacing the name leaves everything else Reka publishes about the button
    // intact — the override is not a whole-props takeover.
    expect(wrapper.get('[aria-label="Trang 2"]').attributes("aria-current")).toBe("page");
    expect(button(wrapper, "Trang đầu").disabled).toBe(false);
  });

  it("keeps the keys a caller left out in English instead of blanking them", () => {
    const wrapper = mountPagination({ total: 50, page: 2, labels: { next: "Trang sau" } });
    expect(button(wrapper, "Trang sau").disabled).toBe(false);
    expect(button(wrapper, "Previous page").disabled).toBe(false);
    expect(wrapper.attributes("aria-label")).toBe("Pagination");
  });

  it("renames the ellipsis and the position readout, which are Loom's own strings", () => {
    const gapped = mountPagination({
      total: 1000,
      page: 37,
      labels: { ellipsis: "Còn nhiều trang" },
    });
    expect(gapped.get('[data-type="ellipsis"]').text()).toContain("Còn nhiều trang");

    const compact = mountPagination({
      total: 120,
      page: 3,
      variant: "compact",
      // The numbers arrive raw, so a host reorders the sentence and shapes the
      // digits itself. Loom never hands a label a formatted string.
      labels: { position: ({ page, pageCount }) => `${String(page)}/${String(pageCount)} trang` },
    });
    expect(compact.get('[role="status"]').text().replace(/\s+/g, " ")).toBe("3/12 trang");
  });

  it("takes its names from a host's vocabulary, and lets one instance correct a single key", () => {
    const wrapper = mount(
      hostWith(() => ({ pagination: { nav: "Phân trang", next: "Trang sau" } })),
      {
        attachTo: document.body,
        slots: {
          default: () => [
            h(Pagination, { total: 50, page: 1, variant: "simple" }),
            h(Pagination, {
              total: 50,
              page: 1,
              variant: "simple",
              labels: { nav: "Phân trang, dưới" },
            }),
          ],
        },
      },
    );

    const navs = wrapper.findAll("nav");
    // Two paginations on one page must be distinguishable, and an
    // application-wide vocabulary alone cannot make them so.
    expect(navs[0]!.attributes("aria-label")).toBe("Phân trang");
    expect(navs[1]!.attributes("aria-label")).toBe("Phân trang, dưới");
    // The vocabulary still reaches the keys neither instance touched.
    expect(navs[1]!.findAll("button").map((b) => b.attributes("aria-label"))).toEqual([
      "Previous page",
      "Trang sau",
    ]);
  });

  it("repaints its names when the host switches language under it", async () => {
    const locale = ref("en");
    const wrapper = mount(
      hostWith(() => (locale.value === "en" ? {} : { pagination: { next: "Trang sau" } })),
      {
        attachTo: document.body,
        slots: { default: () => h(Pagination, { total: 50, page: 1, variant: "simple" }) },
      },
    );
    expect(wrapper.get('[data-edge="next"]').attributes("aria-label")).toBe("Next page");

    locale.value = "vi";
    await nextTick();

    expect(wrapper.get('[data-edge="next"]').attributes("aria-label")).toBe("Trang sau");
  });
});
