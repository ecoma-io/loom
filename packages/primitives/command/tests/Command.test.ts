import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import Command, { type CommandItem, type CommandGroup } from "../src/Command.vue";

const items: CommandItem[] = [
  { value: "settings", label: "Open settings", group: "Navigation" },
  { value: "docs", label: "Go to docs", group: "Navigation" },
  { value: "profile", label: "Edit profile", group: "Actions" },
  { value: "project", label: "Create project", group: "Actions" },
  { value: "dark", label: "Toggle dark mode", group: "Preferences" },
  { value: "lang", label: "Change language", group: "Preferences" },
  { value: "logout", label: "Log out" },
  { value: "help", label: "Help" },
];

const groups: CommandGroup[] = [
  { heading: "Navigation" },
  { heading: "Actions" },
  { heading: "Preferences" },
];

enableAutoUnmount(afterEach);

function mountCommand(props: Partial<InstanceType<typeof Command>["$props"]> = {}, attrs = {}) {
  return mount(Command, {
    props: { items, ...props },
    attrs,
    attachTo: document.body,
  });
}

async function settle() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 2));
  await nextTick();
}

function getInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>('input[role="searchbox"]');
  if (!input) throw new Error("no search input rendered");
  return input;
}

function getListbox(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="listbox"]');
}

function getRows(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[role="option"]')];
}

function getHeadings(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[role="presentation"]')];
}

function labels(): string[] {
  return getRows()
    .filter((row) => row.getAttribute("aria-disabled") !== "true")
    .map((row) => {
      const first = row.firstElementChild;
      return first ? first.textContent.trim() : row.textContent.trim();
    });
}

async function type(text: string) {
  const input = getInput();
  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
}

function pressKey(key: string) {
  getInput().dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key }));
}

describe("Command ARIA contract", () => {
  it("renders the search input with role searchbox and aria-autocomplete list", () => {
    mountCommand();
    const input = getInput();
    expect(input.getAttribute("role")).toBe("searchbox");
    expect(input.getAttribute("aria-autocomplete")).toBe("list");
  });

  it("wires aria-controls to the listbox id", () => {
    mountCommand();
    const input = getInput();
    const listbox = getListbox();
    expect(listbox).not.toBeNull();
    expect(input.getAttribute("aria-controls")).toBe(listbox?.id);
  });

  it("sets aria-activedescendant on the highlighted item", async () => {
    mountCommand();
    await settle();
    const input = getInput();
    const firstOption = getRows()[0];
    expect(input.getAttribute("aria-activedescendant")).toBe(firstOption?.id);
  });

  it("renders the listbox with role listbox", () => {
    mountCommand();
    expect(getListbox()).not.toBeNull();
    expect(getListbox()?.getAttribute("role")).toBe("listbox");
  });

  it("renders items with role option", () => {
    mountCommand();
    const rows = getRows();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.getAttribute("role")).toBe("option");
    }
  });

  it("marks the first item as aria-selected by default", () => {
    mountCommand();
    const first = getRows()[0];
    expect(first?.getAttribute("aria-selected")).toBe("true");
  });

  it("applies the search label from the labels prop", () => {
    mountCommand({ labels: { searchLabel: "Search commands" } });
    expect(getInput().getAttribute("aria-label")).toBe("Search commands");
  });

  it("uses the default search label when none is provided", () => {
    mountCommand();
    expect(getInput().getAttribute("aria-label")).toBe("Search");
  });

  it("omits aria-label when aria-labelledby is provided", () => {
    mountCommand({ ariaLabelledby: "my-label" });
    expect(getInput().getAttribute("aria-labelledby")).toBe("my-label");
    expect(getInput().getAttribute("aria-label")).toBeNull();
  });
});

describe("Command filtering", () => {
  it("narrows the list to items matching the typed query", async () => {
    mountCommand();
    await type("settings");
    expect(labels()).toEqual(["Open settings"]);
  });

  it("matches case-insensitively", async () => {
    mountCommand();
    await type("SETTINGS");
    expect(labels()).toEqual(["Open settings"]);
  });

  it("matches against the label", async () => {
    mountCommand();
    await type("dark");
    expect(labels()).toEqual(["Toggle dark mode"]);
  });

  it("matches against the value", async () => {
    mountCommand();
    await type("logout");
    expect(labels()).toEqual(["Log out"]);
  });

  it("matches against the description", async () => {
    mountCommand({
      items: [
        { value: "a", label: "Alpha", description: "The first letter" },
        { value: "b", label: "Beta", description: "The second letter" },
      ],
    });
    await type("first");
    expect(labels()).toEqual(["Alpha"]);
  });

  it("reports the typed text through update:query", async () => {
    const wrapper = mountCommand();
    await type("dark");
    expect(wrapper.emitted("update:query")).toEqual([["dark"]]);
  });

  it("resets the highlight to the first item on each keystroke", async () => {
    mountCommand();
    pressKey("ArrowDown");
    pressKey("ArrowDown");
    await settle();
    await type("dark");
    expect(getInput().getAttribute("aria-activedescendant")).toBe(getRows()[0]?.id);
  });
});

describe("Command empty state", () => {
  it("shows the empty message when no items match", async () => {
    mountCommand();
    await type("zzz");
    const rows = getRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.textContent.trim()).toBe("No results found.");
    expect(rows[0]!.getAttribute("aria-disabled")).toBe("true");
  });

  it("uses the caller's empty message via labels prop", async () => {
    mountCommand({ labels: { emptyMessage: "Nothing here" } });
    await type("zzz");
    expect(getRows()[0]!.textContent.trim()).toBe("Nothing here");
  });

  it("keeps quiet while items match", async () => {
    mountCommand();
    await type("settings");
    expect(labels()).toEqual(["Open settings"]);
  });
});

describe("Command keyboard navigation", () => {
  it("moves the highlight down on ArrowDown", async () => {
    mountCommand();
    await settle();
    pressKey("ArrowDown");
    await settle();
    expect(getInput().getAttribute("aria-activedescendant")).toBe(getRows()[1]?.id);
  });

  it("moves the highlight up on ArrowUp", async () => {
    mountCommand();
    await settle();
    pressKey("ArrowDown");
    pressKey("ArrowDown");
    await settle();
    pressKey("ArrowUp");
    await settle();
    expect(getInput().getAttribute("aria-activedescendant")).toBe(getRows()[1]?.id);
  });

  it("wraps to the first item when ArrowDown passes the last", async () => {
    mountCommand();
    await settle();
    const count = getRows().length;
    for (let i = 0; i < count; i++) pressKey("ArrowDown");
    await settle();
    expect(getInput().getAttribute("aria-activedescendant")).toBe(getRows()[0]?.id);
  });

  it("wraps to the last item when ArrowUp passes the first", async () => {
    mountCommand();
    await settle();
    pressKey("ArrowUp");
    await settle();
    const rows = getRows();
    expect(getInput().getAttribute("aria-activedescendant")).toBe(rows[rows.length - 1]?.id);
  });

  it("selects the highlighted item on Enter and emits select", async () => {
    const wrapper = mountCommand();
    await settle();
    pressKey("ArrowDown");
    pressKey("ArrowDown");
    await settle();
    pressKey("Enter");
    await settle();
    expect(wrapper.emitted("select")).toEqual([["profile"]]);
  });

  it("clears the query on Escape when the query is non-empty", async () => {
    mountCommand();
    await type("settings");
    expect(getInput().value).toBe("settings");
    pressKey("Escape");
    await settle();
    expect(getInput().value).toBe("");
    expect(getRows().length).toBeGreaterThan(1);
  });

  it("closes the menu on Escape when the query is empty", async () => {
    mountCommand();
    await settle();
    expect(getListbox()).not.toBeNull();
    pressKey("Escape");
    await settle();
    expect(getListbox()).toBeNull();
  });

  it("moves to the first item on Home", async () => {
    mountCommand();
    await settle();
    pressKey("ArrowDown");
    pressKey("ArrowDown");
    await settle();
    pressKey("Home");
    await settle();
    expect(getInput().getAttribute("aria-activedescendant")).toBe(getRows()[0]?.id);
  });

  it("moves to the last item on End", async () => {
    mountCommand();
    await settle();
    pressKey("End");
    await settle();
    const rows = getRows();
    expect(getInput().getAttribute("aria-activedescendant")).toBe(rows[rows.length - 1]?.id);
  });
});

describe("Command groups", () => {
  it("renders group headings when groups prop is provided", () => {
    mountCommand({ groups });
    const headings = getHeadings();
    expect(headings.length).toBe(3);
    expect(headings.map((h) => h.textContent.trim())).toEqual([
      "Navigation",
      "Actions",
      "Preferences",
    ]);
  });

  it("hides groups whose items are all filtered out", async () => {
    mountCommand({ groups });
    await type("settings");
    const headings = getHeadings();
    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent.trim()).toBe("Navigation");
  });

  it("does not render headings when groups prop is omitted", () => {
    mountCommand();
    expect(getHeadings()).toHaveLength(0);
  });

  it("renders ungrouped items after all grouped items", () => {
    mountCommand({ groups });
    const allRows = getRows();
    const rowLabels = allRows.map((r) => r.textContent.trim());
    expect(rowLabels).toContain("Log out");
    expect(rowLabels).toContain("Help");
  });
});

describe("Command disabled items", () => {
  it("sets aria-disabled on disabled items", () => {
    mountCommand({
      items: [
        { value: "a", label: "Alpha" },
        { value: "b", label: "Beta", disabled: true },
      ],
    });
    const rows = getRows();
    expect(rows[0]?.getAttribute("aria-disabled")).toBeNull();
    expect(rows[1]?.getAttribute("aria-disabled")).toBe("true");
  });

  it("does not select a disabled item on Enter", async () => {
    const wrapper = mountCommand({
      items: [
        { value: "a", label: "Alpha" },
        { value: "b", label: "Beta", disabled: true },
      ],
    });
    await settle();
    pressKey("ArrowDown");
    await settle();
    pressKey("Enter");
    await settle();
    expect(wrapper.emitted("select")).toBeUndefined();
  });

  it("does not select a disabled item on click", async () => {
    const wrapper = mountCommand({
      items: [
        { value: "a", label: "Alpha" },
        { value: "b", label: "Beta", disabled: true },
      ],
    });
    await settle();
    const disabledRow = getRows()[1];
    disabledRow?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();
    expect(wrapper.emitted("select")).toBeUndefined();
  });
});

describe("Command highlighted state", () => {
  it("updates aria-activedescendant when highlight changes", async () => {
    mountCommand();
    await settle();
    pressKey("ArrowDown");
    await settle();
    const activeDescendant = getInput().getAttribute("aria-activedescendant");
    expect(activeDescendant).toBe(getRows()[1]?.id);
  });

  it("adds data-active to the currently highlighted item", async () => {
    mountCommand();
    await settle();
    const first = getRows()[0];
    expect(first?.hasAttribute("data-active")).toBe(true);
  });

  it("moves data-active to the next item on ArrowDown", async () => {
    mountCommand();
    await settle();
    pressKey("ArrowDown");
    await settle();
    expect(getRows()[0]?.hasAttribute("data-active")).toBe(false);
    expect(getRows()[1]?.hasAttribute("data-active")).toBe(true);
  });
});

describe("Command controlled query", () => {
  it("respects the controlled query prop", async () => {
    const wrapper = mountCommand({ query: "settings" });
    await settle();
    expect(getInput().value).toBe("settings");
    expect(labels()).toEqual(["Open settings"]);
    wrapper.unmount();
  });

  it("emits update:query on keystroke when controlled", async () => {
    const wrapper = mountCommand({ query: "" });
    await type("dark");
    expect(wrapper.emitted("update:query")).toEqual([["dark"]]);
  });

  it("resets the highlight to the first match when the controlled query changes", async () => {
    const wrapper = mountCommand({ query: "" });
    await settle();
    pressKey("ArrowDown");
    pressKey("ArrowDown");
    await settle();
    expect(labels()[2]).toBe("Edit profile");
    // Without a reset, the highlight would stay on the third row of the
    // narrowed list ("Create project") — stale after the parent changed query.
    await wrapper.setProps({ query: "e" });
    await settle();
    const rows = getRows();
    expect(labels()[0]).toBe("Open settings");
    expect(getInput().getAttribute("aria-activedescendant")).toBe(rows[0]?.id);
    expect(rows[0]?.hasAttribute("data-active")).toBe(true);
    wrapper.unmount();
  });
});

describe("Command controlled open", () => {
  it("hides the listbox when open is false", () => {
    mountCommand({ open: false });
    expect(getListbox()).toBeNull();
  });

  it("shows the listbox when open is true", () => {
    mountCommand({ open: true });
    expect(getListbox()).not.toBeNull();
  });

  it("emits update:open on Escape when query is empty", async () => {
    const wrapper = mountCommand({ open: true });
    await settle();
    pressKey("Escape");
    await settle();
    expect(wrapper.emitted("update:open")).toEqual([[false]]);
  });
});

describe("Command live region", () => {
  it("announces the result count through a live region", async () => {
    mountCommand();
    await type("settings");
    const liveRegion = document.querySelector<HTMLElement>('[role="status"]');
    expect(liveRegion?.textContent.trim()).toBe("1 result available");
  });

  it("announces plural results", async () => {
    mountCommand();
    await type("ro");
    const liveRegion = document.querySelector<HTMLElement>('[role="status"]');
    expect(liveRegion?.textContent.trim()).toBe("2 results available");
  });

  it("uses custom singular result text from labels", async () => {
    mountCommand({ labels: { resultSingular: "{count} match found" } });
    await type("settings");
    const liveRegion = document.querySelector<HTMLElement>('[role="status"]');
    expect(liveRegion?.textContent.trim()).toBe("1 match found");
  });

  it("uses custom plural result text from labels", async () => {
    mountCommand({ labels: { resultPlural: "{count} matches found" } });
    await type("ro");
    const liveRegion = document.querySelector<HTMLElement>('[role="status"]');
    expect(liveRegion?.textContent.trim()).toBe("2 matches found");
  });
});

describe("Command mouse interaction", () => {
  it("selects an item on click", async () => {
    const wrapper = mountCommand();
    await settle();
    const row = getRows()[2];
    row?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await settle();
    expect(wrapper.emitted("select")).toEqual([["profile"]]);
  });

  it("highlights an item on mouseenter", async () => {
    mountCommand();
    await settle();
    const row = getRows()[2];
    row?.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true, cancelable: true }));
    await settle();
    expect(getInput().getAttribute("aria-activedescendant")).toBe(row?.id);
  });
});

describe("Command labels prop", () => {
  it("uses the default placeholder when no labels prop is provided", () => {
    mountCommand();
    expect(getInput().getAttribute("placeholder")).toBe("Type to search…");
  });

  it("uses a custom placeholder from the labels prop", () => {
    mountCommand({ labels: { placeholder: "Search actions…" } });
    expect(getInput().getAttribute("placeholder")).toBe("Search actions…");
  });

  it("overrides only the keys provided in the labels prop", () => {
    mountCommand({ labels: { placeholder: "Custom placeholder" } });
    expect(getInput().getAttribute("placeholder")).toBe("Custom placeholder");
    expect(getInput().getAttribute("aria-label")).toBe("Search");
  });
});
