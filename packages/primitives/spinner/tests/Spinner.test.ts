import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Spinner from "../src/Spinner.vue";

describe("Spinner", () => {
  it("announces the wait via role=status and aria-label so screen readers don't need to see the SVG", () => {
    const wrapper = mount(Spinner, { props: { label: "Saving" } });
    const status = wrapper.get('[role="status"]');
    expect(status.attributes("aria-label")).toBe("Saving");
    expect(wrapper.get("svg").attributes("aria-hidden")).toBe("true");
  });

  it("defaults the label to a generic loading message when the caller doesn't provide one", () => {
    const wrapper = mount(Spinner);
    expect(wrapper.get('[role="status"]').attributes("aria-label")).toBe("Loading");
  });

  it("sizes the svg per the size prop, defaulting to md", () => {
    expect(
      mount(Spinner, { props: { size: "sm" } })
        .get("svg")
        .classes(),
    ).toEqual(expect.arrayContaining(["h-4", "w-4"]));
    expect(mount(Spinner).get("svg").classes()).toEqual(expect.arrayContaining(["h-5", "w-5"]));
    expect(
      mount(Spinner, { props: { size: "lg" } })
        .get("svg")
        .classes(),
    ).toEqual(expect.arrayContaining(["h-8", "w-8"]));
  });
});
