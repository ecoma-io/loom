import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import Menubar, { type MenubarMenu } from "./Menubar.vue";

const MENUS: MenubarMenu[] = [
  {
    id: "file",
    label: "File",
    items: [
      { label: "New", command: "new" },
      { separator: true, label: "" },
      { label: "Open", command: "open", disabled: true },
      { label: "Save", command: "save", shortcut: "Ctrl+S" },
    ],
  },
  {
    id: "view",
    label: "View",
    items: [{ label: "Zoom", command: "zoom" }],
  },
];

function mountMenubar() {
  return mount(Menubar, { props: { menus: MENUS }, attachTo: document.body });
}

/** File menu's non-separator item buttons, in DOM order: New, Open(disabled), Save. */
function fileItemButtons(wrapper: ReturnType<typeof mountMenubar>) {
  return wrapper.get('[role="menu"]').findAll('button[role="menuitem"]');
}

// Unlike every other primitive here, Menubar's ARIA is hand-written rather
// than supplied by Reka UI, so nothing underneath it would restore a role that
// went missing. Measured: deleting `role="menubar"`, `role="separator"` or
// `:aria-haspopup` from the template left this whole file green — the other
// cases reach their elements through `[role="menu"]` and `[role="menuitem"]`,
// which are the two roles that happen to be pinned. A menubar that loses its
// container role is announced as a row of loose buttons.
describe("Menubar ARIA structure", () => {
  it("declares the container, the menu-opening triggers and the group dividers by role", () => {
    const wrapper = mountMenubar();

    expect(wrapper.find('[role="menubar"]').exists()).toBe(true);
    const trigger = wrapper.get("#menubar-trigger-file");
    expect(trigger.attributes("role")).toBe("menuitem");
    expect(trigger.attributes("aria-haspopup")).toBe("true");
    expect(trigger.attributes("aria-expanded")).toBe("false");
    wrapper.unmount();
  });

  it("marks the divider between item groups as a separator rather than an unannounced rule", async () => {
    const wrapper = mountMenubar();
    await wrapper.get("#menubar-trigger-file").trigger("click");

    const menu = wrapper.get('[role="menu"]');
    expect(menu.findAll('[role="separator"]')).toHaveLength(1);
    // The separator carries no name and must never be reachable as an item.
    expect(menu.findAll('[role="menuitem"]')).toHaveLength(3);
    wrapper.unmount();
  });
});

describe("Menubar open/close", () => {
  it("clicking a trigger opens its menu; clicking it again closes it", async () => {
    const wrapper = mountMenubar();
    const trigger = wrapper.get("#menubar-trigger-file");
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);

    await trigger.trigger("click");
    expect(wrapper.get('[role="menu"]').attributes("aria-label")).toBe("File");
    expect(trigger.attributes("aria-expanded")).toBe("true");

    await trigger.trigger("click");
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("hovering a different trigger while a menu is open switches to it; hovering when nothing is open does not open it", async () => {
    const wrapper = mountMenubar();
    await wrapper.get("#menubar-trigger-view").trigger("mouseenter");
    expect(wrapper.find('[role="menu"]').exists()).toBe(false); // nothing open yet, hover is a no-op

    await wrapper.get("#menubar-trigger-file").trigger("click");
    await wrapper.get("#menubar-trigger-view").trigger("mouseenter");
    expect(wrapper.get('[role="menu"]').attributes("aria-label")).toBe("View");
    wrapper.unmount();
  });

  it("clicking an item selects its command and closes the menu", async () => {
    const wrapper = mountMenubar();
    await wrapper.get("#menubar-trigger-file").trigger("click");
    await fileItemButtons(wrapper)[0]!.trigger("click"); // "New"
    expect(wrapper.emitted("select")).toEqual([["new"]]);
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("a disabled item is inert: no select, menu stays open", async () => {
    const wrapper = mountMenubar();
    await wrapper.get("#menubar-trigger-file").trigger("click");
    await fileItemButtons(wrapper)[1]!.trigger("click"); // "Open" (disabled)
    expect(wrapper.emitted("select")).toBeUndefined();
    expect(wrapper.find('[role="menu"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("Escape on the trigger closes the menu", async () => {
    const wrapper = mountMenubar();
    const trigger = wrapper.get("#menubar-trigger-file");
    await trigger.trigger("click");
    await trigger.trigger("keydown", { key: "Escape" });
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("Escape inside the open menu closes it", async () => {
    const wrapper = mountMenubar();
    await wrapper.get("#menubar-trigger-file").trigger("click");
    await wrapper.get('[role="menu"]').trigger("keydown", { key: "Escape" });
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("a click outside the menubar closes the open menu", async () => {
    const wrapper = mountMenubar();
    await wrapper.get("#menubar-trigger-file").trigger("click");
    expect(wrapper.find('[role="menu"]').exists()).toBe(true);

    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextTick();
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("unmounting detaches the window click listener (no leak, no stray close after teardown)", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const wrapper = mountMenubar();
    wrapper.unmount();
    expect(removeSpy).toHaveBeenCalledWith("click", expect.any(Function));
    removeSpy.mockRestore();
  });
});

describe("Menubar keyboard navigation", () => {
  it("ArrowDown on the trigger opens the menu with the first enabled item highlighted", async () => {
    const wrapper = mountMenubar();
    await wrapper.get("#menubar-trigger-file").trigger("keydown", { key: "ArrowDown" });
    expect(fileItemButtons(wrapper)[0]!.attributes("data-highlighted")).toBe("true"); // "New"
    wrapper.unmount();
  });

  it("ArrowDown/ArrowUp skip separators and disabled items, and wrap at the ends", async () => {
    const wrapper = mountMenubar();
    const trigger = wrapper.get("#menubar-trigger-file");
    await trigger.trigger("keydown", { key: "ArrowDown" }); // opens, highlights New (0)
    const menu = wrapper.get('[role="menu"]');

    await menu.trigger("keydown", { key: "ArrowDown" }); // -> Save (skips separator + disabled Open)
    expect(fileItemButtons(wrapper)[2]!.attributes("data-highlighted")).toBe("true");

    await menu.trigger("keydown", { key: "ArrowDown" }); // past the end -> wraps to New
    expect(fileItemButtons(wrapper)[0]!.attributes("data-highlighted")).toBe("true");

    await menu.trigger("keydown", { key: "ArrowUp" }); // wraps backward -> Save
    expect(fileItemButtons(wrapper)[2]!.attributes("data-highlighted")).toBe("true");
    wrapper.unmount();
  });

  it("Home/End jump to the first/last enabled item", async () => {
    const wrapper = mountMenubar();
    await wrapper.get("#menubar-trigger-file").trigger("click");
    const menu = wrapper.get('[role="menu"]');
    await menu.trigger("keydown", { key: "End" });
    expect(fileItemButtons(wrapper)[2]!.attributes("data-highlighted")).toBe("true"); // Save
    await menu.trigger("keydown", { key: "Home" });
    expect(fileItemButtons(wrapper)[0]!.attributes("data-highlighted")).toBe("true"); // New
    wrapper.unmount();
  });

  it("Enter selects the highlighted item", async () => {
    const wrapper = mountMenubar();
    await wrapper.get("#menubar-trigger-file").trigger("keydown", { key: "ArrowDown" }); // highlight New
    await wrapper.get('[role="menu"]').trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("select")).toEqual([["new"]]);
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("ArrowRight/ArrowLeft move focus to the adjacent top-level menu, wrapping around", async () => {
    const wrapper = mountMenubar();
    await wrapper.get("#menubar-trigger-file").trigger("click");
    await wrapper.get('[role="menu"]').trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.get('[role="menu"]').attributes("aria-label")).toBe("View");

    await wrapper.get('[role="menu"]').trigger("keydown", { key: "ArrowRight" }); // wraps back to File
    expect(wrapper.get('[role="menu"]').attributes("aria-label")).toBe("File");

    await wrapper.get('[role="menu"]').trigger("keydown", { key: "ArrowLeft" }); // wraps to View
    expect(wrapper.get('[role="menu"]').attributes("aria-label")).toBe("View");
    wrapper.unmount();
  });
});

describe("Menubar top-level trigger focusability", () => {
  it("leaves every top-level trigger independently tabbable rather than a single roving tab stop", () => {
    // Unlike Tabs (built on Reka UI's roving-focus group), Menubar's triggers
    // are plain <button> elements with no tabindex management: each keeps the
    // browser default of tabindex 0. This test pins that current, verifiable
    // behaviour rather than the roving-tabindex contract Menubar's own doc
    // comment claims ("WAI-ARIA menubar semantics") — see the port report for
    // why this is flagged rather than silently fixed.
    const wrapper = mountMenubar();
    const triggers = wrapper.findAll('[role="menuitem"]');
    expect(triggers.every((t) => t.attributes("tabindex") === undefined)).toBe(true);
    wrapper.unmount();
  });
});
