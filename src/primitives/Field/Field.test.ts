import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import Field from "./Field.vue";

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
});
