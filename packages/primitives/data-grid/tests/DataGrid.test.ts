import { enableAutoUnmount, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { provideLoomLabels } from "@ecoma-io/loom-labels";
import DataGrid, { DATA_GRID_LABELS } from "../src/DataGrid.vue";
import { readFileSync } from "node:fs";
import { join } from "node:path";

enableAutoUnmount(afterEach);

// jsdom's ResizeObserver: the scroll region measures on mount.
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
afterEach(() => {
  vi.unstubAllGlobals();
});

const COLUMNS = [
  { key: "name", header: "Name", sortable: true },
  { key: "role", header: "Role" },
  { key: "logins", header: "Logins", align: "right" as const, sortable: true, width: "6rem" },
];
const ROWS = [
  { id: "u1", name: "Ada", role: "admin", logins: 12 },
  { id: "u2", name: "Alan", role: "member", logins: 7 },
  { id: "u3", name: "Grace", role: "member", logins: 21 },
];

// Focus assertions need the tree attached — the roving moves set real focus.
function mountGrid(props: Record<string, unknown> = {}) {
  return mount(DataGrid, {
    attachTo: document.body,
    props: { columns: COLUMNS, rows: ROWS, ...props },
  });
}

// Keydown is delegated to the table, so a synthetic event has to originate
// from a cell — target must already carry data-r/data-c — and that cell must
// hold real focus, exactly as a physical keypress would arrive.
const cell = (wrapper: VueWrapper, r: number | string, c: number | string) =>
  wrapper.find<HTMLElement>(`[data-r='${String(r)}'][data-c='${String(c)}']`);

describe("structure", () => {
  it("renders the ARIA grid: rows, column headers, gridcells", () => {
    const wrapper = mountGrid({ selectable: true });
    const grid = wrapper.find('[role="grid"]');
    expect(grid.exists()).toBe(true);
    // Header row + three body rows.
    expect(grid.findAll('[role="row"]')).toHaveLength(4);
    // Selection column + three data columns.
    expect(grid.findAll('[role="columnheader"]')).toHaveLength(4);
    expect(grid.findAll('[role="gridcell"]')).toHaveLength(12);
    expect(grid.find('[role="columnheader"]').attributes("scope")).toBe("col");
  });

  it("names the scroll region after the caption", () => {
    const wrapper = mountGrid({ caption: "Team members" });
    expect(wrapper.find('[role="region"]').attributes("aria-label")).toBe("Team members");
  });

  it("renders field values, right-aligns a numeric column and pins its width", () => {
    const wrapper = mountGrid();
    expect(cell(wrapper, 0, 0).text()).toBe("Ada");
    expect(cell(wrapper, 2, 1).text()).toBe("member");
    const rightHeader = cell(wrapper, -1, 2);
    expect(rightHeader.classes()).toContain("text-right");
    expect(rightHeader.attributes("style")).toContain("width: 6rem");
    const rightCell = cell(wrapper, 0, 2);
    expect(rightCell.classes()).toContain("text-right");
    expect(rightCell.classes()).toContain("[font-variant-numeric:tabular-nums]");
  });

  it("lets a host render a cell through the cell slot", () => {
    const wrapper = mount(DataGrid, {
      attachTo: document.body,
      props: { columns: COLUMNS, rows: ROWS },
      slots: {
        cell: ({ value }: { value: unknown }) => h("b", String(value)),
      },
    });
    expect(wrapper.find('[role="gridcell"] b').exists()).toBe(true);
  });
});

describe("roving tabindex", () => {
  it("keeps exactly one Tab stop in the cell matrix", () => {
    const wrapper = mountGrid({ selectable: true });
    const grid = wrapper.find('[role="grid"]');
    const stops = grid.findAll('[data-r][tabindex="0"]');
    expect(stops).toHaveLength(1);
    // The active cell starts at the first selection cell.
    expect(stops[0]?.attributes("data-r")).toBe("0");
    expect(stops[0]?.attributes("data-c")).toBe("0");
    // Every other cell opted out of the tab order explicitly. Scoped to
    // cells: sort buttons and checkboxes are -1 by design and would
    // flatter the count.
    expect(grid.findAll('[data-r][tabindex="-1"]')).toHaveLength(4 * 4 - 1);
  });

  it("moves focus with the arrow keys and keeps the Tab stop in step", async () => {
    const wrapper = mountGrid();
    cell(wrapper, 0, 0).element.focus();
    await nextTick();

    await cell(wrapper, 0, 0).trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement).toBe(cell(wrapper, 0, 1).element);
    await cell(wrapper, 0, 1).trigger("keydown", { key: "ArrowDown" });
    expect(document.activeElement).toBe(cell(wrapper, 1, 1).element);
    await cell(wrapper, 1, 1).trigger("keydown", { key: "ArrowLeft" });
    expect(document.activeElement).toBe(cell(wrapper, 1, 0).element);
    await cell(wrapper, 1, 0).trigger("keydown", { key: "ArrowUp" });
    expect(document.activeElement).toBe(cell(wrapper, 0, 0).element);
    await cell(wrapper, 0, 0).trigger("keydown", { key: "ArrowUp" });
    // Up from the first body row lands in the header row.
    expect(document.activeElement).toBe(cell(wrapper, -1, 0).element);
    // The roving stop followed.
    expect(cell(wrapper, -1, 0).attributes("tabindex")).toBe("0");
    expect(cell(wrapper, 0, 0).attributes("tabindex")).toBe("-1");
  });

  it("honours Home, End and their Ctrl variants", async () => {
    const wrapper = mountGrid({ selectable: true });
    cell(wrapper, 1, 1).element.focus();
    await cell(wrapper, 1, 1).trigger("keydown", { key: "End" });
    expect(document.activeElement).toBe(cell(wrapper, 1, 3).element);
    await cell(wrapper, 1, 3).trigger("keydown", { key: "Home" });
    expect(document.activeElement).toBe(cell(wrapper, 1, 0).element);
    await cell(wrapper, 1, 0).trigger("keydown", { key: "End", ctrlKey: true });
    expect(document.activeElement).toBe(cell(wrapper, 2, 3).element);
    await cell(wrapper, 2, 3).trigger("keydown", { key: "Home", ctrlKey: true });
    expect(document.activeElement).toBe(cell(wrapper, 0, 0).element);
  });

  it("clamps at the matrix edges instead of falling off", async () => {
    const wrapper = mountGrid();
    cell(wrapper, 2, 2).element.focus();
    await cell(wrapper, 2, 2).trigger("keydown", { key: "ArrowRight" });
    await cell(wrapper, 2, 2).trigger("keydown", { key: "ArrowDown" });
    expect(document.activeElement).toBe(cell(wrapper, 2, 2).element);
    await cell(wrapper, 2, 2).trigger("keydown", { key: "ArrowUp" });
    await cell(wrapper, 1, 2).trigger("keydown", { key: "ArrowUp" });
    await cell(wrapper, 0, 2).trigger("keydown", { key: "ArrowUp" });
    expect(document.activeElement).toBe(cell(wrapper, -1, 2).element);
  });

  it("follows focus that arrived outside the keymap", async () => {
    const wrapper = mountGrid();
    await cell(wrapper, 1, 2).trigger("focusin");
    expect(cell(wrapper, 1, 2).attributes("tabindex")).toBe("0");
    expect(cell(wrapper, 0, 0).attributes("tabindex")).toBe("-1");
  });
});

describe("rows changing under the active cell", () => {
  it("keeps the active cell on the header row when rows shrink to none", async () => {
    const wrapper = mountGrid();
    cell(wrapper, 0, 0).element.focus();
    await cell(wrapper, 0, 0).trigger("keydown", { key: "ArrowUp" });
    expect(document.activeElement).toBe(cell(wrapper, -1, 0).element);
    // A floor of 0 would clamp the header to a body row that does not exist
    // once every row is gone, leaving the grid with no Tab stop at all.
    await wrapper.setProps({ rows: [] });
    await nextTick();
    const stops = wrapper.findAll('[data-r][tabindex="0"]');
    expect(stops).toHaveLength(1);
    expect(stops[0]?.attributes("data-r")).toBe("-1");
  });

  it("moves real focus to the clamped cell when the active one unmounts", async () => {
    const wrapper = mountGrid();
    cell(wrapper, 2, 1).element.focus();
    expect(document.activeElement).toBe(cell(wrapper, 2, 1).element);
    await wrapper.setProps({ rows: ROWS.slice(0, 1) });
    await nextTick();
    // The shrink unmounts the focused cell; without an explicit move, focus
    // falls to <body> and the grid's own onFocusin never hears about it.
    expect(document.activeElement).toBe(cell(wrapper, 0, 1).element);
  });
});

describe("sorting", () => {
  it("cycles a sortable header through ascending, descending, unsorted", async () => {
    const wrapper = mountGrid();
    const header = cell(wrapper, -1, 0);
    await header.trigger("keydown", { key: "Enter" });
    expect(header.attributes("aria-sort")).toBe("ascending");
    expect(wrapper.emitted("update:sort")?.at(-1)).toEqual([{ key: "name", direction: "asc" }]);
    expect(wrapper.emitted("sort-change")?.at(-1)).toEqual([{ key: "name", direction: "asc" }]);
    expect(header.find("button").text()).toContain("Sorted ascending");

    await header.find("button").trigger("click");
    expect(header.attributes("aria-sort")).toBe("descending");
    expect(wrapper.emitted("sort-change")?.at(-1)).toEqual([{ key: "name", direction: "desc" }]);

    await header.find("button").trigger("click");
    expect(header.attributes("aria-sort")).toBeUndefined();
    expect(wrapper.emitted("update:sort")?.at(-1)).toEqual([undefined]);
  });

  it("leaves an unsortable header silent on Enter", async () => {
    const wrapper = mountGrid();
    const header = cell(wrapper, -1, 1);
    header.element.focus();
    await header.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("update:sort")).toBeUndefined();
  });

  it("stays put in controlled mode until the host moves", async () => {
    const wrapper = mountGrid({ sort: { key: "logins", direction: "asc" } });
    const header = cell(wrapper, -1, 2);
    header.element.focus();
    await header.trigger("keydown", { key: "Enter" });
    // The request went out…
    expect(wrapper.emitted("update:sort")?.at(-1)).toEqual([{ key: "logins", direction: "desc" }]);
    // …but the aria-sort the reader sees still says what the host said.
    expect(header.attributes("aria-sort")).toBe("ascending");
    expect(cell(wrapper, -1, 0).attributes("aria-sort")).toBeUndefined();
  });
});

describe("selection", () => {
  it("renders no checkbox column without selectable", () => {
    const wrapper = mountGrid();
    expect(wrapper.find('[role="checkbox"]').exists()).toBe(false);
    expect(wrapper.find('[role="row"]').attributes("aria-selected")).toBeUndefined();
  });

  it("starts the select-all control unselected", () => {
    const wrapper = mountGrid({ selectable: true });
    expect(cell(wrapper, -1, 0).find('[role="checkbox"]').attributes("aria-checked")).toBe("false");
  });

  it("selects a row from its checkbox and announces it on the row", async () => {
    const wrapper = mountGrid({ selectable: true });
    await cell(wrapper, 0, 0).find('[role="checkbox"]').trigger("click");
    expect(wrapper.find("tbody tr").attributes("aria-selected")).toBe("true");
    expect(wrapper.emitted("update:selectedRowKeys")?.at(-1)).toEqual([["u1"]]);
    // One of three: the select-all control is mixed, literally.
    expect(cell(wrapper, -1, 0).find('[role="checkbox"]').attributes("aria-checked")).toBe("mixed");
  });

  it("reports all rows selected once every box is ticked", async () => {
    const wrapper = mountGrid({ selectable: true });
    for (const r of [0, 1, 2]) {
      await cell(wrapper, r, 0).find('[role="checkbox"]').trigger("click");
    }
    expect(cell(wrapper, -1, 0).find('[role="checkbox"]').attributes("aria-checked")).toBe("true");
    expect(wrapper.emitted("update:selectedRowKeys")?.at(-1)).toEqual([["u1", "u2", "u3"]]);
    // And select-all clears everything.
    await cell(wrapper, -1, 0).find('[role="checkbox"]').trigger("click");
    expect(wrapper.emitted("update:selectedRowKeys")?.at(-1)).toEqual([[]]);
  });

  it("keys selection through rowKey", async () => {
    const wrapper = mount(DataGrid, {
      attachTo: document.body,
      props: {
        columns: COLUMNS,
        rows: [{ key: 42, name: "Ada", role: "admin", logins: 12 }],
        rowKey: "key",
        selectable: true,
      },
    });
    await cell(wrapper, 0, 0).find('[role="checkbox"]').trigger("click");
    expect(wrapper.emitted("update:selectedRowKeys")?.at(-1)).toEqual([[42]]);
  });

  it("toggles the focused row with Space", async () => {
    const wrapper = mountGrid({ selectable: true });
    cell(wrapper, 1, 1).element.focus();
    await cell(wrapper, 1, 1).trigger("keydown", { key: " " });
    expect(wrapper.emitted("update:selectedRowKeys")?.at(-1)).toEqual([["u2"]]);
    // And on the select-all cell it selects everything.
    cell(wrapper, -1, 0).element.focus();
    await cell(wrapper, -1, 0).trigger("keydown", { key: " " });
    expect(wrapper.emitted("update:selectedRowKeys")?.at(-1)).toEqual([["u1", "u2", "u3"]]);
  });

  it("stays put in controlled mode until the host moves", async () => {
    const wrapper = mountGrid({ selectable: true, selectedRowKeys: [] });
    await cell(wrapper, 0, 0).find('[role="checkbox"]').trigger("click");
    expect(wrapper.emitted("update:selectedRowKeys")?.at(-1)).toEqual([["u1"]]);
    expect(wrapper.find("tbody tr").attributes("aria-selected")).toBe("false");
    // Host accepts: the state moves with the prop.
    await wrapper.setProps({ selectedRowKeys: ["u1"] });
    expect(wrapper.find("tbody tr").attributes("aria-selected")).toBe("true");
  });
});

describe("row activation", () => {
  it("emits rowActivate on Enter and on double-click", async () => {
    const wrapper = mountGrid();
    const target = cell(wrapper, 1, 0);
    target.element.focus();
    await target.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("rowActivate")?.at(-1)).toEqual([ROWS[1]]);
    await wrapper.find("tbody tr").trigger("dblclick");
    expect(wrapper.emitted("rowActivate")?.at(-1)).toEqual([ROWS[0]]);
  });
});

describe("labels", () => {
  it("speaks Loom's English by default", () => {
    expect(DATA_GRID_LABELS).toEqual({
      region: "Data grid",
      selectAll: "Select all rows",
      selectRow: "Select row",
      sortedAscending: "Sorted ascending",
      sortedDescending: "Sorted descending",
      sort: "Sort",
    });
    const wrapper = mountGrid({ selectable: true });
    expect(cell(wrapper, 0, 0).find('[role="checkbox"]').attributes("aria-label")).toBe(
      "Select row",
    );
    expect(cell(wrapper, -1, 0).find('[role="checkbox"]').attributes("aria-label")).toBe(
      "Select all rows",
    );
    expect(wrapper.find('[role="region"]').attributes("aria-label")).toBe("Data grid");
  });

  it("renames through the labels prop", () => {
    const wrapper = mountGrid({
      selectable: true,
      caption: "Projekte",
      labels: { selectRow: "Zeile auswählen" },
    });
    expect(cell(wrapper, 0, 0).find('[role="checkbox"]').attributes("aria-label")).toBe(
      "Zeile auswählen",
    );
    expect(wrapper.find('[role="region"]').attributes("aria-label")).toBe("Projekte");
  });

  it("answers the host vocabulary set through provideLoomLabels", () => {
    const Host = defineComponent({
      components: { DataGrid },
      setup() {
        provideLoomLabels(() => ({ dataGrid: { selectAll: "Alles auswählen" } }));
        return () => h(DataGrid, { columns: COLUMNS, rows: ROWS, selectable: true });
      },
    });
    const wrapper = mount(Host, { attachTo: document.body });
    expect(cell(wrapper, -1, 0).find('[role="checkbox"]').attributes("aria-label")).toBe(
      "Alles auswählen",
    );
  });
});

describe("DataGrid docs", () => {
  it("documents no slot the component does not declare", () => {
    const md = readFileSync(
      join(import.meta.dirname, "../../../../docs/components/data-grid.md"),
      "utf8",
    );
    const sfc = readFileSync(join(import.meta.dirname, "../src/DataGrid.vue"), "utf8");
    const declared = new Set(
      [...sfc.matchAll(/<slot(?:\s+name="([\w-]+)")?[^>]*>/g)].map((m) => m[1] ?? "default"),
    );
    // Backticked `#name` tokens in the page's prose are promises about a
    // scoped slot. A documented slot the SFC does not declare is a phantom
    // API — the page must name exactly what the template renders ("#header"
    // drifted this way once; the generated @api table cannot catch prose).
    const documented = [...md.matchAll(/`#([\w-]+)`/g)]
      .map((m) => m[1] ?? "")
      .filter((name) => name !== "");
    for (const name of documented) {
      expect(declared.has(name), `docs promise a #${name} slot DataGrid does not declare`).toBe(
        true,
      );
    }
  });
});
