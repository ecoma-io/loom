import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import Textarea from "./Textarea.vue";
import { provideFieldContext } from "../../lib/field-context";

// The focus assertions below need the textarea in the real document, so the
// mounted tree has to come back off it afterwards.
enableAutoUnmount(afterEach);

// A stand-in for the Field wrapping this control — Field is a project-internal
// collaborator, and what it publishes is pinned in `Field.test.ts`. This file
// pins the other half: that Textarea reads the row it is inside.
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

describe("Textarea", () => {
  it("emits the raw string on input so v-model tracks each keystroke", async () => {
    const wrapper = mount(Textarea, { props: { ariaLabel: "Description" } });
    const textarea = wrapper.get("textarea");
    await textarea.setValue("hello\nworld");
    expect(wrapper.emitted("update:modelValue")).toEqual([["hello\nworld"]]);
  });

  it("marks the textarea aria-invalid only while invalid, so screen readers announce the error state and not merely the styling", () => {
    const valid = mount(Textarea, { props: { ariaLabel: "Notes" } });
    expect(valid.get("textarea").attributes("aria-invalid")).toBeUndefined();

    const invalid = mount(Textarea, { props: { ariaLabel: "Notes", invalid: true } });
    expect(invalid.get("textarea").attributes("aria-invalid")).toBe("true");
  });

  it("disables the underlying textarea so the field is inert to typing, not merely dimmed", () => {
    const wrapper = mount(Textarea, { props: { ariaLabel: "Notes", disabled: true } });
    expect((wrapper.get("textarea").element as HTMLTextAreaElement).disabled).toBe(true);
  });

  it("locks the size with resize-none only when resize is set to none", () => {
    const vertical = mount(Textarea, { props: { ariaLabel: "Notes" } });
    expect(vertical.get("textarea").classes()).toContain("resize-y");

    const locked = mount(Textarea, { props: { ariaLabel: "Notes", resize: "none" } });
    expect(locked.get("textarea").classes()).toContain("resize-none");
  });

  it("forwards aria-describedby onto the textarea, completing the link to a Field-owned hint or error id", () => {
    const wrapper = mount(Textarea, {
      props: { ariaLabel: "Notes" },
      attrs: { "aria-describedby": "notes-description" },
    });
    expect(wrapper.get("textarea").attributes("aria-describedby")).toBe("notes-description");
  });

  // Every case in this file supplies `ariaLabel` and none of them looks at
  // where it lands — measured: deleting both bindings from the template left
  // the file green. A Textarea used outside a Field carries no visible label,
  // so the name a host passes is the only one the control will ever have.
  it("carries the name a host supplies onto the native textarea, by value or by reference", () => {
    const named = mount(Textarea, { props: { ariaLabel: "Notes" } });
    expect(named.get("textarea").attributes("aria-label")).toBe("Notes");

    const referenced = mount(Textarea, { props: { ariaLabelledby: "notes-heading" } });
    const textarea = referenced.get("textarea");
    expect(textarea.attributes("aria-labelledby")).toBe("notes-heading");
    expect(textarea.attributes("aria-label")).toBeUndefined();
  });

  it("marks the textarea aria-required only while required, so the asterisk is not a promise made to sighted readers alone", () => {
    const optional = mount(Textarea, { props: { ariaLabel: "Notes" } });
    expect(optional.get("textarea").attributes("aria-required")).toBeUndefined();

    const mandatory = mount(Textarea, { props: { ariaLabel: "Notes", required: true } });
    expect(mandatory.get("textarea").attributes("aria-required")).toBe("true");
  });

  it("submits under the name it is given", () => {
    const wrapper = mount(Textarea, { props: { ariaLabel: "Notes", name: "notes" } });
    expect((wrapper.get("textarea").element as HTMLTextAreaElement).name).toBe("notes");
  });

  it("keeps a readonly textarea focusable and submitted where a disabled one is neither", () => {
    const readOnly = mount(Textarea, {
      props: { ariaLabel: "Notes", name: "notes", readonly: true },
      attachTo: document.body,
    });
    const readOnlyEl = readOnly.get("textarea").element as HTMLTextAreaElement;
    readOnlyEl.focus();
    expect(document.activeElement).toBe(readOnlyEl);
    expect(readOnlyEl.readOnly).toBe(true);
    expect(readOnlyEl.disabled).toBe(false);

    const disabled = mount(Textarea, {
      props: { ariaLabel: "Notes", name: "notes", disabled: true },
      attachTo: document.body,
    });
    const disabledEl = disabled.get("textarea").element as HTMLTextAreaElement;
    disabledEl.focus();
    expect(document.activeElement).not.toBe(disabledEl);
  });

  it("shows a readonly textarea as filled rather than dimmed, so it does not read as unavailable", () => {
    const readOnly = mount(Textarea, { props: { ariaLabel: "Notes", readonly: true } });
    expect(readOnly.get("textarea").attributes("data-readonly")).toBe("true");
    expect(readOnly.get("textarea").classes()).toContain("bg-muted");
    // The half that keeps the two states apart now that they share a fill. The
    // muted label colour rides the `disabled:` variant, which a read-only
    // element never matches, so the value stays on `text-foreground` — and it
    // is still focusable, which the test above pins.
    expect(readOnly.get("textarea").classes()).toContain("text-foreground");
    expect((readOnly.get("textarea").element as HTMLTextAreaElement).disabled).toBe(false);
  });

  // The defect this pins. The element *is* the text: `disabled:opacity-50` took
  // a filed answer from 14.09:1 to 3.06:1 and its placeholder from 5.25:1 to
  // 2.05:1. Drained instead, to the same well and the same measured label
  // colour Select and OtpInput wear, at 4.67:1.
  it("drains a disabled textarea rather than fading the text written in it", () => {
    const wrapper = mount(Textarea, { props: { ariaLabel: "Notes", disabled: true } });
    const classes = wrapper.get("textarea").classes();

    expect(classes.some((c) => c.includes("opacity"))).toBe(false);
    expect(classes).toContain("disabled:bg-muted");
    expect(classes).toContain("disabled:text-muted-foreground");
  });

  it("takes its id, description, name, required and invalid state from the row it sits in", () => {
    const row = mount(ProbeRow, {
      props: {
        controlId: "bio",
        describedBy: "bio-description",
        name: "bio",
        required: true,
        invalid: true,
      },
      slots: { default: h(Textarea, { ariaLabel: "Bio" }) },
    });
    const textarea = row.get("textarea");

    expect(textarea.attributes("id")).toBe("bio");
    expect(textarea.attributes("aria-describedby")).toBe("bio-description");
    expect(textarea.attributes("name")).toBe("bio");
    expect(textarea.attributes("aria-required")).toBe("true");
    expect(textarea.attributes("aria-invalid")).toBe("true");
    expect(textarea.classes()).toContain("border-destructive");
  });

  it("lets an explicit prop overrule the row in both directions", () => {
    const optedOut = mount(ProbeRow, {
      props: { invalid: true, required: true, disabled: true, readonly: true },
      slots: {
        default: h(Textarea, {
          ariaLabel: "Bio",
          invalid: false,
          required: false,
          disabled: false,
          readonly: false,
        }),
      },
    });
    const optedOutEl = optedOut.get("textarea").element as HTMLTextAreaElement;
    expect(optedOut.get("textarea").attributes("aria-invalid")).toBeUndefined();
    expect(optedOut.get("textarea").attributes("aria-required")).toBeUndefined();
    expect(optedOutEl.disabled).toBe(false);
    expect(optedOutEl.readOnly).toBe(false);

    const optedIn = mount(ProbeRow, {
      slots: { default: h(Textarea, { ariaLabel: "Bio", invalid: true, required: true }) },
    });
    expect(optedIn.get("textarea").attributes("aria-invalid")).toBe("true");
    expect(optedIn.get("textarea").attributes("aria-required")).toBe("true");
  });

  it("adds the row's description to one the caller already set rather than replacing it", () => {
    const row = mount(ProbeRow, {
      props: { describedBy: "bio-description" },
      slots: { default: h(Textarea, { ariaLabel: "Bio", "aria-describedby": "bio-format" }) },
    });
    expect(row.get("textarea").attributes("aria-describedby")).toBe("bio-format bio-description");
  });
});
