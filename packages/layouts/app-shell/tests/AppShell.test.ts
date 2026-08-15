import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AppShell from "../src/AppShell.vue";

function shellOf(props: Record<string, unknown> = {}) {
  return mount(AppShell, {
    props,
    slots: {
      sidebar: "<nav>Sidebar nav</nav>",
      default: "<p>Content</p>",
    },
  });
}

describe("AppShell", () => {
  it("renders the component with default slot content", () => {
    const wrapper = mount(AppShell, {
      slots: { default: "<p>Content</p>" },
    });
    expect(wrapper.html()).toContain("Content");
  });

  it("renders the sidebar slot when provided", () => {
    const wrapper = shellOf();
    expect(wrapper.html()).toContain("Sidebar nav");
  });

  it("renders the header slot when provided", () => {
    const wrapper = mount(AppShell, {
      slots: {
        sidebar: "<nav>Nav</nav>",
        header: "<div>Header</div>",
        default: "<p>Content</p>",
      },
    });
    expect(wrapper.html()).toContain("Header");
  });

  it("applies the sidebar width style matching the sidebarWidth prop", () => {
    const sm = shellOf({ sidebarWidth: "sm" });
    expect(sm.find("aside").attributes("style")).toContain("12rem");

    const lg = shellOf({ sidebarWidth: "lg" });
    expect(lg.find("aside").attributes("style")).toContain("20rem");
  });

  it("defaults to md sidebar width", () => {
    const wrapper = shellOf();
    expect(wrapper.find("aside").attributes("style")).toContain("16rem");
  });

  it("has both sidebar and content areas", () => {
    const wrapper = shellOf();
    expect(wrapper.find("aside").exists()).toBe(true);
    expect(wrapper.find("aside + div").exists()).toBe(true);
  });
});
