import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Avatar from "./Avatar.vue";

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
});
