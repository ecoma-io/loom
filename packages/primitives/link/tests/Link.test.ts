import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Link from "../src/Link.vue";

describe("Link", () => {
  it("renders an anchor that points to the supplied destination", () => {
    const wrapper = mount(Link, {
      props: { href: "/guides" },
      slots: { default: "Guides" },
    });

    expect((wrapper.element as HTMLElement).tagName).toBe("A");
    expect(wrapper.attributes("href")).toBe("/guides");
  });

  it("applies the default underline and the muted variant colour", () => {
    const defaultLink = mount(Link, { props: { href: "/default" } });
    const mutedLink = mount(Link, {
      props: { href: "/muted", variant: "muted" },
    });

    expect(defaultLink.classes()).toContain("underline");
    expect(mutedLink.classes()).toContain("text-muted-foreground");
  });

  it("removes the underline when underline is false", () => {
    const wrapper = mount(Link, {
      props: { href: "/plain", underline: false },
    });

    expect(wrapper.classes()).toContain("no-underline");
    expect(wrapper.classes()).not.toContain("underline");
  });

  it("opens external destinations in a protected new tab", () => {
    const wrapper = mount(Link, {
      props: { href: "https://example.com", external: true },
    });

    expect(wrapper.attributes("target")).toBe("_blank");
    expect(wrapper.attributes("rel")).toBe("noopener noreferrer");
  });

  it("shows an external-link icon for external destinations", () => {
    const wrapper = mount(Link, {
      props: { href: "https://example.com", external: true },
    });

    expect(wrapper.find("svg").exists()).toBe(true);
    expect(wrapper.get("svg").attributes("aria-hidden")).toBe("true");
  });

  it("renders an aria-disabled span instead of an anchor when unavailable", () => {
    const wrapper = mount(Link, {
      props: { href: "/unavailable", disabled: true },
      slots: { default: "Unavailable" },
    });

    expect((wrapper.element as HTMLElement).tagName).toBe("SPAN");
    expect(wrapper.attributes("aria-disabled")).toBe("true");
    expect(wrapper.find("a").exists()).toBe(false);
  });

  it("keeps same-context links free of external browsing attributes", () => {
    const wrapper = mount(Link, {
      props: { href: "/about", external: false },
    });

    expect(wrapper.attributes("target")).toBeUndefined();
    expect(wrapper.attributes("rel")).toBeUndefined();
  });

  it("uses the primary text token for the default variant", () => {
    const wrapper = mount(Link, { props: { href: "/home" } });

    expect(wrapper.classes()).toContain("text-primary-text");
  });

  it("merges an extra class onto the rendered element", () => {
    const wrapper = mount(Link, {
      props: { href: "/custom" },
      attrs: { class: "font-bold" },
    });

    expect(wrapper.classes()).toContain("font-bold");
  });
});
