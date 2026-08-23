import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { attachToBody } from "@ecoma-io/loom-core/testing";
import DropdownMenu, { type DropdownMenuEntry } from "../src/DropdownMenu.vue";

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

const ITEMS: DropdownMenuEntry[] = [
  { heading: true, label: "File" },
  { label: "Open", value: "open", shortcut: "⌘O" },
  { label: "Save", value: "save", disabled: true },
  { separator: true },
  { label: "Delete", value: "delete", danger: true },
];

let mounted: VueWrapper | undefined;

async function mountMenu(props: Record<string, unknown> = {}) {
  mounted = mount(DropdownMenu, {
    props: { items: ITEMS, open: true, ...props },
    slots: { trigger: '<button type="button">Actions</button>' },
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
 * The label of whatever menuitem holds focus — the roving cursor is read
 * through focus, because that is exactly what a keyboard user can see.
 */
const focusedLabel = () =>
  document.activeElement?.closest<HTMLElement>('[role="menuitem"]')?.querySelector("span")
    ?.textContent ?? null;

function press(key: string) {
  document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

/**
 * Open the menu the way a keyboard user does — ArrowDown at the trigger,
 * which Reka's DropdownMenuTrigger binds to open — and let Reka's entry
 * focus land.
 */
async function openByKeyboard(props: Record<string, unknown> = {}) {
  const wrapper = await mountMenu({ open: undefined, ...props });
  const trigger = wrapper.get("button").element;
  trigger.focus();
  trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  await settle();
  return wrapper;
}

/**
 * Let Reka's focus, scroll-lock and dismiss machinery settle. The macrotask is
 * not padding: the focus scope hands focus back from a `setTimeout`, so an
 * assertion made after ticks alone would read the state one turn too early.
 */
async function settle() {
  for (let i = 0; i < 4; i++) await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

function reset() {
  mounted?.unmount();
  mounted = undefined;
  document.body.innerHTML = "";
}

afterEach(reset);

describe("DropdownMenu", () => {
  it("renders only actionable entries as menu items — a heading and a separator are chrome, not commands", async () => {
    await mountMenu();
    expect(items().map((el) => el.querySelector("span")!.textContent.trim())).toEqual([
      "Open",
      "Save",
      "Delete",
    ]);
    expect(menu()!.textContent).toContain("File"); // the heading still renders, just not as a command
    expect(document.querySelectorAll('[role="separator"]')).toHaveLength(1);
  });

  it("shows an accelerator hint only on the entry that declares one, so the column stays meaningful", async () => {
    await mountMenu();
    expect(items()[0]!.textContent).toContain("⌘O");
    expect(items()[1]!.querySelectorAll("span")).toHaveLength(1); // label only, no empty shortcut slot
  });

  it("emits the selected entry's command id so the host maps it to an action and the primitive stays free of app logic", async () => {
    const wrapper = await mountMenu();
    items()[0]!.click();
    await nextTick();
    expect(wrapper.emitted("select")).toEqual([["open"]]);
  });

  it("selects on Enter as well as on click, because a command list is a keyboard surface first", async () => {
    const wrapper = await mountMenu();
    items()[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await nextTick();
    expect(wrapper.emitted("select")).toEqual([["open"]]);
  });

  it("keeps a disabled entry inert — it is marked disabled for assistive tech and selects nothing", async () => {
    const wrapper = await mountMenu();
    const disabled = items()[1]!;
    expect(disabled.getAttribute("aria-disabled")).toBe("true");
    disabled.click();
    disabled.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await nextTick();
    expect(wrapper.emitted("select")).toBeUndefined();
  });

  // The defect this pins. `data-[disabled]:opacity-40` composited the row's
  // label to 2.40:1 on the popover and its shortcut to 1.79:1 — a row whose
  // only job is to say what is unavailable, in a colour that says nothing. It
  // is the measured muted colour now, 5.76:1, against the 15.46:1 an available
  // row wears.
  it("mutes a disabled entry's label instead of fading it", async () => {
    await mountMenu();
    const disabled = items()[1]!;

    expect(disabled.className).not.toContain("opacity");
    expect(disabled.className).toContain("data-[disabled]:text-muted-foreground");
  });

  it("emits nothing for an entry that declares no command id, so a decorative row cannot fire an action", async () => {
    const wrapper = await mountMenu({ items: [{ label: "No command of its own" }] });
    items()[0]!.click();
    await nextTick();
    expect(wrapper.emitted("select")).toBeUndefined();
  });

  it("paints a danger entry in the destructive token so a destructive command is not one indistinguishable row", async () => {
    await mountMenu();
    expect([...items()[2]!.classList]).toContain("text-destructive-text");
    expect([...items()[0]!.classList]).not.toContain("text-destructive-text");
  });

  it("keeps the menu unmounted while closed, so a command list never sits in the DOM catching clicks", async () => {
    await mountMenu({ open: false });
    expect(menu()).toBeNull();
  });

  it("reports open changes upward instead of closing itself, so the host can drive the menu", async () => {
    const wrapper = await mountMenu({ open: undefined });
    wrapper.get("button").element.click();
    await nextTick();
    expect(wrapper.emitted("update:open")).toEqual([[true]]);
  });

  it("announces the trigger as the control that opens a menu, and tracks its expanded state", async () => {
    const wrapper = await mountMenu({ open: undefined });
    const trigger = wrapper.get("button");
    expect(trigger.attributes("aria-haspopup")).toBe("menu");
    expect(trigger.attributes("aria-expanded")).toBe("false");

    trigger.element.click();
    await settle();
    expect(trigger.attributes("aria-expanded")).toBe("true");
    expect(trigger.attributes("aria-controls")).toBe(menu()!.id);
  });

  it("staggers the rows as the menu opens, capped so a long list does not trail in indefinitely", async () => {
    await mountMenu();
    const delays = items().map((el) => el.style.animationDelay);
    expect(delays[0]!).toBe("24ms"); // index 1 of the entry list — the heading is index 0
    expect(items().every((el) => [...el.classList].includes("animate-fade-rise"))).toBe(true);

    const long = Array.from({ length: 9 }, (_, i) => ({
      label: `#${String(i)}`,
      value: String(i),
    }));
    reset();
    await mountMenu({ items: long });
    expect(items().at(-1)!.style.animationDelay).toBe("120ms"); // capped at index 5
  });

  it("moves focus into the menu on open, so the arrow keys and typeahead have somewhere to act", async () => {
    const wrapper = await mountMenu({ open: undefined });
    wrapper.get("button").element.click();
    await settle();
    expect(menu()!.contains(document.activeElement)).toBe(true);
  });

  it("makes Tab inert while open — a menu is navigated by arrows and typeahead, not by tabbing through its rows", async () => {
    const wrapper = await mountMenu({ open: undefined });
    wrapper.get("button").element.click();
    await settle();

    const tab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    menu()!.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
  });

  it("closes on Escape and hands focus back to the trigger, so the keyboard never ends up nowhere", async () => {
    const wrapper = await mountMenu({ open: undefined });
    const trigger = wrapper.get("button").element;
    // Focused first, because "returns focus" means returns it to whatever held
    // it — jsdom fires no focus of its own on `.click()`, so a test that skipped
    // this would be asserting against `document.body`.
    trigger.focus();
    trigger.click();
    await settle();
    expect(menu()).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle();
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("seals the page behind while open — no scrolling, and the rest hidden from assistive tech — and releases it on close", async () => {
    const sibling = attachToBody(document.createElement("main"));
    const wrapper = await mountMenu({ open: undefined });
    wrapper.get("button").element.click();
    await settle();
    expect(document.body.style.overflow).toBe("hidden");
    expect(sibling.getAttribute("aria-hidden")).toBe("true"); // the rest of the page steps aside for assistive tech too

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  // The pins below freeze Reka's keyboard contract (2.10.1) as this component
  // ships it. Arrow walking is `useArrowNavigation` over
  // `[data-reka-collection-item]:not([data-disabled])` in MenuContentImpl — so
  // separators and headings, which are not collection items, are skipped by
  // construction rather than by anyone's good intentions.
  describe("keyboard contract", () => {
    it("opens on ArrowDown at the trigger and lands focus on the first command", async () => {
      await openByKeyboard();
      expect(focusedLabel()).toBe("Open");
    });

    it("walks with ArrowDown past the disabled entry and the separator, and back with ArrowUp", async () => {
      await openByKeyboard(); // entry focus skips Save (disabled) — it starts on Open

      press("ArrowDown");
      await settle();
      expect(focusedLabel()).toBe("Delete"); // past Save and the separator in one step

      press("ArrowUp");
      await settle();
      expect(focusedLabel()).toBe("Open");
    });

    // Reka wraps only behind its `loop` prop, which defaults false; before the
    // prop was forwarded here a wrap pin could only have been wishful. Stop-at-
    // ends is the default because a cursor that halts says "nothing further".
    it("stops at both ends of the list unless loop is asked for", async () => {
      await openByKeyboard();

      press("ArrowUp");
      await settle();
      expect(focusedLabel()).toBe("Open"); // already first

      press("ArrowDown");
      await settle();
      press("ArrowDown");
      await settle();
      expect(focusedLabel()).toBe("Delete"); // already last

      reset();
      await openByKeyboard({ loop: true });
      press("ArrowUp");
      await settle();
      expect(focusedLabel()).toBe("Delete"); // wrapped backwards past Open

      press("ArrowDown");
      await settle();
      expect(focusedLabel()).toBe("Open"); // and forwards again
    });

    it("jumps to the first and last command with Home and End", async () => {
      await openByKeyboard();

      press("End");
      await settle();
      expect(focusedLabel()).toBe("Delete");

      press("Home");
      await settle();
      expect(focusedLabel()).toBe("Open");
    });

    it("typeahead jumps to the command whose label starts with the typed letter", async () => {
      const wrapper = await mountMenu({ open: undefined });
      wrapper.get("button").element.click();
      await settle();
      expect(focusedLabel()).toBeNull(); // pointer-opened menus park focus on the menu itself

      press("o");
      await settle();
      expect(focusedLabel()).toBe("Open");
    });
  });
});
