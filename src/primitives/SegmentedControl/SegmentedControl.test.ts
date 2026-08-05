import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import SegmentedControl, { type SegmentedControlOption } from "./SegmentedControl.vue";

// jsdom has no ResizeObserver — the sliding indicator observes the checked
// segment (same jsdom gap the Tabs/Slider tests stub around).
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

const OPTIONS: SegmentedControlOption[] = [
  { value: "compact", label: "Compact" },
  { value: "cozy", label: "Cozy", testId: "density-cozy" },
  { value: "roomy", label: "Roomy", disabled: true },
];

// Reka's roving-focus machinery schedules its own follow-up work (a focus
// listener that arms on the *next* arrow keypress, a click queued a tick
// after focus moves) on real timers, so a keyboard-navigation assertion has
// to let both a microtask flush and a timer tick settle before it reads the
// result — otherwise it reads state mid-flight.
async function settle() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

describe("SegmentedControl", () => {
  it("exposes the options as a single-choice radio group so arrow keys move between them, not Tab", () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "compact" },
      attrs: { "aria-label": "Density" },
    });
    expect(wrapper.get('[role="radiogroup"]').attributes("aria-orientation")).toBe("horizontal");
    expect(wrapper.findAll('[role="radio"]').map((s) => s.text())).toEqual([
      "Compact",
      "Cozy",
      "Roomy",
    ]);
  });

  it("marks exactly the model value as checked, so one option is always the active one", () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "cozy" },
      attrs: { "aria-label": "Density" },
    });
    expect(wrapper.findAll('[role="radio"]').map((s) => s.attributes("aria-checked"))).toEqual([
      "false",
      "true",
      "false",
    ]);
  });

  it("emits the picked value as a string instead of self-updating — the host owns the setting", async () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "compact" },
      attrs: { "aria-label": "Density" },
    });
    await wrapper.findAll('[role="radio"]')[1]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["cozy"]]);
  });

  it("keeps a per-option disabled segment inert while its neighbours stay pickable", async () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "compact" },
      attrs: { "aria-label": "Density" },
    });
    await wrapper.findAll('[role="radio"]')[2]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect((wrapper.findAll('[role="radio"]')[2]!.element as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((wrapper.findAll('[role="radio"]')[1]!.element as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("disables the whole control when the group is disabled, not just its paint", async () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "compact", disabled: true },
      attrs: { "aria-label": "Density" },
    });
    await wrapper.findAll('[role="radio"]')[1]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(
      wrapper.findAll('[role="radio"]').every((s) => (s.element as HTMLButtonElement).disabled),
    ).toBe(true);
  });

  it("compresses padding and type in the sm form for dense chrome, and uses the roomier default otherwise", () => {
    const dense = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "compact", size: "sm" },
      attrs: { "aria-label": "Density" },
    });
    expect(dense.findAll('[role="radio"]')[0]!.classes()).toContain("text-[11px]");

    const roomy = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "compact" },
      attrs: { "aria-label": "Density" },
    });
    expect(roomy.findAll('[role="radio"]')[0]!.classes()).toContain("text-sm");
    expect(roomy.findAll('[role="radio"]')[0]!.classes()).toContain("px-3");
  });

  it("forwards an option's test id to its segment so hosts keep a stable hook onto one choice", () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "compact" },
      attrs: { "aria-label": "Density" },
    });
    expect(wrapper.get('[data-testid="density-cozy"]').text()).toBe("Cozy");
  });

  it("hides the sliding indicator while nothing is checked, instead of parking it over the first segment", async () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS },
      attrs: { "aria-label": "Density" },
      attachTo: document.body,
    });
    await nextTick();
    const indicator = wrapper.get('[aria-hidden="true"]');
    expect(indicator.attributes("style")).toContain("opacity: 0");
    wrapper.unmount();
  });

  it("disconnects its resize observer on unmount so a removed control leaves no live observer behind", () => {
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = disconnect;
      },
    );
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "compact" },
      attrs: { "aria-label": "Density" },
    });
    disconnect.mockClear();
    wrapper.unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("gives only the focused segment a tab stop, so the group is one Tab stop rather than one per segment", async () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "compact" },
      attrs: { "aria-label": "Density" },
      attachTo: document.body,
    });
    const items = wrapper.findAll('[role="radio"]');
    (items[0]!.element as HTMLButtonElement).focus();
    await settle();

    expect(wrapper.findAll('[role="radio"]').map((s) => s.attributes("tabindex"))).toEqual([
      "0",
      "-1",
      "-1",
    ]);
    wrapper.unmount();
  });

  it("moves the roving tab stop and the selection to the next segment on ArrowRight, since the group is horizontal", async () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "compact" },
      attrs: { "aria-label": "Density" },
      attachTo: document.body,
    });
    const items = wrapper.findAll('[role="radio"]');
    (items[0]!.element as HTMLButtonElement).focus();
    await settle();

    items[0]!.element.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
    );
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([["cozy"]]);
    expect(wrapper.findAll('[role="radio"]').map((s) => s.attributes("tabindex"))).toEqual([
      "-1",
      "0",
      "-1",
    ]);
    wrapper.unmount();
  });

  it("ignores the vertical arrows, since a horizontal group navigates on the horizontal axis only", async () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "compact" },
      attrs: { "aria-label": "Density" },
      attachTo: document.body,
    });
    const items = wrapper.findAll('[role="radio"]');
    (items[0]!.element as HTMLButtonElement).focus();
    await settle();

    items[0]!.element.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }),
    );
    await settle();

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    wrapper.unmount();
  });
});
