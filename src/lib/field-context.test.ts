import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, useAttrs } from "vue";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { provideFieldContext, useFieldControl } from "./field-context";

enableAutoUnmount(afterEach);

// The two ends of the contract, reduced to the part under test. Real hosts
// (Field, Fieldset, TextField) are deliberately absent: this file is about the
// composable, and a test that mounted the real pair would pass on Field's
// behaviour rather than on this file's.
//
// Every boolean is declared `default: undefined`, which is the whole point of
// the design and the thing a control gets wrong: without it Vue casts an absent
// Boolean prop to `false`, `false ?? wrapper` short-circuits, and the context
// is inert while looking perfectly wired.
const Wrapper = defineComponent({
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
    return () => h("div", slots.default?.());
  },
});

const Control = defineComponent({
  inheritAttrs: false,
  props: {
    name: { type: String, default: undefined },
    required: { type: Boolean, default: undefined },
    invalid: { type: Boolean, default: undefined },
    disabled: { type: Boolean, default: undefined },
    readonly: { type: Boolean, default: undefined },
  },
  setup(props) {
    const attrs = useAttrs();
    const field = useFieldControl(() => ({
      id: attrs.id as string | undefined,
      describedBy: attrs["aria-describedby"] as string | undefined,
      name: props.name,
      required: props.required,
      invalid: props.invalid,
      disabled: props.disabled,
      readonly: props.readonly,
    }));
    return () =>
      h("input", {
        ...attrs,
        ...field.attrs,
        disabled: field.disabled,
        readonly: field.readonly,
        "data-invalid": field.invalid || undefined,
      });
  },
});

describe("useFieldControl", () => {
  it("renders none of the wrapper's attributes when there is no wrapper above it", () => {
    const input = mount(Control).get("input");

    expect(input.attributes("id")).toBeUndefined();
    expect(input.attributes("name")).toBeUndefined();
    expect(input.attributes("aria-describedby")).toBeUndefined();
    expect(input.attributes("aria-required")).toBeUndefined();
    expect(input.attributes("aria-invalid")).toBeUndefined();
    expect(input.attributes("disabled")).toBeUndefined();
    expect(input.attributes("readonly")).toBeUndefined();
  });

  it("leaves a caller's own fallthrough attributes untouched with no wrapper above it", () => {
    // The resolved bag spreads last, so anything it emitted as `undefined`
    // would blank out the attribute a caller passed. `optional()` drops those
    // keys instead, which is what makes the spread additive rather than
    // authoritative.
    const input = mount(Control, {
      attrs: { id: "mine", "aria-describedby": "elsewhere", autocomplete: "email" },
    }).get("input");

    expect(input.attributes("id")).toBe("mine");
    expect(input.attributes("aria-describedby")).toBe("elsewhere");
    expect(input.attributes("autocomplete")).toBe("email");
  });

  it("takes the wrapper's id, description, name, required and invalid state with nothing set on the control", () => {
    const input = mount(Wrapper, {
      props: {
        controlId: "row",
        describedBy: "row-description",
        name: "email",
        required: true,
        invalid: true,
      },
      slots: { default: h(Control) },
    }).get("input");

    expect(input.attributes("id")).toBe("row");
    expect(input.attributes("aria-describedby")).toBe("row-description");
    expect(input.attributes("name")).toBe("email");
    expect(input.attributes("aria-required")).toBe("true");
    expect(input.attributes("aria-invalid")).toBe("true");
  });

  it("lets an explicitly valid control stay valid inside a wrapper that is not", () => {
    const input = mount(Wrapper, {
      props: { invalid: true },
      slots: { default: h(Control, { invalid: false }) },
    }).get("input");

    expect(input.attributes("aria-invalid")).toBeUndefined();
    expect(input.attributes("data-invalid")).toBeUndefined();
  });

  it("lets an explicitly invalid control say so inside a wrapper that is clean", () => {
    const input = mount(Wrapper, {
      slots: { default: h(Control, { invalid: true }) },
    }).get("input");

    expect(input.attributes("aria-invalid")).toBe("true");
  });

  it("lets an explicitly enabled, editable control beat a wrapper that disables and freezes the row", () => {
    const input = mount(Wrapper, {
      props: { disabled: true, readonly: true },
      slots: { default: h(Control, { disabled: false, readonly: false }) },
    }).get("input");

    expect(input.attributes("disabled")).toBeUndefined();
    expect(input.attributes("readonly")).toBeUndefined();
  });

  it("takes the wrapper's disabled and readonly when the control sets neither", () => {
    const input = mount(Wrapper, {
      props: { disabled: true, readonly: true },
      slots: { default: h(Control) },
    }).get("input");

    expect((input.element as HTMLInputElement).disabled).toBe(true);
    expect((input.element as HTMLInputElement).readOnly).toBe(true);
  });

  it("keeps a caller's own id and merges the wrapper's description into theirs rather than replacing it", () => {
    // `aria-describedby` is a token list, so the row's message is additional to
    // whatever else the caller pointed at. Replacing would silently drop the
    // row's hint the moment a caller described their control for some other
    // reason.
    const input = mount(Wrapper, {
      props: { controlId: "row", describedBy: "row-description" },
      slots: { default: h(Control, { id: "mine", "aria-describedby": "unit-hint" }) },
    }).get("input");

    expect(input.attributes("id")).toBe("mine");
    expect(input.attributes("aria-describedby")).toBe("unit-hint row-description");
  });

  it("tracks a wrapper whose error arrives after the control mounted", async () => {
    const wrapper = mount(Wrapper, { slots: { default: h(Control) } });
    expect(wrapper.get("input").attributes("aria-invalid")).toBeUndefined();

    await wrapper.setProps({ invalid: true, describedBy: "row-description" });

    expect(wrapper.get("input").attributes("aria-invalid")).toBe("true");
    expect(wrapper.get("input").attributes("aria-describedby")).toBe("row-description");
  });

  it("gives the row's single id to the first control only, so two controls never share one", () => {
    const wrapper = mount(Wrapper, {
      props: { controlId: "row" },
      slots: { default: [h(Control), h(Control)] },
    });
    const inputs = wrapper.findAll("input");

    expect(inputs[0]?.attributes("id")).toBe("row");
    expect(inputs[1]?.attributes("id")).toBeUndefined();
  });

  it("promotes the next control to the row's id when the one holding it unmounts", async () => {
    // Otherwise the wrapper's `<label for>` points at an id that has left the
    // document, which reads as correct in the source and names nothing at all.
    const Swapper = defineComponent({
      props: { showFirst: { type: Boolean, default: true } },
      setup(props) {
        return () =>
          h(
            Wrapper,
            { controlId: "row" },
            { default: () => [props.showFirst ? h(Control) : null, h(Control)] },
          );
      },
    });

    const wrapper = mount(Swapper);
    expect(wrapper.findAll("input")[0]?.attributes("id")).toBe("row");
    expect(wrapper.findAll("input")[1]?.attributes("id")).toBeUndefined();

    await wrapper.setProps({ showFirst: false });

    const remaining = wrapper.findAll("input");
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.attributes("id")).toBe("row");
  });
});
