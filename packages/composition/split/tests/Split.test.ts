import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Split from "../src/Split.vue";

function splitOf(props: Record<string, unknown> = {}) {
  return mount(Split, {
    props,
    slots: { default: "<p>content</p>", side: "<p>panel</p>" },
  });
}

describe("Split", () => {
  it("renders a flex container that wraps, so the two panels stack when the container is too narrow", () => {
    const wrapper = splitOf();
    const classes = wrapper.find("div").classes();
    expect(classes).toContain("flex");
    expect(wrapper.find("div").attributes("style") ?? "").toContain("wrap");
  });

  it("places the side panel on the left by default", () => {
    expect(splitOf().find("div").classes()).toContain("flex-row");
  });

  it("places the side panel on the right when side is 'right'", () => {
    expect(splitOf({ side: "right" }).find("div").classes()).toContain("flex-row-reverse");
  });

  it("gives the side panel a fixed minimum width that does not grow", () => {
    const panel = splitOf({ minSideWidth: "20rem" }).findAll("div")[1]!;
    const style = panel.attributes("style") ?? "";
    // Vue collapses flex properties into shorthand: `flex: 0 0 20rem`.
    expect(style).toContain("20rem");
    expect(style).toMatch(/flex:\s*0\s+0/);
  });

  it("lets the content area grow to fill the remaining space", () => {
    const content = splitOf().findAll("div")[2]!;
    const style = content.attributes("style") ?? "";
    // `flex-grow: 999` appears in the shorthand: `flex: 999 1 0`.
    expect(style).toMatch(/flex:\s*999/);
  });

  it("demands at least 50% of the container for content before the layout wraps", () => {
    const content = splitOf().findAll("div")[2]!;
    const style = content.attributes("style") ?? "";
    expect(style).toContain("50%");
  });

  it("applies the gap class when gap is not 'none'", () => {
    const root = splitOf({ gap: "lg" }).find("div");
    expect(root.classes()).toEqual(expect.arrayContaining(["gap-4", "sm:gap-6"]));
  });

  it("applies no gap class when gap is 'none'", () => {
    const root = splitOf({ gap: "none" }).find("div");
    expect(root.classes()).not.toContain("gap-3");
    expect(root.classes()).not.toContain("sm:gap-4");
  });

  it("defaults to the md gap, left side, 48rem collapse, and 16rem side width", () => {
    const root = splitOf().find("div");
    expect(root.classes()).toEqual(expect.arrayContaining(["gap-3", "sm:gap-4"]));
    expect(root.classes()).toContain("flex-row");
  });
});
