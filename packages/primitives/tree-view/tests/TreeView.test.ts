import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, type Component, type VNode } from "vue";
import { provideLoomLabels } from "@ecoma-io/loom-labels";
import TreeView, { TREE_VIEW_LABELS, type TreeNode } from "../src/TreeView.vue";

enableAutoUnmount(afterEach);

/*
 * Two disabled rows, one per kind of unavailability: `minerals` is a disabled
 * leaf, `rocks` a disabled branch, so both halves of the contract — reachable
 * but unchoosable — are exercised against real nodes.
 */
const treeNodes: TreeNode[] = [
  {
    value: "animals",
    label: "Animals",
    children: [
      { value: "birds", label: "Birds" },
      {
        value: "mammals",
        label: "Mammals",
        children: [
          { value: "dog", label: "Dog" },
          { value: "cat", label: "Cat", disabled: true },
        ],
      },
    ],
  },
  {
    value: "plants",
    label: "Plants",
    children: [
      { value: "fern", label: "Fern" },
      { value: "moss", label: "Moss" },
    ],
  },
  { value: "minerals", label: "Minerals", disabled: true },
  {
    value: "rocks",
    label: "Rocks",
    disabled: true,
    children: [{ value: "salt", label: "Salt" }],
  },
];

/** A load that never settles: long enough to read the busy row in a test. */
const pendingChildren = new Promise<TreeNode[]>(() => undefined);

type TreeProps = InstanceType<typeof TreeView>["$props"];

function mountTree(props: Partial<TreeProps> = {}) {
  // `nodes` is the one required prop, seeded like Combobox seeds `options`;
  // a caller passing its own `nodes` overrides it through the spread.
  return mount(TreeView, { props: { nodes: treeNodes, ...props }, attachTo: document.body });
}

function mountHost(render: () => VNode) {
  return mount(defineComponent({ setup: () => render }), {
    attachTo: document.body,
  });
}

function getTree(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[role="tree"]');
  if (!el) throw new Error("no tree in the document");
  return el;
}

function items(): HTMLElement[] {
  return [...getTree().querySelectorAll<HTMLElement>('[role="treeitem"]')];
}

function item(value: string | number): HTMLElement {
  const el = getTree().querySelector<HTMLElement>(
    `[data-tree-value="${CSS.escape(String(value))}"]`,
  );
  if (!el) throw new Error(`no row for value ${String(value)}`);
  return el;
}

/**
 * The `li[role=treeitem]` — the grammar carrier. The ARIA attributes sit on
 * the list item, not on the focusable row div inside it, so grammar
 * assertions read this and interaction assertions read `item()`.
 */
function li(value: string | number): HTMLElement {
  const el = item(value).closest("li");
  if (!el) throw new Error(`no treeitem element for value ${String(value)}`);
  return el;
}

function rowText(value: string | number): string {
  return item(value).textContent;
}

function focusedValue(): string | null {
  const el = document.activeElement as HTMLElement | null;
  return el?.dataset.treeValue ?? null;
}

/** The values holding the roving tab stop — always at most one. */
function tabStops(): string[] {
  return [...getTree().querySelectorAll<HTMLElement>("[data-tree-value]")]
    .filter((el) => el.getAttribute("tabindex") === "0")
    .map((el) => el.dataset.treeValue ?? "");
}

async function press(key: string): Promise<void> {
  const target = document.activeElement as HTMLElement | null;
  if (!target) throw new Error("nothing focused to press a key on");
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  await nextTick();
}

/** The payloads of every `update:modelValue` emission, in order. */
function emittedValues(
  wrapper: ReturnType<typeof mountTree>,
): (string | number | (string | number)[])[] {
  return (
    wrapper
      .emitted("update:modelValue")
      ?.map((call) => call[0] as string | number | (string | number)[]) ?? []
  );
}

async function click(value: string | number): Promise<void> {
  item(value).click();
  await nextTick();
}

/**
 * The chevron is the row's first child — the disclosure glyph span, present
 * exactly when the row is expandable — reached structurally because it is
 * deliberately not named for assistive technology.
 */
async function clickChevron(value: string | number): Promise<void> {
  const chevron = item(value).firstElementChild;
  if (!chevron) throw new Error("row has no chevron to click");
  (chevron as HTMLElement).click();
  await nextTick();
}

describe("TreeView — the APG grammar", () => {
  it("renders tree, treeitem, level, setsize and posinset on a collapsed tree", () => {
    mountTree({ nodes: treeNodes });
    expect(items().map((el) => el.textContent)).toEqual(["Animals", "Plants", "Minerals", "Rocks"]);
    expect(items().map((el) => el.getAttribute("aria-level"))).toEqual(["1", "1", "1", "1"]);
    expect(items().map((el) => el.getAttribute("aria-setsize"))).toEqual(["4", "4", "4", "4"]);
    expect(items().map((el) => el.getAttribute("aria-posinset"))).toEqual(["1", "2", "3", "4"]);
    expect(li("animals").getAttribute("aria-expanded")).toBe("false");
    expect(li("minerals").hasAttribute("aria-expanded")).toBe(false);
    expect(document.querySelector('[role="group"]')).toBeNull();
  });

  it("expands on ArrowRight and renders the open branch at the right depth", async () => {
    mountTree({ nodes: treeNodes });
    item("animals").focus();
    await press("ArrowRight");
    expect(li("animals").getAttribute("aria-expanded")).toBe("true");
    const group = document.querySelector('[role="group"]');
    expect(group).not.toBeNull();
    expect(li("birds").getAttribute("aria-level")).toBe("2");
    expect(li("birds").getAttribute("aria-setsize")).toBe("2");
    expect(li("birds").getAttribute("aria-posinset")).toBe("1");
    // A closed branch still holds one collapsed row of its own.
    expect(li("mammals").hasAttribute("aria-expanded")).toBe(true);
  });

  it("opens a branch on mount when defaultExpanded names it", () => {
    mountTree({ nodes: treeNodes, defaultExpanded: ["animals"] });
    expect(item("birds")).not.toBeNull();
    expect(li("animals").getAttribute("aria-expanded")).toBe("true");
  });
});
describe("TreeView — the roving tab stop", () => {
  it("starts on the first enabled row and moves with the arrows", async () => {
    mountTree({ nodes: treeNodes });
    expect(tabStops()).toEqual(["animals"]);
    item("animals").focus();
    await press("ArrowDown");
    expect(tabStops()).toEqual(["plants"]);
    expect(focusedValue()).toBe("plants");
  });

  it("keeps exactly one tab stop as focus moves", async () => {
    mountTree({ nodes: treeNodes, defaultExpanded: ["animals", "mammals"] });
    item("birds").focus();
    for (const key of ["ArrowDown", "ArrowDown", "ArrowDown", "ArrowDown"]) {
      await press(key);
      expect(tabStops().length).toBe(1);
    }
    expect(focusedValue()).toBe("plants");
  });

  it("walks a disabled row without making it the entry tab stop", async () => {
    mountTree({ nodes: treeNodes });
    item("plants").focus();
    await press("ArrowDown");
    expect(focusedValue()).toBe("minerals");
    // From outside the tree, Tab still lands on `animals`, never `minerals`.
    item("animals").focus();
    await press("ArrowDown");
    await press("ArrowUp");
    await press("ArrowUp");
    expect(tabStops()).toEqual(["animals"]);
  });

  it("reaches the last visible row with End and the first with Home", async () => {
    mountTree({ nodes: treeNodes, defaultExpanded: ["animals", "mammals"] });
    item("animals").focus();
    await press("End");
    expect(focusedValue()).toBe("rocks");
    await press("Home");
    expect(focusedValue()).toBe("animals");
  });
});

describe("TreeView — branch keys", () => {
  it("collapses the focused branch on ArrowLeft", async () => {
    mountTree({ nodes: treeNodes, defaultExpanded: ["animals", "mammals"] });
    item("mammals").focus();
    await press("ArrowLeft");
    expect(li("mammals").getAttribute("aria-expanded")).toBe("false");
    expect(() => item("dog")).toThrow();
    expect(focusedValue()).toBe("mammals");
  });

  it("climbs to the parent from a leaf on ArrowLeft", async () => {
    mountTree({ nodes: treeNodes, defaultExpanded: ["animals", "mammals"] });
    item("dog").focus();
    await press("ArrowLeft");
    expect(focusedValue()).toBe("mammals");
  });

  it("enters the first child of an open branch on ArrowRight", async () => {
    mountTree({ nodes: treeNodes, defaultExpanded: ["animals"] });
    item("animals").focus();
    await press("ArrowRight");
    expect(focusedValue()).toBe("birds");
  });
});

describe("TreeView — the typeahead", () => {
  it("matches a prefix after the current row and cycles on the same character", async () => {
    vi.useFakeTimers();
    try {
      mountTree({ nodes: treeNodes, defaultExpanded: ["animals", "mammals", "plants"] });
      item("dog").focus();
      await press("m");
      expect(focusedValue()).toBe("moss");
      await press("m");
      // The repeat cycles back past the walk's start to the earlier match.
      expect(focusedValue()).toBe("mammals");
      vi.advanceTimersByTime(600);
      await press("p");
      // A fresh buffer after the 500 ms window: "p" now means Plants.
      expect(focusedValue()).toBe("plants");
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps a multi-character prefix when the last character repeats, and cycles to the next match", async () => {
    vi.useFakeTimers();
    try {
      mountTree({
        nodes: [
          { value: "cable", label: "Cable" },
          { value: "cabin", label: "Cabin" },
          { value: "cache", label: "Cache" },
        ],
      });
      item("cable").focus();
      await press("c");
      expect(focusedValue()).toBe("cabin");
      await press("a");
      expect(focusedValue()).toBe("cache");
      // The repeated 'a' must not extend the buffer to "caa" — the contract
      // in TreeView.vue's docblock pins it: the same character typed again
      // cycles to that character's next match, wrapping past the walk's start.
      await press("a");
      expect(focusedValue()).toBe("cable");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("TreeView — selection", () => {
  it("chooses the focused row with Enter and Space in single mode", async () => {
    const wrapper = mountTree({
      nodes: treeNodes,
      defaultExpanded: ["animals"],
    });
    item("birds").focus();
    await press("Enter");
    expect(emittedValues(wrapper)).toEqual(["birds"]);
    expect(li("birds").getAttribute("aria-selected")).toBe("true");
    await press(" ");
    expect(wrapper.emitted("update:modelValue")?.length).toBe(2);
    expect(li("plants").getAttribute("aria-selected")).toBe("false");
  });

  it("reflects a controlled modelValue as aria-selected", () => {
    mountTree({
      nodes: treeNodes,
      defaultExpanded: ["animals"],
      modelValue: "birds",
    });
    expect(li("birds").getAttribute("aria-selected")).toBe("true");
    expect(li("animals").getAttribute("aria-selected")).toBe("false");
  });

  it("works uncontrolled, choosing without a modelValue", async () => {
    const wrapper = mountTree({
      nodes: treeNodes,
      defaultExpanded: ["animals"],
    });
    item("birds").focus();
    await press("Enter");
    expect(li("birds").getAttribute("aria-selected")).toBe("true");
    expect(emittedValues(wrapper)).toEqual(["birds"]);
  });

  it("toggles rows and emits the whole list in multiple mode", async () => {
    const wrapper = mountTree({
      nodes: treeNodes,
      defaultExpanded: ["animals", "mammals"],
      selectionMode: "multiple",
    });
    expect(getTree().getAttribute("aria-multiselectable")).toBe("true");
    item("birds").focus();
    await press("Enter");
    await press("ArrowDown"); // mammals
    await press("ArrowDown"); // dog
    await press("Enter");
    expect(emittedValues(wrapper)).toEqual([["birds"], ["birds", "dog"]]);
    await press("Enter");
    expect(wrapper.emitted("update:modelValue")?.at(-1)?.[0]).toEqual(["birds"]);
    expect(li("dog").getAttribute("aria-selected")).toBe("false");
  });

  it("chooses on click, and opens on chevron click without choosing", async () => {
    const wrapper = mountTree({ nodes: treeNodes });
    await click("plants");
    expect(emittedValues(wrapper)).toEqual(["plants"]);
    expect(li("plants").getAttribute("aria-expanded")).toBe("false");
    await clickChevron("plants");
    expect(li("plants").getAttribute("aria-expanded")).toBe("true");
    expect(wrapper.emitted("update:modelValue")?.length).toBe(1);
  });
});

describe("TreeView — disabled", () => {
  it("refuses to choose a disabled row but keeps it reachable", async () => {
    const wrapper = mountTree({ nodes: treeNodes });
    item("minerals").focus();
    await press("Enter");
    await press(" ");
    await click("minerals");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(li("minerals").getAttribute("aria-disabled")).toBe("true");
  });

  it("refuses to open a disabled branch, by key and by chevron", async () => {
    mountTree({ nodes: treeNodes });
    item("rocks").focus();
    await press("ArrowRight");
    expect(li("rocks").getAttribute("aria-expanded")).toBe("false");
    await clickChevron("rocks");
    expect(li("rocks").getAttribute("aria-expanded")).toBe("false");
    expect(() => item("salt")).toThrow();
  });

  it("drops every tab stop and refuses the keyboard when the tree is disabled", async () => {
    const wrapper = mountTree({
      nodes: treeNodes,
      defaultExpanded: ["animals"],
      disabled: true,
    });
    expect(getTree().getAttribute("aria-disabled")).toBe("true");
    expect(tabStops()).toEqual([]);
    item("birds").focus();
    await press("Enter");
    await press("ArrowRight");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    // The branch it was already open stays open; nothing new happens.
    expect(li("animals").getAttribute("aria-expanded")).toBe("true");
  });

  it("reads the same unavailability off an enclosing fieldset", async () => {
    const emitted: unknown[] = [];
    mountHost(() =>
      h("fieldset", { disabled: true }, [
        h(TreeView, {
          nodes: treeNodes,
          defaultExpanded: ["animals"],
          "onUpdate:modelValue": (value: unknown) => emitted.push(value),
        }),
      ]),
    );
    await nextTick();
    expect(getTree().getAttribute("aria-disabled")).toBe("true");
    expect(tabStops()).toEqual([]);
    item("birds").focus();
    await press("Enter");
    expect(emitted).toEqual([]);
  });
});

describe("TreeView — lazy branches", () => {
  const lazyNodes: TreeNode[] = [{ value: "root", label: "Root" }];

  it("announces the fetch, renders the children, and fetches once", async () => {
    let resolveLoad!: (children: TreeNode[]) => void;
    // A deferred rather than an already-resolved promise: the busy state has
    // to survive to a render to be observable, and a resolved promise
    // settles between microtasks — before the next one.
    const loadChildren = vi.fn(
      () =>
        new Promise<TreeNode[]>((resolve) => {
          resolveLoad = resolve;
        }),
    );
    const wrapper = mountTree({ nodes: lazyNodes, loadChildren });
    item("root").focus();
    await press("ArrowRight");
    expect(li("root").getAttribute("aria-busy")).toBe("true");
    expect(rowText("root")).toContain(TREE_VIEW_LABELS.loading);
    resolveLoad([{ value: "child", label: "Child" }]);
    await flushPromises();
    await nextTick();
    expect(li("root").getAttribute("aria-expanded")).toBe("true");
    expect(item("child")).not.toBeNull();
    expect(li("root").hasAttribute("aria-busy")).toBe(false);
    await press("ArrowLeft");
    await press("ArrowRight");
    await flushPromises();
    expect(loadChildren).toHaveBeenCalledTimes(1);
    expect(loadChildren).toHaveBeenCalledWith(lazyNodes[0]);
    expect(item("child")).not.toBeNull();
    // A lazy fetch is expansion, never a choice.
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("turns a branch that resolves empty back into a leaf", async () => {
    mountTree({
      nodes: lazyNodes,
      loadChildren: () => Promise.resolve<TreeNode[]>([]),
    });
    item("root").focus();
    await press("ArrowRight");
    await flushPromises();
    await nextTick();
    expect(li("root").hasAttribute("aria-expanded")).toBe(false);
  });

  it("leaves a failed fetch collapsed and retryable", async () => {
    let shouldFail = true;
    mountTree({
      nodes: lazyNodes,
      loadChildren: () =>
        shouldFail
          ? Promise.reject(new Error("boom"))
          : Promise.resolve<TreeNode[]>([{ value: "child", label: "Child" }]),
    });
    item("root").focus();
    await press("ArrowRight");
    await flushPromises();
    expect(li("root").getAttribute("aria-expanded")).toBe("false");
    expect(li("root").hasAttribute("aria-busy")).toBe(false);
    shouldFail = false;
    await press("ArrowRight");
    await flushPromises();
    expect(item("child")).not.toBeNull();
  });
});

describe("TreeView — labels", () => {
  const lazyNodes: TreeNode[] = [{ value: "root", label: "Root" }];

  it("speaks Loom's English by default", async () => {
    mountTree({ nodes: lazyNodes, loadChildren: () => pendingChildren });
    item("root").focus();
    await press("ArrowRight");
    expect(rowText("root")).toContain(TREE_VIEW_LABELS.loading);
    expect(rowText("root")).toContain("Loading…");
  });

  it("takes a per-call-site override through the labels prop", async () => {
    mountTree({
      nodes: lazyNodes,
      loadChildren: () => pendingChildren,
      labels: { loading: "Fetching…" },
    });
    item("root").focus();
    await press("ArrowRight");
    expect(rowText("root")).toContain("Fetching…");
    expect(rowText("root")).not.toContain("Loading…");
  });

  it("takes a host vocabulary through provideLoomLabels", async () => {
    const Host: Component = defineComponent({
      setup() {
        provideLoomLabels(() => ({ treeView: { loading: "Lädt…" } }));
        return () =>
          h(TreeView, {
            nodes: lazyNodes,
            loadChildren: () => pendingChildren,
          });
      },
    });
    mount(Host, { attachTo: document.body });
    item("root").focus();
    await press("ArrowRight");
    expect(rowText("root")).toContain("Lädt…");
  });
});
