import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Centered from "../src/Centered.vue";

function centeredOf(props: Record<string, unknown> = {}) {
  return mount(Centered, { props, slots: { default: "<p>content</p>" } });
}

describe("Centered", () => {
  it("renders with default slot content", () => {
    const wrapper = centeredOf();
    expect(wrapper.html()).toContain("content");
  });

  it("applies the max-width class matching the maxWidth prop", () => {
    expect(centeredOf({ maxWidth: "sm" }).find(".mx-auto").classes()).toContain("max-w-sm");
    expect(centeredOf({ maxWidth: "xl" }).find(".mx-auto").classes()).toContain("max-w-xl");
    expect(centeredOf({ maxWidth: "prose" }).find(".mx-auto").classes()).toContain("max-w-prose");
  });

  it("defaults to max-w-lg", () => {
    expect(centeredOf().find(".mx-auto").classes()).toContain("max-w-lg");
  });

  it("adds gutters by default", () => {
    const classes = centeredOf().find(".mx-auto").classes();
    expect(classes).toContain("px-4");
    expect(classes).toContain("sm:px-6");
    expect(classes).toContain("3xl:px-8");
  });

  it("omits gutters when gutter is false", () => {
    const classes = centeredOf({ gutter: false }).find(".mx-auto").classes();
    expect(classes).not.toContain("px-4");
    expect(classes).not.toContain("sm:px-6");
  });

  it("renders the header slot when provided", () => {
    const wrapper = mount(Centered, {
      slots: { header: "<nav>Header nav</nav>", default: "<p>Content</p>" },
    });
    expect(wrapper.find("header").exists()).toBe(true);
    expect(wrapper.html()).toContain("Header nav");
  });

  it("renders the footer slot when provided", () => {
    const wrapper = mount(Centered, {
      slots: { default: "<p>Content</p>", footer: "<div>Footer</div>" },
    });
    expect(wrapper.find("footer").exists()).toBe(true);
    expect(wrapper.html()).toContain("Footer");
  });

  it("does not render header or footer elements when slots are not provided", () => {
    const wrapper = centeredOf();
    expect(wrapper.find("header").exists()).toBe(false);
    expect(wrapper.find("footer").exists()).toBe(false);
  });

  it("centers the content wrapper with mx-auto", () => {
    expect(centeredOf().find(".mx-auto").classes()).toContain("mx-auto");
  });

  it("gives the content wrapper full width", () => {
    expect(centeredOf().find(".mx-auto").classes()).toContain("w-full");
  });

  it("makes the root a full-height flex column", () => {
    const root = centeredOf().find("div");
    const classes = root.classes();
    expect(classes).toContain("min-h-dvh");
    expect(classes).toContain("flex");
    expect(classes).toContain("flex-col");
  });
});
