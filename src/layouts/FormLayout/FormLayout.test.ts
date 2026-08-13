import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import FormLayout from "./FormLayout.vue";

function layoutOf(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(FormLayout, {
    props,
    slots: { default: "<p>Form content</p>", ...slots },
  });
}

describe("FormLayout", () => {
  it("renders with default slot content", () => {
    const wrapper = layoutOf();
    expect(wrapper.text()).toContain("Form content");
  });

  it("applies max-width class matching maxWidth prop", () => {
    expect(layoutOf({ maxWidth: "sm" }).find(".max-w-sm").exists()).toBe(true);
    expect(layoutOf({ maxWidth: "lg" }).find(".max-w-lg").exists()).toBe(true);
    expect(layoutOf({ maxWidth: "xl" }).find(".max-w-xl").exists()).toBe(true);
  });

  it("defaults to max-w-md, because a form wider than that is no longer a form", () => {
    const wrapper = layoutOf();
    expect(wrapper.find(".max-w-md").exists()).toBe(true);
  });

  it("renders header slot when provided", () => {
    const wrapper = layoutOf({}, { header: "<h1>Create account</h1>" });
    expect(wrapper.find("header").text()).toContain("Create account");
  });

  it("does not render a header element when the header slot is absent", () => {
    const wrapper = layoutOf();
    expect(wrapper.find("header").exists()).toBe(false);
  });

  it("renders actions slot when provided", () => {
    const wrapper = layoutOf({}, { actions: "<button>Submit</button>" });
    expect(wrapper.text()).toContain("Submit");
  });

  it("does not render an actions wrapper when the actions slot is absent", () => {
    const wrapper = layoutOf();
    // The actions wrapper is the only element carrying mt-8
    expect(wrapper.find(".mt-8").exists()).toBe(false);
  });

  it("centres the form horizontally, because a form against the left edge reads as broken on a wide monitor", () => {
    const wrapper = layoutOf();
    expect(wrapper.find(".mx-auto").exists()).toBe(true);
  });
});
