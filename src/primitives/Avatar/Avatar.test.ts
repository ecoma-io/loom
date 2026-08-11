import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Avatar, { type AvatarSize } from "./Avatar.vue";

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

  it("marks an agent avatar with a rim as well as a colour, so the force survives greyscale", () => {
    const agent = mount(Avatar, { props: { fallback: "OP", force: "ai" } });
    expect(agent.classes()).toEqual(expect.arrayContaining(["border-2", "border-agent"]));

    const person = mount(Avatar, { props: { fallback: "AL" } });
    expect(person.classes()).not.toContain("border-agent");
    expect(person.classes()).toContain("bg-muted");
  });

  it("names the agent force for a screen reader, so it is never carried by the rim alone", () => {
    const agent = mount(Avatar, { props: { fallback: "OP", alt: "Opus", force: "ai" } });
    expect(agent.get(".sr-only").text()).toBe("AI agent");
  });

  it("takes a localised agent label", () => {
    const agent = mount(Avatar, {
      props: { fallback: "OP", force: "ai", agentLabel: "Tác nhân AI" },
    });
    expect(agent.get(".sr-only").text()).toBe("Tác nhân AI");
  });

  it("drops the hidden label when it is cleared, so a wrapper that names the force itself leaves no second copy", () => {
    const agent = mount(Avatar, { props: { fallback: "OP", force: "ai", agentLabel: "" } });
    expect(agent.find(".sr-only").exists()).toBe(false);
    expect(agent.classes()).toContain("border-agent");
  });

  it("says nothing extra for a person, so a human avatar announces only who it is", () => {
    const person = mount(Avatar, { props: { fallback: "AL", alt: "Ada Lovelace" } });
    expect(person.find(".sr-only").exists()).toBe(false);
  });

  it("reports its force as a data attribute, defaulting to human", () => {
    expect(mount(Avatar, { props: { fallback: "AL" } }).attributes("data-force")).toBe("human");
    expect(mount(Avatar, { props: { fallback: "OP", force: "ai" } }).attributes("data-force")).toBe(
      "ai",
    );
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
