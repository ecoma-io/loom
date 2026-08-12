import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import RadioGroup, { type RadioOption } from "./RadioGroup.vue";
import { provideFieldContext } from "../../lib/field-context";

// A stand-in for the Field wrapping this control. Field's own behaviour is
// pinned in `Field.test.ts`; what matters here is that the group reads a row it
// is inside at all.
//
// It renders a real `<form>` because that is the only place Reka mints the
// hidden input carrying `name`: outside one, a resolved name has nowhere
// observable to land, and a test that could not see it would pass with the key
// dropped.
const ProbeRow = defineComponent({
  props: {
    controlId: { type: String, default: undefined },
    describedBy: { type: String, default: undefined },
    name: { type: String, default: undefined },
    required: { type: Boolean, default: undefined },
    invalid: { type: Boolean, default: undefined },
    disabled: { type: Boolean, default: undefined },
    readonly: { type: Boolean, default: undefined },
  },
  setup(props, { slots }) {
    provideFieldContext({
      controlId: () => props.controlId,
      describedBy: () => props.describedBy,
      name: () => props.name,
      required: () => props.required,
      invalid: () => props.invalid,
      disabled: () => props.disabled,
      readonly: () => props.readonly,
    });
    return () => h("form", slots.default?.());
  },
});

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

  it("keeps the dim on the radio circle and mutes the label in a measured colour instead", () => {
    // The library-wide rule is that an `opacity` may drain a border, a fill or
    // a glyph and may never drain text, because compositing at 50% more than
    // halves the contrast of whatever is underneath. This group is on the right
    // side of it already: the dim sits on the circle, which holds nothing but
    // the selected dot, while the label beside it swaps to a colour that was
    // measured. This test is what stops a later edit from hoisting the dim onto
    // the `<label>` and taking the option's words down with it.
    const wrapper = mount(RadioGroup, { props: { modelValue: "free", options, disabled: true } });

    const circle = wrapper.findAll('[role="radio"]')[0]!;
    expect(circle.classes()).toContain("disabled:opacity-50");
    expect(circle.text()).toBe("");
    expect(wrapper.findAll("label")[0]!.classes()).toContain("text-muted-foreground");

    const dimmed = wrapper
      .findAll("*")
      .filter((el) => el.text().trim() !== "")
      .filter((el) => el.classes().some((name) => /(^|:)opacity-/.test(name)));
    expect(dimmed.map((el) => el.classes().join(" "))).toEqual([]);
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

  it("takes its id, description, name, required and invalid state from the row it sits in", () => {
    const row = mount(ProbeRow, {
      props: {
        controlId: "plan",
        describedBy: "plan-description",
        name: "plan",
        required: true,
        invalid: true,
      },
      slots: { default: h(RadioGroup, { options, "aria-label": "Plan" }) },
    });
    const group = row.get('[role="radiogroup"]');

    expect(group.attributes("id")).toBe("plan");
    expect(group.attributes("aria-describedby")).toBe("plan-description");
    expect(group.attributes("aria-required")).toBe("true");
    expect(group.attributes("aria-invalid")).toBe("true");
    expect((row.get("input").element as HTMLInputElement).name).toBe("plan");
  });

  // `name` is the one key this control already had a prop for, so it is the one
  // that could have ended up as two competing concepts — the row's and its own.
  it("lets its own name and disabled overrule the row in both directions", () => {
    const row = mount(ProbeRow, {
      props: { name: "plan", disabled: true },
      slots: {
        default: h(RadioGroup, { options, name: "tier", disabled: false, "aria-label": "Plan" }),
      },
    });
    expect((row.get("input").element as HTMLInputElement).name).toBe("tier");
    expect(
      row.findAll('[role="radio"]').every((radio) => (radio.element as HTMLButtonElement).disabled),
    ).toBe(false);

    const optedIn = mount(ProbeRow, {
      slots: { default: h(RadioGroup, { options, disabled: true, "aria-label": "Plan" }) },
    });
    expect(
      optedIn
        .findAll('[role="radio"]')
        .every((radio) => (radio.element as HTMLButtonElement).disabled),
    ).toBe(true);
  });

  it("adds the row's description to one the caller already set rather than replacing it", () => {
    const row = mount(ProbeRow, {
      props: { describedBy: "plan-description" },
      slots: {
        default: h(RadioGroup, {
          options,
          "aria-label": "Plan",
          "aria-describedby": "plan-pricing",
        }),
      },
    });
    expect(row.get('[role="radiogroup"]').attributes("aria-describedby")).toBe(
      "plan-pricing plan-description",
    );
  });

  // Every key that resolved to nothing is dropped from the bag, so a group with
  // no row above it renders exactly what it rendered before the context existed.
  it("outside any Field adds nothing of its own", () => {
    const wrapper = mount(RadioGroup, { props: { options }, attrs: { "aria-label": "Plan" } });
    const group = wrapper.get('[role="radiogroup"]');
    for (const attribute of ["id", "name", "aria-describedby", "aria-invalid"]) {
      expect(group.attributes(attribute)).toBeUndefined();
    }
    // Reka has always written this one from its own `required` prop, and an
    // unwrapped group resolves that prop to `false` exactly as it did before.
    expect(group.attributes("aria-required")).toBe("false");
    expect(wrapper.find("input").exists()).toBe(false);
  });

  // Each option is a `<button role="radio">` with no native read-only state to
  // put it in, so a row's `readonly` has to arrive as nothing at all rather than
  // as a disabled group wearing a different name.
  it("ignores a row's readonly rather than approximating it", () => {
    const row = mount(ProbeRow, {
      props: { readonly: true },
      slots: { default: h(RadioGroup, { options, "aria-label": "Plan" }) },
    });
    const group = row.get('[role="radiogroup"]');
    expect(group.attributes("aria-readonly")).toBeUndefined();
    expect((row.findAll('[role="radio"]')[0]!.element as HTMLButtonElement).disabled).toBe(false);
  });
});
