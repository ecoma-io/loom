import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Avatar, { type AvatarSize } from "../src/Avatar.vue";

describe("Avatar", () => {
  it("renders the fallback initials when no src is given", () => {
    const wrapper = mount(Avatar, { props: { fallback: "AL" } });
    expect(wrapper.text()).toContain("AL");
  });

  it("sizes the root element per the size prop", () => {
    const sm = mount(Avatar, { props: { fallback: "AL", size: "sm" } });
    expect(sm.classes()).toEqual(expect.arrayContaining(["h-8", "w-8"]));

    const lg = mount(Avatar, { props: { fallback: "AL", size: "lg" } });
    expect(lg.classes()).toEqual(expect.arrayContaining(["h-12", "w-12"]));
  });

  it("defaults to md when no size is given", () => {
    const wrapper = mount(Avatar, { props: { fallback: "AL" } });
    expect(wrapper.classes()).toEqual(expect.arrayContaining(["h-10", "w-10"]));
  });

  it("keeps every size square, so a circle is never an ellipse", () => {
    const heights: readonly (readonly [AvatarSize, string])[] = [
      ["xs", "6"],
      ["sm", "8"],
      ["md", "10"],
      ["lg", "12"],
      ["xl", "16"],
    ];
    for (const [size, step] of heights) {
      const wrapper = mount(Avatar, { props: { fallback: "AL", size } });
      expect(wrapper.classes()).toEqual(expect.arrayContaining([`h-${step}`, `w-${step}`]));
    }
  });

  it("rounds a circle the same way at every size", () => {
    for (const size of ["xs", "sm", "md", "lg", "xl"] as const) {
      const wrapper = mount(Avatar, { props: { fallback: "AL", size, shape: "circle" } });
      expect(wrapper.classes()).toContain("rounded-full");
    }
  });

  it("steps a square's corner with its size rather than holding one control radius", () => {
    const radii: readonly (readonly [AvatarSize, string])[] = [
      ["xs", "rounded-sm"],
      ["sm", "rounded-md"],
      ["md", "rounded-md"],
      ["lg", "rounded-lg"],
      ["xl", "rounded-xl"],
    ];
    for (const [size, radius] of radii) {
      const wrapper = mount(Avatar, { props: { fallback: "AL", size, shape: "square" } });
      expect(wrapper.classes()).toContain(radius);
      expect(wrapper.classes()).not.toContain("rounded-full");
    }
  });

  it("stays a circle when no shape is given, which is what every existing caller gets", () => {
    const wrapper = mount(Avatar, { props: { fallback: "AL" } });
    expect(wrapper.classes()).toContain("rounded-full");
  });

  it("marks an accent avatar with a rim as well as a colour, so the variant survives greyscale", () => {
    const accent = mount(Avatar, { props: { fallback: "OP", variant: "accent" } });
    expect(accent.classes()).toEqual(expect.arrayContaining(["border-2", "border-accent"]));

    const person = mount(Avatar, { props: { fallback: "AL" } });
    expect(person.classes()).not.toContain("border-accent");
    expect(person.classes()).toContain("bg-muted");
  });

  it("names an accent avatar for a screen reader by default, so the distinction never rests on the hue alone", () => {
    // No accentLabel → the docs' "Accent" default applies; an unlabelled
    // accent avatar must still be distinguishable from a default one.
    const accent = mount(Avatar, { props: { fallback: "OP", alt: "Opus", variant: "accent" } });
    expect(accent.get(".sr-only").text()).toBe("Accent");
  });

  it("takes a localised accent label", () => {
    const accent = mount(Avatar, {
      props: { fallback: "OP", variant: "accent", accentLabel: "Nhấn mạnh" },
    });
    expect(accent.get(".sr-only").text()).toBe("Nhấn mạnh");
  });

  it("drops the hidden label when it is cleared, so a wrapper that names the variant itself leaves no second copy", () => {
    const accent = mount(Avatar, { props: { fallback: "OP", variant: "accent", accentLabel: "" } });
    expect(accent.find(".sr-only").exists()).toBe(false);
    expect(accent.classes()).toContain("border-accent");
  });

  it("says nothing extra for a default avatar, so a person's avatar announces only who it is", () => {
    const person = mount(Avatar, { props: { fallback: "AL", alt: "Ada Lovelace" } });
    expect(person.find(".sr-only").exists()).toBe(false);
  });

  it("reports its variant as a data attribute, defaulting to default", () => {
    expect(mount(Avatar, { props: { fallback: "AL" } }).attributes("data-variant")).toBe("default");
    expect(
      mount(Avatar, { props: { fallback: "OP", variant: "accent" } }).attributes("data-variant"),
    ).toBe("accent");
  });

  it("gives the image the alt it was passed, so the photo announces its subject", () => {
    const wrapper = mount(Avatar, {
      props: { src: "/ada.jpg", alt: "Ada Lovelace", fallback: "AL" },
    });
    expect(wrapper.get("img").attributes("alt")).toBe("Ada Lovelace");
  });

  it("merges a consumer class over its own utility instead of appending beside it", () => {
    const wrapper = mount(Avatar, {
      props: { fallback: "AL" },
      attrs: { class: "bg-subtle" },
    });
    expect(wrapper.classes()).toContain("bg-subtle");
    expect(wrapper.classes()).not.toContain("bg-muted");
  });

  it("lands every other fallthrough attribute on the root", () => {
    const wrapper = mount(Avatar, {
      props: { fallback: "AL" },
      attrs: { "data-testid": "assignee", "aria-hidden": "true" },
    });
    expect(wrapper.attributes("data-testid")).toBe("assignee");
    expect(wrapper.attributes("aria-hidden")).toBe("true");
  });
});
