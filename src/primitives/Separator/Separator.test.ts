import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Separator from "./Separator.vue";

describe("Separator", () => {
  it("is decorative by default — a visual divider beside already-structured content must not add a second landmark", () => {
    const wrapper = mount(Separator);
    expect(wrapper.attributes("role")).toBe("none");
    expect(wrapper.attributes("aria-orientation")).toBeUndefined();
  });

  it("becomes a real separator role when it carries meaning, and then reports its orientation to assistive tech", () => {
    const horizontal = mount(Separator, { props: { decorative: false } });
    expect(horizontal.attributes("role")).toBe("separator");
    expect(horizontal.attributes("aria-orientation")).toBeUndefined(); // horizontal is the ARIA default

    const vertical = mount(Separator, { props: { decorative: false, orientation: "vertical" } });
    expect(vertical.attributes("role")).toBe("separator");
    expect(vertical.attributes("aria-orientation")).toBe("vertical");
  });

  it("draws a full-width hairline when horizontal and a full-height one when vertical, so a toolbar divider is not a stray dot", () => {
    const horizontal = mount(Separator).classes();
    expect(horizontal).toContain("h-px");
    expect(horizontal).toContain("w-full");

    const vertical = mount(Separator, { props: { orientation: "vertical" } }).classes();
    expect(vertical).toContain("w-px");
    expect(vertical).toContain("h-full");
    expect(vertical).toContain("self-stretch"); // a flex row would otherwise collapse it to zero height
  });

  it("defaults to horizontal, the section break most callers mean", () => {
    const classes = mount(Separator).classes();
    expect(classes).toContain("w-full");
    expect(classes).not.toContain("w-px");
  });
});
