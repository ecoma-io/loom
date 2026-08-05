import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import InlineError from "./InlineError.vue";

describe("InlineError", () => {
  it("renders role=alert with the message prop, styled on the destructive token", () => {
    const wrapper = mount(InlineError, { props: { message: "Could not open the project." } });
    const root = wrapper.get('[role="alert"]');
    expect(root.text()).toContain("Could not open the project.");
    expect(root.classes()).toContain("text-destructive");
  });

  it("prefers slot content over the message prop when both are given", () => {
    const wrapper = mount(InlineError, {
      props: { message: "fallback" },
      slots: { default: "Slot message wins" },
    });
    expect(wrapper.text()).toContain("Slot message wins");
    expect(wrapper.text()).not.toContain("fallback");
  });

  it("renders the action slot only when provided (retry/remove affordance)", () => {
    const withoutAction = mount(InlineError, { props: { message: "err" } });
    expect(withoutAction.find("button").exists()).toBe(false);

    const withAction = mount(InlineError, {
      props: { message: "err" },
      slots: { action: '<button type="button">Retry</button>' },
    });
    expect(withAction.find("button").text()).toBe("Retry");
  });

  it("forwards fallthrough attrs (e.g. an id) to the alert root — no inheritAttrs override", () => {
    // Field relies on exactly this: it hands InlineError the description id
    // that lets a consumer's control point aria-describedby at the error
    // text (see Field.vue and Field.integration.test.ts). If this ever
    // regressed to `inheritAttrs: false`, that link would silently break.
    const wrapper = mount(InlineError, {
      props: { message: "err" },
      attrs: { id: "email-description" },
    });
    expect(wrapper.get('[role="alert"]').attributes("id")).toBe("email-description");
  });
});
