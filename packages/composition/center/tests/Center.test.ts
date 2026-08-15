import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Center from "../src/Center.vue";

function centerOf(props: Record<string, unknown> = {}) {
  return mount(Center, { props, slots: { default: "<p>content</p>" } }).get("div");
}

describe("Center", () => {
  it("centers itself horizontally with mx-auto", () => {
    expect(centerOf().classes()).toContain("mx-auto");
  });

  it("applies the max-width class matching the maxWidth prop", () => {
    expect(centerOf({ maxWidth: "sm" }).classes()).toContain("max-w-sm");
    expect(centerOf({ maxWidth: "xl" }).classes()).toContain("max-w-xl");
    expect(centerOf({ maxWidth: "prose" }).classes()).toContain("max-w-prose");
  });

  it("defaults to the lg max-width", () => {
    expect(centerOf().classes()).toContain("max-w-lg");
  });

  it("adds gutters that widen at wider breakpoints by default", () => {
    const classes = centerOf().classes();
    expect(classes).toContain("px-4");
    expect(classes).toContain("sm:px-6");
    expect(classes).toContain("3xl:px-8");
  });

  it("omits gutters when gutter is false", () => {
    const classes = centerOf({ gutter: false }).classes();
    expect(classes).not.toContain("px-4");
    expect(classes).not.toContain("sm:px-6");
  });
});
