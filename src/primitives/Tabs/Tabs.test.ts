import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Tabs, { type TabItem } from "./Tabs.vue";

// jsdom has no ResizeObserver — TabsIndicator (via vueuse's useResizeObserver)
// degrades gracefully without one, but stub it anyway so a future indicator
// tweak that relies on a real observer doesn't fail silently here.
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

const tabs: TabItem[] = [
  { value: "overview", label: "Overview" },
  { value: "activity", label: "Activity" },
  { value: "settings", label: "Settings", disabled: true },
];

function mountTabs(modelValue: string) {
  return mount(Tabs, {
    props: { modelValue, tabs },
    slots: {
      overview: "Overview panel content",
      activity: "Activity panel content",
      settings: "Settings panel content",
    },
  });
}

describe("Tabs initial selection", () => {
  it("respects the initial modelValue by marking that trigger active and no other", () => {
    const wrapper = mountTabs("activity");
    const triggers = wrapper.findAll('[role="tab"]');
    expect(triggers[0]!.attributes("aria-selected")).toBe("false");
    expect(triggers[1]!.attributes("aria-selected")).toBe("true");
    expect(triggers[2]!.attributes("aria-selected")).toBe("false");
  });

  it("renders only the active panel's slot content, not inactive panels", () => {
    const wrapper = mountTabs("overview");
    expect(wrapper.text()).toContain("Overview panel content");
    expect(wrapper.text()).not.toContain("Activity panel content");
  });
});

describe("Tabs trigger activation", () => {
  it("emits the newly selected tab's value when a trigger is activated", async () => {
    const wrapper = mountTabs("overview");
    const triggers = wrapper.findAll('[role="tab"]');
    await triggers[1]!.trigger("mousedown", { button: 0 });

    expect(wrapper.emitted("update:modelValue")).toEqual([["activity"]]);
  });

  it("switches the rendered panel to match the newly active tab once the host echoes modelValue back", async () => {
    const wrapper = mountTabs("overview");
    await wrapper.setProps({ modelValue: "activity" });
    // Reka's TabsContent gates each panel's mount on an internal Presence
    // state machine (for animation support) that flips one microtask after
    // the `present` prop changes — flushPromises drains that transition.
    await flushPromises();

    expect(wrapper.text()).toContain("Activity panel content");
    expect(wrapper.text()).not.toContain("Overview panel content");
  });

  it("does not activate a disabled tab, so no selection change is emitted", async () => {
    const wrapper = mountTabs("overview");
    const triggers = wrapper.findAll('[role="tab"]');
    await triggers[2]!.trigger("mousedown", { button: 0 });

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  // The defect this pins, and the reason the fix is a fill rather than only the
  // removal of the dim. `disabled:opacity-50` composited the label to 2.05:1;
  // but the label is already `text-muted-foreground` whenever the tab is merely
  // unselected, so dropping the alpha and stopping there would have left an
  // unavailable tab painted exactly like an available one. The plate is what
  // carries the state, and the text is left at the colour it can be read in.
  it("marks a disabled tab with a drained plate rather than fading its label", () => {
    const wrapper = mountTabs("overview");
    const disabled = wrapper.findAll('[role="tab"]')[2]!;

    expect(disabled.attributes("disabled")).toBeDefined();
    expect(disabled.classes().some((c) => c.includes("opacity"))).toBe(false);
    // 4.67:1 — `--color-muted-foreground` over `--color-muted`.
    expect(disabled.classes()).toContain("disabled:bg-muted");
    expect(disabled.classes()).toContain("disabled:text-muted-foreground");
  });
});

describe("Tabs roving tabindex", () => {
  it("keeps the trigger row a single tab stop rather than making every trigger individually tabbable", () => {
    // Before any trigger has ever held focus, Reka's roving-focus group has
    // not chosen a current tab stop yet, so no individual trigger claims the
    // page's tab order — the group's own wrapper is the sole entry point.
    // The defect this guards against: a naive tablist where every trigger
    // carries its own tabindex="0", forcing Tab to walk each one in turn
    // instead of Enter/arrow keys moving the mark within a single stop.
    const wrapper = mountTabs("overview");
    const triggers = wrapper.findAll('[role="tab"]');
    expect(triggers.every((t) => t.attributes("tabindex") === "-1")).toBe(true);
  });

  it("moves the single tab stop to whichever trigger last held focus, and only that one", async () => {
    const wrapper = mountTabs("overview");
    const triggers = wrapper.findAll('[role="tab"]');

    await triggers[1]!.trigger("focus");
    expect(triggers.map((t) => t.attributes("tabindex"))).toEqual(["-1", "0", "-1"]);

    await triggers[0]!.trigger("focus");
    expect(triggers.map((t) => t.attributes("tabindex"))).toEqual(["0", "-1", "-1"]);
  });
});
