import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Reading from "./Reading.vue";

function readingOf(props: Record<string, unknown> = {}) {
  return mount(Reading, {
    props,
    slots: { default: "<p>Article content</p>" },
  });
}

describe("Reading", () => {
  it("renders with default slot content", () => {
    const wrapper = mount(Reading, { slots: { default: "<p>Article content</p>" } });
    expect(wrapper.html()).toContain("Article content");
  });

  it("content wrapper has max-w-prose class", () => {
    const wrapper = readingOf();
    // The content wrapper is the div carrying max-w-prose — not the root, not
    // the header, not the footer.
    const content = wrapper.findAll("div").find((d) => d.classes().includes("max-w-prose"))!;
    expect(content).toBeDefined();
  });

  it("adds gutters by default (px-4, sm:px-6, 3xl:px-8)", () => {
    const wrapper = readingOf();
    const content = wrapper.findAll("div").find((d) => d.classes().includes("max-w-prose"))!;
    const classes = content.classes();
    expect(classes).toContain("px-4");
    expect(classes).toContain("sm:px-6");
    expect(classes).toContain("3xl:px-8");
  });

  it("omits gutters when gutter is false", () => {
    const wrapper = readingOf({ gutter: false });
    const content = wrapper.findAll("div").find((d) => d.classes().includes("max-w-prose"))!;
    const classes = content.classes();
    expect(classes).not.toContain("px-4");
    expect(classes).not.toContain("sm:px-6");
    expect(classes).not.toContain("3xl:px-8");
  });

  it("renders header and footer slots when provided", () => {
    const wrapper = mount(Reading, {
      slots: {
        header: "<nav>Site header</nav>",
        default: "<p>Article content</p>",
        footer: "<small>Site footer</small>",
      },
    });
    expect(wrapper.html()).toContain("Site header");
    expect(wrapper.html()).toContain("Site footer");
    expect(wrapper.find("header").exists()).toBe(true);
    expect(wrapper.find("footer").exists()).toBe(true);
  });

  it("content wrapper has mx-auto for centering", () => {
    const wrapper = readingOf();
    const content = wrapper.findAll("div").find((d) => d.classes().includes("max-w-prose"))!;
    expect(content.classes()).toContain("mx-auto");
  });
});
