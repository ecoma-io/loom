import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Skeleton from "./Skeleton.vue";

describe("Skeleton", () => {
  it("hides itself from assistive tech — the wait is announced by a live region elsewhere, never by placeholder shapes", () => {
    const wrapper = mount(Skeleton);
    expect(wrapper.attributes("aria-hidden")).toBe("true");
    expect(wrapper.text()).toBe("");
  });

  it("shapes the placeholder per variant so it stands in for the real element: a text line, a round avatar, a card block", () => {
    const shapes = [
      ["text", "h-4"],
      ["circle", "rounded-full"],
      ["rect", "rounded-md"],
    ] as const;
    for (const [variant, cls] of shapes) {
      expect(mount(Skeleton, { props: { variant } }).classes()).toContain(cls);
    }
  });

  it("defaults to the text line, the shape most loading rows need, and never to a fixed-height block", () => {
    const classes = mount(Skeleton).classes();
    expect(classes).toContain("h-4");
    expect(classes).toContain("rounded");
    expect(classes).not.toContain("rounded-full");
  });

  it("carries the shimmer sweep on every variant so a loading page reads as coming, not frozen", () => {
    for (const variant of ["text", "circle", "rect"] as const) {
      const classes = mount(Skeleton, { props: { variant } }).classes();
      expect(classes).toContain("animate-shimmer");
      expect(classes).toContain("bg-muted");
    }
  });

  it("lets the caller own width and height — the placeholder must match a known layout, so sizing stays a passthrough class", () => {
    const wrapper = mount(Skeleton, {
      props: { variant: "circle" },
      attrs: { class: "h-10 w-10" },
    });
    const classes = wrapper.classes();
    expect(classes).toContain("h-10");
    expect(classes).toContain("w-10");
    expect(classes).toContain("rounded-full");
  });
});
