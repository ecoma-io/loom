import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Breadcrumb from "../src/Breadcrumb.vue";

const trail = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Loom" },
];

describe("Breadcrumb", () => {
  it("renders a nav with aria-label Breadcrumb", () => {
    const wrapper = mount(Breadcrumb, { props: { items: trail } });
    const nav = wrapper.find("nav");
    expect(nav.exists()).toBe(true);
    expect(nav.attributes("aria-label")).toBe("Breadcrumb");
  });

  it("renders an ordered list", () => {
    const wrapper = mount(Breadcrumb, { props: { items: trail } });
    expect(wrapper.find("ol").exists()).toBe(true);
  });

  it("renders each item with its label", () => {
    const wrapper = mount(Breadcrumb, { props: { items: trail } });
    const text = wrapper.text();
    for (const item of trail) {
      expect(text).toContain(item.label);
    }
  });

  it("renders ancestor items as links and the last item as a static span, because the last item is always the current page", () => {
    const wrapper = mount(Breadcrumb, { props: { items: trail } });
    const links = wrapper.findAll("a");
    const spans = wrapper.findAll("span[aria-current]");
    expect(links).toHaveLength(2);
    expect(spans).toHaveLength(1);
  });

  it("renders the last item as a span even when it carries an href, because position determines the current page", () => {
    const trailWithHref = [
      { label: "Home", href: "/" },
      { label: "Current", href: "/current" },
    ];
    const wrapper = mount(Breadcrumb, { props: { items: trailWithHref } });
    // Last item is always current page regardless of href
    expect(wrapper.findAll("a")).toHaveLength(1);
    expect(wrapper.find("span[aria-current]").exists()).toBe(true);
    expect(wrapper.find("span[aria-current]").text()).toBe("Current");
  });

  it("marks the last item as the current page", () => {
    const wrapper = mount(Breadcrumb, { props: { items: trail } });
    const current = wrapper.find("span[aria-current]");
    expect(current.attributes("aria-current")).toBe("page");
    expect(current.text()).toBe("Loom");
  });

  it("renders separators between items and hides them from assistive tech", () => {
    const wrapper = mount(Breadcrumb, { props: { items: trail } });
    const separators = wrapper.findAll("li[aria-hidden]");
    // 3 items means 2 separators
    expect(separators).toHaveLength(2);
    for (const sep of separators) {
      expect(sep.attributes("aria-hidden")).toBe("true");
    }
  });

  it("applies the correct separator character for text separators", () => {
    const wrapper = mount(Breadcrumb, { props: { items: trail, separator: ">" } });
    const separators = wrapper.findAll("li[aria-hidden]");
    for (const sep of separators) {
      expect(sep.text()).toBe(">");
    }
  });

  it("renders an SVG when the separator is chevron", () => {
    const wrapper = mount(Breadcrumb, { props: { items: trail, separator: "chevron" } });
    const svg = wrapper.find("li[aria-hidden] svg");
    expect(svg.exists()).toBe(true);
  });

  it("sets the correct href on link items", () => {
    const wrapper = mount(Breadcrumb, { props: { items: trail } });
    const links = wrapper.findAll("a");
    expect(links[0]!.attributes("href")).toBe("/");
    expect(links[1]!.attributes("href")).toBe("/products");
  });

  it("applies font-medium to the current page item", () => {
    const wrapper = mount(Breadcrumb, { props: { items: trail } });
    const current = wrapper.find("span[aria-current]");
    expect(current.classes()).toContain("font-medium");
  });
});
