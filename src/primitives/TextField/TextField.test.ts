import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import TextField from "./TextField.vue";
import { provideFieldContext } from "../../lib/field-context";

// The focus assertions below need the input in the real document, so the
// mounted tree has to come back off it afterwards.
enableAutoUnmount(afterEach);

// A stand-in for the Field wrapping this control. Field itself is a
// project-internal collaborator, and its own behaviour — which id it mints,
// when it publishes a description — is pinned in `Field.test.ts`. What matters
// here is the other half: that this control reads a row it is inside at all.
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
    return () => h("div", slots.default?.());
  },
});

describe("TextField", () => {
  it("emits the raw string on input so v-model tracks each keystroke", async () => {
    const wrapper = mount(TextField, { props: { ariaLabel: "Name" } });
    const input = wrapper.get("input");
    await input.setValue("hello");
    expect(wrapper.emitted("update:modelValue")).toEqual([["hello"]]);
  });

  it("marks the input aria-invalid only while invalid, so screen readers announce the error state and not merely the styling", () => {
    const valid = mount(TextField, { props: { ariaLabel: "Email" } });
    expect(valid.get("input").attributes("aria-invalid")).toBeUndefined();

    const invalid = mount(TextField, { props: { ariaLabel: "Email", invalid: true } });
    expect(invalid.get("input").attributes("aria-invalid")).toBe("true");
  });

  it("disables the underlying input so the field is inert to typing, not merely dimmed", () => {
    const wrapper = mount(TextField, { props: { ariaLabel: "Name", disabled: true } });
    expect((wrapper.get("input").element as HTMLInputElement).disabled).toBe(true);
  });

  it("renders leading and trailing adornments inside the field frame", () => {
    const wrapper = mount(TextField, {
      props: { ariaLabel: "Search" },
      slots: { leading: "🔍", trailing: "⌫" },
    });
    expect(wrapper.text()).toContain("🔍");
    expect(wrapper.text()).toContain("⌫");
  });

  it("forwards aria-describedby onto the native input, completing the link to a Field-owned hint or error id", () => {
    // Field cannot reach into this component to set the attribute itself
    // (see Field.vue) — this is the other half of that contract: whatever
    // id a host passes through reaches the real input rather than the
    // wrapper div, which is where a screen reader looks for it.
    const wrapper = mount(TextField, {
      props: { ariaLabel: "Email" },
      attrs: { "aria-describedby": "email-description" },
    });
    expect(wrapper.get("input").attributes("aria-describedby")).toBe("email-description");
  });

  // Every case in this file supplies `ariaLabel` and none of them looks at
  // where it lands — measured: deleting both bindings from the template left
  // the file green. A TextField used outside a Field carries no visible label,
  // so the name a host passes is the only one the input will ever have.
  it("carries the name a host supplies onto the native input, by value or by reference", () => {
    const named = mount(TextField, { props: { ariaLabel: "Email" } });
    expect(named.get("input").attributes("aria-label")).toBe("Email");

    const referenced = mount(TextField, { props: { ariaLabelledby: "email-heading" } });
    const input = referenced.get("input");
    expect(input.attributes("aria-labelledby")).toBe("email-heading");
    expect(input.attributes("aria-label")).toBeUndefined();
  });

  it("routes the fallthrough class onto the wrapper so a caller can size the whole field, not just the input", () => {
    const wrapper = mount(TextField, {
      props: { ariaLabel: "Name" },
      attrs: { class: "w-64" },
    });
    expect(wrapper.classes()).toContain("w-64");
    expect(wrapper.get("input").classes()).not.toContain("w-64");
  });

  it("marks the input aria-required only while required, so the asterisk is not a promise made to sighted readers alone", () => {
    const optional = mount(TextField, { props: { ariaLabel: "Email" } });
    expect(optional.get("input").attributes("aria-required")).toBeUndefined();

    const mandatory = mount(TextField, { props: { ariaLabel: "Email", required: true } });
    expect(mandatory.get("input").attributes("aria-required")).toBe("true");
  });

  it("submits under the name it is given", () => {
    const wrapper = mount(TextField, { props: { ariaLabel: "Email", name: "email" } });
    expect((wrapper.get("input").element as HTMLInputElement).name).toBe("email");
  });

  it("keeps a readonly field focusable and submitted where a disabled one is neither", () => {
    // The two are different states, not two dials on one: a read-only value is
    // on show and reachable by keyboard, a disabled one is unavailable. jsdom
    // implements the focusable-area rule, so this is the real behaviour rather
    // than a proxy for it.
    const readOnly = mount(TextField, {
      props: { ariaLabel: "Email", name: "email", readonly: true },
      attachTo: document.body,
    });
    const readOnlyInput = readOnly.get("input").element as HTMLInputElement;
    readOnlyInput.focus();
    expect(document.activeElement).toBe(readOnlyInput);
    expect(readOnlyInput.readOnly).toBe(true);
    expect(readOnlyInput.disabled).toBe(false);

    const disabled = mount(TextField, {
      props: { ariaLabel: "Email", name: "email", disabled: true },
      attachTo: document.body,
    });
    const disabledInput = disabled.get("input").element as HTMLInputElement;
    disabledInput.focus();
    expect(document.activeElement).not.toBe(disabledInput);
  });

  it("shows a readonly field as filled rather than dimmed, so it does not read as unavailable", () => {
    const readOnly = mount(TextField, { props: { ariaLabel: "Email", readonly: true } });
    expect(readOnly.attributes("data-readonly")).toBe("true");
    expect(readOnly.classes()).not.toContain("opacity-50");

    const disabled = mount(TextField, { props: { ariaLabel: "Email", disabled: true } });
    expect(disabled.classes()).toContain("opacity-50");
    expect(disabled.attributes("data-readonly")).toBeUndefined();
  });

  it("takes its id, description, name, required and invalid state from the row it sits in", () => {
    const row = mount(ProbeRow, {
      props: {
        controlId: "email",
        describedBy: "email-description",
        name: "email",
        required: true,
        invalid: true,
      },
      slots: { default: h(TextField, { ariaLabel: "Email" }) },
    });
    const input = row.get("input");

    expect(input.attributes("id")).toBe("email");
    expect(input.attributes("aria-describedby")).toBe("email-description");
    expect(input.attributes("name")).toBe("email");
    expect(input.attributes("aria-required")).toBe("true");
    expect(input.attributes("aria-invalid")).toBe("true");
    expect(row.find('[data-invalid="true"]').exists()).toBe(true);
  });

  it("lets an explicit prop overrule the row in both directions", () => {
    const optedOut = mount(ProbeRow, {
      props: { invalid: true, required: true, disabled: true, readonly: true },
      slots: {
        default: h(TextField, {
          ariaLabel: "Email",
          invalid: false,
          required: false,
          disabled: false,
          readonly: false,
        }),
      },
    });
    const optedOutInput = optedOut.get("input").element as HTMLInputElement;
    expect(optedOut.get("input").attributes("aria-invalid")).toBeUndefined();
    expect(optedOut.get("input").attributes("aria-required")).toBeUndefined();
    expect(optedOutInput.disabled).toBe(false);
    expect(optedOutInput.readOnly).toBe(false);

    const optedIn = mount(ProbeRow, {
      slots: { default: h(TextField, { ariaLabel: "Email", invalid: true, required: true }) },
    });
    expect(optedIn.get("input").attributes("aria-invalid")).toBe("true");
    expect(optedIn.get("input").attributes("aria-required")).toBe("true");
  });

  it("adds the row's description to one the caller already set rather than replacing it", () => {
    const row = mount(ProbeRow, {
      props: { describedBy: "email-description" },
      slots: {
        default: h(TextField, { ariaLabel: "Email", "aria-describedby": "password-rules" }),
      },
    });
    expect(row.get("input").attributes("aria-describedby")).toBe(
      "password-rules email-description",
    );
  });
});
