import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SplitLayout from "../src/SplitLayout.vue";

function layoutOf(props: Record<string, unknown> = {}) {
  return mount(SplitLayout, {
    props,
    slots: { default: "<p>Main content</p>", side: "<nav>Side panel</nav>" },
  });
}

describe("SplitLayout", () => {
  it("renders with side and default slots", () => {
    const wrapper = layoutOf();
    expect(wrapper.html()).toContain("Side panel");
    expect(wrapper.html()).toContain("Main content");
  });

  it("applies minSideWidth as inline style on the side panel", () => {
    const wrapper = layoutOf({ minSideWidth: "20rem" });
    // Root div [0], flex-wrap row [1], side panel [2]
    const side = wrapper.findAll("div")[2]!;
    const style = side.attributes("style") ?? "";
    expect(style).toContain("20rem");
  });

  it("defaults to left side, 48rem collapse, 16rem side width, and no gap", () => {
    const wrapper = layoutOf();
    const row = wrapper.findAll("div")[1]!;
    expect(row.classes()).toContain("flex-row");
    const side = wrapper.findAll("div")[2]!;
    expect(side.attributes("style") ?? "").toContain("16rem");
    // No gap classes when gap is "none"
    expect(row.classes()).not.toContain("gap-3");
    expect(row.classes()).not.toContain("sm:gap-4");
  });

  it("renders header slot when provided", () => {
    const wrapper = mount(SplitLayout, {
      slots: {
        header: "<div>App header</div>",
        side: "<nav>Nav</nav>",
        default: "<p>Content</p>",
      },
    });
    expect(wrapper.html()).toContain("App header");
    expect(wrapper.find("header").exists()).toBe(true);
  });

  it("does not render header element when header slot is omitted", () => {
    const wrapper = layoutOf();
    expect(wrapper.find("header").exists()).toBe(false);
  });

  it("applies the gap class when gap is not 'none'", () => {
    const root = layoutOf({ gap: "lg" }).findAll("div")[1]!;
    expect(root.classes()).toEqual(expect.arrayContaining(["gap-4", "sm:gap-6"]));
  });

  it("applies no gap class when gap is 'none'", () => {
    const root = layoutOf({ gap: "none" }).findAll("div")[1]!;
    expect(root.classes()).not.toContain("gap-3");
    expect(root.classes()).not.toContain("sm:gap-4");
  });

  it("places the side panel on the right when side is 'right'", () => {
    const wrapper = layoutOf({ side: "right" });
    const row = wrapper.findAll("div")[1]!;
    expect(row.classes()).toContain("flex-row-reverse");
  });

  it("wraps when the container is too narrow for both panels", () => {
    const wrapper = layoutOf();
    const row = wrapper.findAll("div")[1]!;
    expect(row.classes()).toContain("flex");
    expect(row.attributes("style") ?? "").toContain("wrap");
  });

  it("gives the content area overflow-y-auto", () => {
    const wrapper = layoutOf();
    const content = wrapper.findAll("div")[3]!;
    expect(content.classes()).toContain("overflow-y-auto");
  });
});
