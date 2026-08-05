import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import RadioGroup, { type RadioOption } from "./RadioGroup.vue";

const options: RadioOption[] = [
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro", description: "Unlimited projects" },
  { value: "legacy", label: "Legacy plan", disabled: true },
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

describe("RadioGroup", () => {
  it("emits the clicked option's value", async () => {
    const wrapper = mount(RadioGroup, { props: { modelValue: "free", options } });
    const radios = wrapper.findAll('[role="radio"]');
    await radios[1]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["pro"]]);
  });

  it("renders every option's label and any description text", () => {
    const wrapper = mount(RadioGroup, { props: { modelValue: "free", options } });
    expect(wrapper.text()).toContain("Free");
    expect(wrapper.text()).toContain("Pro");
    expect(wrapper.text()).toContain("Unlimited projects");
    expect(wrapper.text()).toContain("Legacy plan");
  });

  it("a disabled option is inert to clicks and stays out of the selection", async () => {
    const wrapper = mount(RadioGroup, { props: { modelValue: "free", options } });
    const legacyRadio = wrapper.findAll('[role="radio"]')[2]!;
    expect((legacyRadio.element as HTMLButtonElement).disabled).toBe(true);

    await legacyRadio.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("disabling the whole group makes every option inert", () => {
    const wrapper = mount(RadioGroup, { props: { modelValue: "free", options, disabled: true } });
    const radios = wrapper.findAll('[role="radio"]');
    for (const radio of radios) {
      expect((radio.element as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("marks the checked option's role=radio with aria-checked", () => {
    const wrapper = mount(RadioGroup, { props: { modelValue: "pro", options } });
    const radios = wrapper.findAll('[role="radio"]');
    expect(radios[0]!.attributes("aria-checked")).toBe("false");
    expect(radios[1]!.attributes("aria-checked")).toBe("true");
  });

  it("gives only the focused option a tab stop, so the group is one Tab stop rather than one per option", async () => {
    const wrapper = mount(RadioGroup, {
      props: { modelValue: "free", options },
      attachTo: document.body,
    });
    const radios = wrapper.findAll('[role="radio"]');
    (radios[0]!.element as HTMLButtonElement).focus();
    await settle();

    expect(wrapper.findAll('[role="radio"]').map((r) => r.attributes("tabindex"))).toEqual([
      "0",
      "-1",
      "-1",
    ]);
    wrapper.unmount();
  });

  it("moves the roving tab stop and the selection to the next option on ArrowDown, since the group is vertical", async () => {
    const wrapper = mount(RadioGroup, {
      props: { modelValue: "free", options },
      attachTo: document.body,
    });
    const radios = wrapper.findAll('[role="radio"]');
    (radios[0]!.element as HTMLButtonElement).focus();
    await settle();

    radios[0]!.element.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }),
    );
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([["pro"]]);
    expect(wrapper.findAll('[role="radio"]').map((r) => r.attributes("tabindex"))).toEqual([
      "-1",
      "0",
      "-1",
    ]);
    wrapper.unmount();
  });

  it("ignores the horizontal arrows, since a vertical group navigates on the vertical axis only", async () => {
    const wrapper = mount(RadioGroup, {
      props: { modelValue: "free", options },
      attachTo: document.body,
    });
    const radios = wrapper.findAll('[role="radio"]');
    (radios[0]!.element as HTMLButtonElement).focus();
    await settle();

    radios[0]!.element.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
    );
    await settle();

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    wrapper.unmount();
  });
});
