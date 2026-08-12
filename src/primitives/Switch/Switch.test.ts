import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import Switch from "./Switch.vue";
import { provideFieldContext } from "../../lib/field-context";

// A stand-in for the Field wrapping this control. Field's own behaviour is
// pinned in `Field.test.ts`; what matters here is that the switch reads a row
// it is inside at all.
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

  it("keeps the dim on the track and thumb, which hold no text of their own", () => {
    // The library-wide rule is that an `opacity` may drain a border, a fill or
    // a glyph and may never drain text, because compositing at 50% more than
    // halves the contrast of whatever is underneath. This control renders a
    // track and a thumb and no words at all, so `disabled:opacity-50` here is
    // correct and stays. The name lives on a label the *host* owns, outside
    // this tree — `SwitchDemo.vue` is where that half is pinned.
    const wrapper = mount(Switch, {
      props: { modelValue: true, disabled: true },
      attrs: { "aria-label": "Autosave" },
    });

    const track = wrapper.get('[role="switch"]');
    expect(track.classes()).toContain("disabled:opacity-50");
    expect(track.text()).toBe("");

    const dimmed = wrapper
      .findAll("*")
      .filter((el) => el.text().trim() !== "")
      .filter((el) => el.classes().some((name) => /(^|:)opacity-/.test(name)));
    expect(dimmed.map((el) => el.classes().join(" "))).toEqual([]);
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

  it("takes its id, description, name, required and invalid state from the row it sits in", () => {
    const row = mount(ProbeRow, {
      props: {
        controlId: "autosave",
        describedBy: "autosave-description",
        name: "autosave",
        required: true,
        invalid: true,
      },
      slots: { default: h(Switch) },
    });
    const control = row.get('[role="switch"]');

    // The id is the whole point for this control: it renders a button with no
    // label of its own, and the row's `<label for>` can only name it once the
    // id it points at is on that button.
    expect(control.attributes("id")).toBe("autosave");
    expect(control.attributes("aria-describedby")).toBe("autosave-description");
    expect(control.attributes("aria-required")).toBe("true");
    expect(control.attributes("aria-invalid")).toBe("true");
    expect((row.get("input").element as HTMLInputElement).name).toBe("autosave");
  });

  it("lets an explicit disabled overrule the row in both directions", () => {
    const optedOut = mount(ProbeRow, {
      props: { disabled: true },
      slots: { default: h(Switch, { "aria-label": "Autosave", disabled: false }) },
    });
    expect((optedOut.get('[role="switch"]').element as HTMLButtonElement).disabled).toBe(false);

    const optedIn = mount(ProbeRow, {
      slots: { default: h(Switch, { "aria-label": "Autosave", disabled: true }) },
    });
    expect((optedIn.get('[role="switch"]').element as HTMLButtonElement).disabled).toBe(true);
  });

  it("adds the row's description to one the caller already set rather than replacing it", () => {
    const row = mount(ProbeRow, {
      props: { describedBy: "autosave-description" },
      slots: { default: h(Switch, { "aria-describedby": "autosave-caveat" }) },
    });
    expect(row.get('[role="switch"]').attributes("aria-describedby")).toBe(
      "autosave-caveat autosave-description",
    );
  });

  // Every key that resolved to nothing is dropped from the bag, so a switch
  // with no row above it renders exactly what it rendered before the context
  // existed.
  it("outside any Field adds nothing of its own", () => {
    const wrapper = mount(Switch, { attrs: { "aria-label": "Autosave" } });
    const control = wrapper.get('[role="switch"]');
    for (const attribute of ["id", "name", "aria-describedby", "aria-invalid"]) {
      expect(control.attributes(attribute)).toBeUndefined();
    }
    // Reka has always written this one from its own `required` prop, and an
    // unwrapped switch resolves that prop to `false` exactly as it did before.
    expect(control.attributes("aria-required")).toBe("false");
  });

  // A setting that may be read but not flipped is a disabled setting. Painting
  // one as live and then refusing the flip is the state worse than either, so a
  // row's `readonly` must arrive as nothing at all.
  it("ignores a row's readonly rather than approximating it", () => {
    const row = mount(ProbeRow, {
      props: { readonly: true },
      slots: { default: h(Switch, { "aria-label": "Autosave" }) },
    });
    const control = row.get('[role="switch"]');
    expect((control.element as HTMLButtonElement).disabled).toBe(false);
    expect(control.attributes("aria-readonly")).toBeUndefined();
  });
});
