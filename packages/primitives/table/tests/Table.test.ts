import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import Table from "../src/Table.vue";
import TableRow from "../src/TableRow.vue";
import TableHead from "../src/TableHead.vue";
import TableCell from "../src/TableCell.vue";

enableAutoUnmount(afterEach);

// jsdom has no ResizeObserver — the region's overflow watcher observes the
// table (the same gap SegmentedControl's tests stub around).
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
});

function mountTable(rowProps: Record<string, unknown> = {}) {
  const activations = { count: 0 };
  const Wrapper = defineComponent(() => {
    return () =>
      h(
        Table,
        { caption: "Deployments" },
        {
          default: () => [
            h(
              "thead",
              h(TableRow, [
                h(TableHead, { sortable: true }, () => "Service"),
                h(TableHead, { align: "right" }, () => "Builds"),
              ]),
            ),
            h("tbody", [
              h(TableRow, [
                h(TableCell, () => "api"),
                h(TableCell, { align: "right" }, () => "12"),
              ]),
              h(TableRow, { ...rowProps, onActivate: () => activations.count++ }, [
                h(TableCell, () => "web"),
                h(TableCell, { align: "right" }, () => "7"),
              ]),
            ]),
          ],
        },
      );
  });
  return { wrapper: mount(Wrapper), activations };
}

describe("Table", () => {
  it("renders a real caption and names the scroll region after it", () => {
    const { wrapper } = mountTable();
    expect(wrapper.find("caption").text()).toBe("Deployments");
    expect(wrapper.get('[role="region"]').attributes("aria-label")).toBe("Deployments");
  });

  it("becomes focusable exactly when it overflows — never a dead Tab stop", async () => {
    const { wrapper } = mountTable();
    const region = wrapper.get('[role="region"]');
    // A fitting table is not a Tab stop.
    expect(region.attributes("tabindex")).toBeUndefined();

    // Simulate overflow, then let the component's own resize listener remeasure.
    const el = region.element as HTMLElement;
    Object.defineProperty(el, "scrollWidth", { value: 900, configurable: true });
    Object.defineProperty(el, "clientWidth", { value: 300, configurable: true });
    window.dispatchEvent(new Event("resize"));
    await nextTick();
    expect(region.attributes("tabindex")).toBe("0");

    // And back: fitting again retires the stop.
    Object.defineProperty(el, "scrollWidth", { value: 300, configurable: true });
    window.dispatchEvent(new Event("resize"));
    await nextTick();
    expect(region.attributes("tabindex")).toBeUndefined();
  });

  it("carries density on the table so cells cannot disagree with their neighbours", () => {
    const compact = mountTable().wrapper;
    void compact;
    const wrapper = mount({
      setup() {
        return () => h(Table, { caption: "D", density: "compact" }, { default: () => [] });
      },
    });
    expect(wrapper.find("table").attributes("data-density")).toBe("compact");
  });

  it("gives tfoot its own top hairline, wherever it sits in the markup", () => {
    const wrapper = mount({
      setup() {
        return () =>
          h(
            Table,
            { caption: "D" },
            {
              default: () => [
                h("tfoot", h(TableRow, [h(TableCell, () => "total")])),
                h("tbody", h(TableRow, [h(TableCell, () => "1")])),
              ],
            },
          );
      },
    });
    // The hairline is wrapper-owned descendant styling: it lives in the
    // table's class list, not on the cell's own attribute.
    const tableClasses = wrapper.find("table").attributes("class") ?? "";
    expect(tableClasses).toContain("[&_tfoot_td]:border-t");
    expect(tableClasses).toContain("[&_tfoot_td]:border-border-strong");
  });

  it("declares every header a column so cell association survives any styling", () => {
    const { wrapper } = mountTable();
    const heads = wrapper.findAll("th");
    expect(heads).toHaveLength(2);
    expect(heads.map((head) => head.attributes("scope"))).toEqual(["col", "col"]);
  });

  it("aligns numeric columns right on tabular digits, header and cells together", () => {
    const { wrapper } = mountTable();
    expect(wrapper.find("th[class*='text-right']").exists()).toBe(true);
    expect(wrapper.find("td[class*='tabular-nums']").exists()).toBe(true);
  });

  describe("row states", () => {
    it("makes an interactive row the only Tab stop of the pair, activating on Enter", async () => {
      const { wrapper, activations } = mountTable({ interactive: true });
      const rows = wrapper.findAll("tbody tr");
      expect(rows[0]!.attributes("tabindex")).toBeUndefined();
      expect(rows[1]!.attributes("tabindex")).toBe("0");

      await rows[1]!.trigger("keydown", { key: "Enter" });
      expect(activations.count).toBe(1);
    });

    it("pins hover language to interactive rows only — a resting row answers no pointer", () => {
      const { wrapper } = mountTable({ interactive: true });
      const [staticRow, activeRow] = wrapper.findAll("tbody tr");
      expect(staticRow!.classes().join(" ")).not.toContain("hover:bg-subtle");
      expect(activeRow!.classes().join(" ")).toContain("hover:bg-subtle");
    });

    it("marks selection with aria-selected without borrowing interactivity", () => {
      const { wrapper } = mountTable({ selected: true });
      const rows = wrapper.findAll("tbody tr");
      expect(rows[1]!.attributes("aria-selected")).toBe("true");
      expect(rows[1]!.attributes("tabindex")).toBeUndefined();
      // Spec-noise discipline: an unselected interactive row omits the
      // attribute rather than announcing false forever.
      expect(rows[0]!.attributes("aria-selected")).toBeUndefined();
    });

    it("does not fire activation for presses on real controls inside a cell", async () => {
      const activations = { count: 0 };
      const Wrapper = defineComponent(() => {
        return () =>
          h(
            Table,
            { caption: "D" },
            {
              default: () => [
                h(
                  "tbody",
                  h(
                    TableRow,
                    {
                      interactive: true,
                      onActivate: () => activations.count++,
                    },
                    [
                      h(TableCell, () =>
                        h("button", { type: "button", "data-testid": "inner" }, "Row action"),
                      ),
                    ],
                  ),
                ),
              ],
            },
          );
      });
      const wrapper = mount(Wrapper);
      await wrapper.get('[data-testid="inner"]').trigger("click");
      expect(activations.count).toBe(0);
      // A press on the row itself still activates.
      await wrapper.findAll("tbody tr")[0]!.trigger("click");
      expect(activations.count).toBe(1);
    });

    it("drains a disabled row: muted, announced, inert to activation", async () => {
      const { wrapper, activations } = mountTable({ disabled: true, interactive: true });
      const row = wrapper.findAll("tbody tr")[1]!;
      expect(row.classes().join(" ")).toContain("text-muted-foreground");
      await row.trigger("keydown", { key: "Enter" });
      expect(activations.count).toBe(0);
    });
  });

  describe("sortable headers", () => {
    it("cycles uncontrolled asc → desc → none, keeping aria-sort in step", async () => {
      const wrapper = mount(TableHead, { props: { sortable: true }, slots: { default: "S" } });
      const th = wrapper.find("th");
      const button = wrapper.find("button");
      expect(button.exists()).toBe(true);
      expect(th.attributes("aria-sort")).toBeUndefined();

      await button.trigger("click");
      expect(th.attributes("aria-sort")).toBe("ascending");
      await button.trigger("click");
      expect(th.attributes("aria-sort")).toBe("descending");
      await button.trigger("click");
      expect(th.attributes("aria-sort")).toBeUndefined();
      // Every transition was reported for hosts that want the data too.
      expect(wrapper.emitted("update:sort")?.length).toBe(3);
    });

    it("stays controlled when bound: reports the request without moving itself", async () => {
      const wrapper = mount(TableHead, {
        props: { sortable: true, sort: "asc" as const },
        slots: { default: "S" },
      });
      await wrapper.find("button").trigger("click");
      expect(wrapper.emitted("update:sort")![0]).toEqual(["desc"]);
      // The prop still says asc — the host decides when reality moves.
      expect(wrapper.find("th").attributes("aria-sort")).toBe("ascending");
    });

    it("is a plain header without sortable: no control, no aria-sort noise", () => {
      const wrapper = mount(TableHead, { slots: { default: "S" } });
      expect(wrapper.find("button").exists()).toBe(false);
      expect(wrapper.find("th").attributes("aria-sort")).toBeUndefined();
    });

    it("carries its state in words beside the glyph — chevrons are shape-only", async () => {
      const wrapper = mount(TableHead, { props: { sortable: true }, slots: { default: "S" } });
      await wrapper.find("button").trigger("click");
      expect(wrapper.find(".sr-only").text()).toMatch(/ascending/i);
    });
  });
});
