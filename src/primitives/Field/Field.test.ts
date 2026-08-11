import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, useAttrs } from "vue";
import Field from "./Field.vue";
import { provideFieldContext, useFieldControl } from "../../lib/field-context";

// Unit tier: the internal collaborator is isolated
// (local/no-unmocked-internal-imports). The stub keeps only the seam this
// file's own behavior is defined against — whether Field renders InlineError
// at all and what it hands it, not what InlineError does with that message
// (that's `role="alert"`, pinned against the real component in
// `Field.integration.test.ts`).
//
// The stub's props are read from the real component at mock time, so a rename
// of InlineError's `message` prop changes the shape the stub declares and the
// test that passes `message` to it breaks.
vi.mock("../InlineError/InlineError.vue", async () => {
  const actual = await vi.importActual("../InlineError/InlineError.vue");
  const c = (actual as { default: { props?: Record<string, unknown> } }).default;
  return {
    default: {
      name: "InlineError",
      props: c.props ? Object.keys(c.props) : [],
      template: "<div />",
    },
  };
});

// A stand-in for any Loom form control: it opts into the row through the same
// composable every real control uses and renders what it was handed. A real
// TextField here would make this an integration test — this file is about what
// Field publishes, not about what one control does with it. It sets none of the
// row's keys itself, which is the case that matters: a key a control omits is a
// prop that control does not have, and the row's answer stands unopposed.
const ProbeControl = defineComponent({
  inheritAttrs: false,
  setup() {
    const attrs = useAttrs();
    const field = useFieldControl(() => ({
      id: attrs.id as string | undefined,
      describedBy: attrs["aria-describedby"] as string | undefined,
    }));
    return () =>
      h("input", {
        ...attrs,
        ...field.attrs,
        disabled: field.disabled,
        readonly: field.readonly,
      });
  },
});

// A stand-in for a Fieldset above the row — a wrapper that answers `readonly`
// and nothing else. Real Fieldset would again be an integration test; what is
// pinned here is Field's own merge, which is the only place the two wrappers
// overlap.
const ProbeGroup = defineComponent({
  props: { readonly: { type: Boolean, default: undefined } },
  setup(props, { slots }) {
    provideFieldContext({
      controlId: () => undefined,
      describedBy: () => undefined,
      name: () => undefined,
      required: () => undefined,
      invalid: () => undefined,
      disabled: () => undefined,
      readonly: () => props.readonly,
    });
    return () => h("div", slots.default?.());
  },
});

describe("Field", () => {
  it("renders InlineError with the error message and hides the hint when an error is present", () => {
    const withError = mount(Field, {
      props: {
        label: "Email",
        for: "email-input",
        hint: "Use your company email",
        error: "That address is not valid",
      },
    });
    const inlineError = withError.findComponent({ name: "InlineError" });
    expect(inlineError.exists()).toBe(true);
    expect(inlineError.props("message")).toBe("That address is not valid");
    expect(withError.text()).not.toContain("Use your company email");

    const withHint = mount(Field, {
      props: { label: "Email", for: "email-input", hint: "Use your company email" },
    });
    expect(withHint.findComponent({ name: "InlineError" }).exists()).toBe(false);
    expect(withHint.text()).toContain("Use your company email");
  });

  it("associates the label with its control via a matching for/id pair", () => {
    const wrapper = mount(Field, {
      props: { label: "Email", for: "email-input" },
      slots: { default: '<input id="email-input" />' },
    });
    expect(wrapper.get("label").attributes("for")).toBe("email-input");
  });

  // The fallback half of that association, and the half nothing checked —
  // measured: relaxing the guard to `v-if="label"` left this file green.
  // A `<label>` with no `for` is a label pointing at nothing: it names no
  // control, and clicking it focuses none, while looking correct in the DOM.
  it("falls back to plain text when there is no control id to point at, rather than a label naming nothing", () => {
    const wrapper = mount(Field, { props: { label: "Email" } });
    expect(wrapper.find("label").exists()).toBe(false);
    expect(wrapper.get("span").text()).toContain("Email");
  });

  it("shows a required asterisk only when required is set", () => {
    const required = mount(Field, {
      props: { label: "Email", for: "email-input", required: true },
    });
    expect(required.text()).toContain("*");

    const optional = mount(Field, { props: { label: "Email", for: "email-input" } });
    expect(optional.text()).not.toContain("*");
  });

  it("gives the hint a predictable id derived from for, so a consumer can point their control's aria-describedby at it", () => {
    const wrapper = mount(Field, {
      props: { label: "Email", for: "email-input", hint: "Use your company email" },
    });
    expect(wrapper.get("p").attributes("id")).toBe("email-input-description");
  });

  it("hands that same description id to InlineError once an error replaces the hint", () => {
    const wrapper = mount(Field, {
      props: { label: "Email", for: "email-input", error: "That address is not valid" },
    });
    expect(wrapper.findComponent({ name: "InlineError" }).attributes("id")).toBe(
      "email-input-description",
    );
  });

  it("assigns no description id when for is absent, since there is no control to associate it with", () => {
    const wrapper = mount(Field, {
      props: { label: "Email", hint: "Use your company email" },
    });
    expect(wrapper.get("p").attributes("id")).toBeUndefined();
  });

  it("names, describes, requires and invalidates a control in its slot with nothing written at the call site", () => {
    const wrapper = mount(Field, {
      props: { label: "Email", error: "That address is not valid", required: true },
      slots: { default: h(ProbeControl) },
    });
    const input = wrapper.get("input");
    const id = input.attributes("id") ?? "";

    expect(id).not.toBe("");
    expect(wrapper.get("label").attributes("for")).toBe(id);
    expect(input.attributes("aria-describedby")).toBe(`${id}-description`);
    expect(wrapper.findComponent({ name: "InlineError" }).attributes("id")).toBe(
      `${id}-description`,
    );
    expect(input.attributes("aria-required")).toBe("true");
    expect(input.attributes("aria-invalid")).toBe("true");
  });

  it("gives a control the id passed as for, so a call site that already published one keeps it", () => {
    const wrapper = mount(Field, {
      props: { label: "Email", for: "email", hint: "Use your company email" },
      slots: { default: h(ProbeControl) },
    });
    const input = wrapper.get("input");

    expect(input.attributes("id")).toBe("email");
    expect(input.attributes("aria-describedby")).toBe("email-description");
  });

  it("describes a control only while a message is on screen, never with an id nothing rendered", () => {
    // An IDREF resolving to no element is worse than no attribute: a screen
    // reader announces nothing and the row looks correctly wired in the DOM.
    const wrapper = mount(Field, {
      props: { label: "Email" },
      slots: { default: h(ProbeControl) },
    });
    expect(wrapper.get("input").attributes("aria-describedby")).toBeUndefined();
  });

  it("hands the row's name, disabled and readonly to the control in its slot", () => {
    const wrapper = mount(Field, {
      props: { label: "Email", name: "email", disabled: true, readonly: true },
      slots: { default: h(ProbeControl) },
    });
    const input = wrapper.get("input").element as HTMLInputElement;

    expect(input.name).toBe("email");
    expect(input.disabled).toBe(true);
    expect(input.readOnly).toBe(true);
  });

  it("says nothing about required, invalid, disabled or readonly when it was told nothing", () => {
    // The row has to be able to hold no opinion, or a control that set one of
    // these for itself would be overruled by a Field that never mentioned it.
    const wrapper = mount(Field, {
      props: { label: "Email" },
      slots: { default: h(ProbeControl) },
    });
    const input = wrapper.get("input");

    expect(input.attributes("aria-required")).toBeUndefined();
    expect(input.attributes("aria-invalid")).toBeUndefined();
    expect((input.element as HTMLInputElement).disabled).toBe(false);
    expect((input.element as HTMLInputElement).readOnly).toBe(false);
  });

  it("inherits readonly from the group above it, and lets its own readonly overrule the group", () => {
    const inherited = mount(ProbeGroup, {
      props: { readonly: true },
      slots: { default: h(Field, { label: "Street" }, { default: () => h(ProbeControl) }) },
    });
    expect((inherited.get("input").element as HTMLInputElement).readOnly).toBe(true);

    const overruled = mount(ProbeGroup, {
      props: { readonly: true },
      slots: {
        default: h(Field, { label: "Street", readonly: false }, { default: () => h(ProbeControl) }),
      },
    });
    expect((overruled.get("input").element as HTMLInputElement).readOnly).toBe(false);
  });
});
