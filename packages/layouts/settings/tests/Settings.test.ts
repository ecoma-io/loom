import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Settings from "../src/Settings.vue";

function settingsOf(props: Record<string, unknown> = {}) {
  return mount(Settings, {
    props,
    slots: {
      nav: "<ul><li>General</li></ul>",
      default: "<p>Content</p>",
    },
  });
}

describe("Settings", () => {
  it("renders with both nav and content slots", () => {
    const wrapper = settingsOf();
    expect(wrapper.html()).toContain("General");
    expect(wrapper.html()).toContain("Content");
  });

  it("applies navWidth as inline style on the nav panel", () => {
    const wrapper = settingsOf({ navWidth: "16rem" });
    expect(wrapper.find("nav").attributes("style")).toContain("16rem");
  });

  it('defaults navWidth to "12rem"', () => {
    const wrapper = settingsOf();
    expect(wrapper.find("nav").attributes("style")).toContain("12rem");
  });

  it("renders the header slot when provided", () => {
    const wrapper = mount(Settings, {
      slots: {
        header: "<div>Settings header</div>",
        nav: "<ul><li>General</li></ul>",
        default: "<p>Content</p>",
      },
    });
    expect(wrapper.html()).toContain("Settings header");
  });

  it("does not render the header element when the slot is empty", () => {
    const wrapper = settingsOf();
    expect(wrapper.find("header").exists()).toBe(false);
  });

  it("content area scrolls independently", () => {
    const wrapper = settingsOf();
    const content = wrapper.find("nav + div");
    expect(content.classes()).toContain("overflow-y-auto");
  });
});
