import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { attachToBody } from "@ecoma-io/loom-core/testing";
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

async function mountMenu(props: Record<string, unknown> = {}, triggerSlot?: string) {
  mounted = mount(ContextMenu, {
    props: { items: ITEMS, ...props },
    slots: { trigger: triggerSlot ?? '<div data-test="trigger">Right-click me</div>' },
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

/**
 * Let Reka's focus and dismissal machinery settle. The macrotask is not
 * padding: FocusScope restores focus from a `setTimeout`, so an assertion made
 * after ticks alone would read the state one turn too early.
 */
async function settle() {
  for (let i = 0; i < 4; i++) await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

afterEach(() => {
  mounted?.unmount();
  mounted = undefined;
  document.body.innerHTML = "";
});

describe("ContextMenu", () => {
  // Direction forwarded onto Reka's portalled content for mirrored menus.
  it("forwards dir=rtl onto the opened content", async () => {
    await mountMenu({ dir: "rtl" });
    await rightClick();
    await settle();
    expect(document.querySelector('[dir="rtl"][role="menu"]')).not.toBeNull();
  });

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

  // The keyboard pins below freeze what Reka's menu machinery (2.10.1) does
  // once a context menu is open — the same MenuContentImpl the dropdown runs,
  // reached here by right-click instead of ArrowDown.
  describe("keyboard contract once open", () => {
    /** The label of whatever menuitem holds focus, read the way a user sees it. */
    const focusedLabel = () =>
      document.activeElement?.closest<HTMLElement>('[role="menuitem"]')?.querySelector("span")
        ?.textContent ?? null;

    function press(key: string) {
      document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    }

    it("walks with ArrowDown past the separator and the disabled row", async () => {
      await mountMenu();
      await rightClick();
      await settle(); // entry focus lands on the menu itself — pointer-opened, so it stays parked there

      press("ArrowDown"); // this first press enters Cut
      await settle();
      expect(focusedLabel()).toBe("Cut");

      press("ArrowDown");
      await settle();
      expect(focusedLabel()).toBe("Copy");

      press("ArrowDown");
      await settle();
      expect(focusedLabel()).toBe("Delete"); // past Paste (disabled) and the separator in one step

      press("ArrowUp");
      await settle();
      expect(focusedLabel()).toBe("Copy"); // and back
    });

    /**
     * A plain `div` trigger cannot hold focus (Reka adds no tabindex), so
     * focus restoration is pinned against a focusable trigger — with the div,
     * "returns focus" would mean returning it to nobody, and the assertion
     * would be unfalsifiable against document.body.
     */
    it("closes on Escape and hands focus back to whatever held it before the menu opened", async () => {
      const wrapper = await mountMenu(
        {},
        '<button type="button" data-test="trigger">Edit target</button>',
      );
      const trigger = wrapper.get("button").element;
      trigger.focus();
      await rightClick();
      await settle();
      expect(menu()).not.toBeNull();

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await settle();
      expect(menu()).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });

    it("closes when the pointer goes down outside the menu", async () => {
      const outside = attachToBody(document.createElement("main"));
      await mountMenu();
      await rightClick();
      await settle();
      expect(menu()).not.toBeNull();

      outside.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
      await settle();
      expect(menu()).toBeNull();
    });
  });
});
