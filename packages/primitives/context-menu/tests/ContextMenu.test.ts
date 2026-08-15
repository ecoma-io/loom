import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import ContextMenu, { type ContextMenuEntry } from "../src/ContextMenu.vue";

// jsdom ships no ResizeObserver, and Reka's popper measures with one. Stubbing
// the browser API is the honest fix: mocking Reka would leave these tests
// asserting on nothing but this component's own template.
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

const ITEMS: ContextMenuEntry[] = [
  { heading: true, label: "Edit" },
  { label: "Cut", value: "cut", shortcut: "⌘X" },
  { label: "Copy", value: "copy" },
  { separator: true },
  { label: "Paste", value: "paste", disabled: true },
  { label: "Delete", value: "delete", danger: true },
];

let mounted: VueWrapper | undefined;

async function mountMenu(props: Record<string, unknown> = {}) {
  mounted = mount(ContextMenu, {
    props: { items: ITEMS, ...props },
    slots: { trigger: '<div data-test="trigger">Right-click me</div>' },
    attachTo: document.body,
  });
  await nextTick();
  await nextTick();
  return mounted;
}

/** The menu is portalled out of the wrapper — query the document, never the wrapper. */
const menu = () => document.querySelector<HTMLElement>('[role="menu"]');
const items = () => [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];

/**
 * Dispatch a contextmenu event on the trigger to open the menu — this is how a
 * real user opens it, and Reka's ContextMenuRoot does not accept an `open` prop
 * the way DropdownMenuRoot does.
 */
async function rightClick() {
  const trigger = document.querySelector<HTMLElement>('[data-test="trigger"]');
  trigger!.dispatchEvent(
    new MouseEvent("contextmenu", { clientX: 0, clientY: 0, bubbles: true, cancelable: true }),
  );
  await nextTick();
  await nextTick();
}

afterEach(() => {
  mounted?.unmount();
  mounted = undefined;
  document.body.innerHTML = "";
});

describe("ContextMenu", () => {
  it("renders the trigger slot element", async () => {
    await mountMenu();
    expect(document.querySelector('[data-test="trigger"]')!.textContent).toBe("Right-click me");
  });

  it("renders menu content when opened by right-click", async () => {
    await mountMenu();
    await rightClick();
    expect(menu()).not.toBeNull();
  });

  it("renders each item with its label text", async () => {
    await mountMenu();
    await rightClick();
    expect(items().map((el) => el.querySelector("span")!.textContent.trim())).toEqual([
      "Cut",
      "Copy",
      "Paste",
      "Delete",
    ]);
  });

  it("renders separators for separator entries", async () => {
    await mountMenu();
    await rightClick();
    expect(document.querySelectorAll('[role="separator"]')).toHaveLength(1);
  });

  it("renders headings for heading entries", async () => {
    await mountMenu();
    await rightClick();
    expect(menu()!.textContent).toContain("Edit");
    // A heading is not a menuitem
    expect(items()).toHaveLength(4);
  });

  it("shows shortcut text for items with shortcuts", async () => {
    await mountMenu();
    await rightClick();
    expect(items()[0]!.textContent).toContain("⌘X");
    expect(items()[1]!.querySelectorAll("span")).toHaveLength(1); // label only, no empty shortcut slot
  });

  it("applies destructive styling for danger items", async () => {
    await mountMenu();
    await rightClick();
    expect([...items()[3]!.classList]).toContain("text-destructive-text");
    expect([...items()[0]!.classList]).not.toContain("text-destructive-text");
  });

  it("applies disabled styling for disabled items", async () => {
    await mountMenu();
    await rightClick();
    const disabled = items()[2]!;
    expect(disabled.getAttribute("aria-disabled")).toBe("true");
    expect(disabled.className).toContain("data-[disabled]:text-muted-foreground");
  });

  it("emits select with the item value when a non-disabled item is selected", async () => {
    const wrapper = await mountMenu();
    await rightClick();
    items()[0]!.click();
    await nextTick();
    expect(wrapper.emitted("select")).toEqual([["cut"]]);
  });

  it("does not emit select for disabled items or items without value", async () => {
    const wrapper = await mountMenu({
      items: [{ label: "No command", disabled: true }, { label: "No value" }],
    });
    await rightClick();
    const menuItems = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    menuItems[0]!.click();
    menuItems[1]!.click();
    await nextTick();
    expect(wrapper.emitted("select")).toBeUndefined();
  });

  it("emits update:open when menu state changes", async () => {
    const wrapper = await mountMenu();
    await rightClick();
    expect(wrapper.emitted("update:open")).toEqual([[true]]);
  });
});
