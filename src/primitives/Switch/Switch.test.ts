import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Switch from "./Switch.vue";

describe("Switch", () => {
  it("carries role=switch with aria-checked so assistive tech reads it as a boolean setting, not a plain button", () => {
    const off = mount(Switch, {
      props: { modelValue: false },
      attrs: { "aria-label": "Autosave" },
    });
    expect(off.get('[role="switch"]').attributes("aria-checked")).toBe("false");

    const on = mount(Switch, {
      props: { modelValue: true },
      attrs: { "aria-label": "Autosave" },
    });
    expect(on.get('[role="switch"]').attributes("aria-checked")).toBe("true");
  });

  it("emits the flipped value on click instead of self-updating — the setting takes effect immediately, so the host owns the write", async () => {
    const wrapper = mount(Switch, {
      props: { modelValue: false },
      attrs: { "aria-label": "Autosave" },
    });
    await wrapper.get('[role="switch"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([[true]]);
    expect(wrapper.get('[role="switch"]').attributes("aria-checked")).toBe("false"); // not self-updated
  });

  it("emits false when switching a checked setting off", async () => {
    const wrapper = mount(Switch, {
      props: { modelValue: true },
      attrs: { "aria-label": "Autosave" },
    });
    await wrapper.get('[role="switch"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([[false]]);
  });

  it("defaults to off, so a setting never renders as enabled before the host supplies its value", () => {
    const wrapper = mount(Switch, { attrs: { "aria-label": "Autosave" } });
    expect(wrapper.get('[role="switch"]').attributes("aria-checked")).toBe("false");
  });

  it("disabled makes the control inert to click and to keyboard, not merely dimmed", async () => {
    const wrapper = mount(Switch, {
      props: { modelValue: false, disabled: true },
      attrs: { "aria-label": "Autosave" },
    });
    expect((wrapper.get('[role="switch"]').element as HTMLButtonElement).disabled).toBe(true);
    await wrapper.get('[role="switch"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("mirrors the model value into data-state, the hook the checked warp fill and the unchecked muted track both key on", async () => {
    const wrapper = mount(Switch, { props: { modelValue: false }, attrs: { "aria-label": "X" } });
    expect(wrapper.get('[role="switch"]').attributes("data-state")).toBe("unchecked");
    await wrapper.setProps({ modelValue: true });
    expect(wrapper.get('[role="switch"]').attributes("data-state")).toBe("checked");

    const classes = wrapper.get('[role="switch"]').classes();
    expect(classes).toContain("data-[state=checked]:bg-primary");
    expect(classes).toContain("data-[state=unchecked]:bg-muted-foreground/30");
  });

  it("renders on a native button with nothing here blocking Space, so the platform's own keyboard handling toggles it", () => {
    const wrapper = mount(Switch, {
      props: { modelValue: false },
      attrs: { "aria-label": "Autosave" },
    });
    const el = wrapper.get('[role="switch"]').element as HTMLButtonElement;
    expect(el.tagName).toBe("BUTTON");

    const spaceKeydown = new KeyboardEvent("keydown", {
      key: " ",
      code: "Space",
      cancelable: true,
    });
    el.dispatchEvent(spaceKeydown);
    expect(spaceKeydown.defaultPrevented).toBe(false);
  });

  it("also flips on Enter, which Reka intercepts explicitly rather than leaving to native button activation", async () => {
    const wrapper = mount(Switch, {
      props: { modelValue: false },
      attrs: { "aria-label": "Autosave" },
    });
    await wrapper.get('[role="switch"]').trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("update:modelValue")).toEqual([[true]]);
  });

  // The cases above all pass `modelValue`, which is why none of them caught
  // the switch being dead without it: a default of `false` reads as "the host
  // says off" and pins the track there forever, while the update event still
  // fires. A test that only listens for the emit sees a working component; a
  // user sees a switch that ignores clicks.
  it("toggles itself when no modelValue is supplied, rather than emitting into a track that never moves", async () => {
    const wrapper = mount(Switch, { attrs: { "aria-label": "Autosave" } });
    expect(wrapper.get('[role="switch"]').attributes("aria-checked")).toBe("false");

    await wrapper.get('[role="switch"]').trigger("click");
    expect(wrapper.get('[role="switch"]').attributes("aria-checked")).toBe("true");
  });
});
