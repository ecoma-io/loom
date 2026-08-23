import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import Menubar, { type MenubarMenu } from "../src/Menubar.vue";

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
    expect(trigger.attributes("aria-haspopup")).toBe("menu");
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

  // The defect this pins. `disabled:opacity-40` composited the row's label to
  // 2.40:1 on the popover and its shortcut to 1.79:1 — a row that says what is
  // unavailable, in a colour that says nothing. It is the measured muted colour
  // now, 5.76:1, and the row still reads as unavailable because an available
  // one sits at 15.46:1.
  it("mutes a disabled row's label instead of fading it", async () => {
    const wrapper = mountMenubar();
    await wrapper.get("#menubar-trigger-file").trigger("click");
    const open = fileItemButtons(wrapper)[1]!;

    expect(open.classes().some((c) => c.includes("opacity"))).toBe(false);
    expect(open.classes()).toContain("disabled:text-muted-foreground");
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

  it("ArrowRight/ArrowLeft on a trigger with nothing open move between triggers without opening one", async () => {
    const wrapper = mountMenubar();

    await wrapper.get("#menubar-trigger-file").trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement).toBe(wrapper.get("#menubar-trigger-view").element);
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);

    await wrapper.get("#menubar-trigger-view").trigger("keydown", { key: "ArrowLeft" });
    expect(document.activeElement).toBe(wrapper.get("#menubar-trigger-file").element);
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("opening from the trigger by keyboard lands DOM focus on the first enabled item", async () => {
    const wrapper = mountMenubar();

    await wrapper.get("#menubar-trigger-file").trigger("keydown", { key: "ArrowDown" });
    expect(document.activeElement).toBe(fileItemButtons(wrapper)[0]!.element); // "New"

    // Same landing for the other opening keys — Enter and Space are triggers too.
    await wrapper.get('[role="menu"]').trigger("keydown", { key: "Escape" });
    await wrapper.get("#menubar-trigger-file").trigger("keydown", { key: "Enter" });
    expect(document.activeElement).toBe(fileItemButtons(wrapper)[0]!.element);
    wrapper.unmount();
  });

  it("ArrowDown/ArrowUp walk DOM focus skipping separators and disabled rows, wrapping at both ends", async () => {
    const wrapper = mountMenubar();
    await wrapper.get("#menubar-trigger-file").trigger("keydown", { key: "ArrowDown" }); // focus New (0)
    const buttons = fileItemButtons(wrapper);

    await wrapper.get('[role="menu"]').trigger("keydown", { key: "ArrowDown" }); // -> Save (skips separator + disabled Open)
    expect(document.activeElement).toBe(buttons[2]!.element);

    await wrapper.get('[role="menu"]').trigger("keydown", { key: "ArrowDown" }); // past the end -> wraps to New
    expect(document.activeElement).toBe(buttons[0]!.element);

    await wrapper.get('[role="menu"]').trigger("keydown", { key: "ArrowUp" }); // wraps backward -> Save
    expect(document.activeElement).toBe(buttons[2]!.element);
    wrapper.unmount();
  });

  it("Home/End move focus to the first/last enabled item", async () => {
    const wrapper = mountMenubar();
    await wrapper.get("#menubar-trigger-file").trigger("click");
    const buttons = fileItemButtons(wrapper);

    await wrapper.get('[role="menu"]').trigger("keydown", { key: "End" });
    expect(document.activeElement).toBe(buttons[2]!.element); // Save
    await wrapper.get('[role="menu"]').trigger("keydown", { key: "Home" });
    expect(document.activeElement).toBe(buttons[0]!.element); // New
    wrapper.unmount();
  });

  it("Enter activates the focused row: emits its command and closes the menu", async () => {
    const wrapper = mountMenubar();
    await wrapper.get("#menubar-trigger-file").trigger("keydown", { key: "ArrowDown" }); // focus New
    await wrapper.get('[role="menu"]').trigger("keydown", { key: "ArrowDown" }); // focus Save

    await wrapper.get('[role="menu"]').trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("select")).toEqual([["save"]]);
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("Space activates the focused row just like Enter", async () => {
    const wrapper = mountMenubar();
    await wrapper.get("#menubar-trigger-file").trigger("keydown", { key: "ArrowDown" }); // focus New
    await wrapper.get('[role="menu"]').trigger("keydown", { key: " " });

    expect(wrapper.emitted("select")).toEqual([["new"]]);
    wrapper.unmount();
  });

  it("ArrowRight inside an open menu opens the next menu and focuses its first enabled item", async () => {
    const wrapper = mountMenubar();
    await wrapper.get("#menubar-trigger-file").trigger("keydown", { key: "ArrowDown" });

    await wrapper.get('[role="menu"]').trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.get('[role="menu"]').attributes("aria-label")).toBe("View");
    // View's only item, "Zoom", owns focus — the walk continues from there.
    expect(document.activeElement).toBe(
      wrapper.get('[role="menu"]').findAll('button[role="menuitem"]')[0]!.element,
    );

    await wrapper.get('[role="menu"]').trigger("keydown", { key: "ArrowLeft" }); // wraps back to File
    expect(wrapper.get('[role="menu"]').attributes("aria-label")).toBe("File");
    expect(document.activeElement).toBe(fileItemButtons(wrapper)[0]!.element);
    wrapper.unmount();
  });

  it("Escape closes the open menu and restores focus to the owning trigger", async () => {
    const wrapper = mountMenubar();
    await wrapper.get("#menubar-trigger-file").trigger("keydown", { key: "ArrowDown" });
    expect(document.activeElement).toBe(fileItemButtons(wrapper)[0]!.element);

    await wrapper.get('[role="menu"]').trigger("keydown", { key: "Escape" });
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    expect(document.activeElement).toBe(wrapper.get("#menubar-trigger-file").element);
    wrapper.unmount();
  });

  it("focus leaving the menubar closes the open menu without stealing focus back", async () => {
    const wrapper = mountMenubar();
    await wrapper.get("#menubar-trigger-file").trigger("keydown", { key: "ArrowDown" });
    expect(document.activeElement).toBe(fileItemButtons(wrapper)[0]!.element);

    // Tab out: the browser moves focus past the strip, which surfaces here as
    // a focusout whose relatedTarget sits outside the menubar root.
    fileItemButtons(wrapper)[0]!.element.dispatchEvent(
      new FocusEvent("focusout", { relatedTarget: document.body, bubbles: true }),
    );
    await nextTick();
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("focus moving between parts of the menubar keeps the menu open", async () => {
    const wrapper = mountMenubar();
    await wrapper.get("#menubar-trigger-file").trigger("keydown", { key: "ArrowDown" });
    expect(wrapper.find('[role="menu"]').exists()).toBe(true);

    // The open hands focus to the first row; that move is internal to the
    // menubar and must not read as Tab-out.
    await nextTick();
    expect(wrapper.find('[role="menu"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("a disabled row is neither highlighted by hover nor activated by Enter", async () => {
    const wrapper = mountMenubar();
    await wrapper.get("#menubar-trigger-file").trigger("keydown", { key: "ArrowDown" }); // focus New
    const buttons = fileItemButtons(wrapper);

    await buttons[1]!.trigger("mouseenter"); // "Open" (disabled)
    expect(buttons[1]!.attributes("data-highlighted")).toBeUndefined();
    expect(document.activeElement).toBe(buttons[0]!.element); // highlight never left New

    await wrapper.get('[role="menu"]').trigger("keydown", { key: "Enter" }); // activates what IS focused
    expect(wrapper.emitted("select")).toEqual([["new"]]);
    wrapper.unmount();
  });

  it("pointer-hover switching between open menus moves focus into the new menu's first item", async () => {
    const wrapper = mountMenubar();
    await wrapper.get("#menubar-trigger-file").trigger("keydown", { key: "ArrowDown" });

    await wrapper.get("#menubar-trigger-view").trigger("mouseenter");
    expect(wrapper.get('[role="menu"]').attributes("aria-label")).toBe("View");
    expect(document.activeElement).toBe(
      wrapper.get('[role="menu"]').findAll('button[role="menuitem"]')[0]!.element,
    ); // Zoom
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
