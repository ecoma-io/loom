import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Sidebar from "../src/Sidebar.vue";

function sidebarOf(props: Record<string, unknown> = {}) {
  return mount(Sidebar, {
    props,
    slots: { default: "<p>content</p>", side: "<p>nav</p>" },
  });
}

describe("Sidebar", () => {
  it("renders a flex container that wraps, so the two panels stack when the container is too narrow", () => {
    const root = sidebarOf().find("div");
    expect(root.classes()).toContain("flex");
    expect(root.attributes("style") ?? "").toContain("wrap");
  });

  it("places the sidebar on the left by default", () => {
    expect(sidebarOf().find("div").classes()).toContain("flex-row");
  });

  it("places the sidebar on the right when side is 'right'", () => {
    expect(sidebarOf({ side: "right" }).find("div").classes()).toContain("flex-row-reverse");
  });

  it("gives the sidebar its preferred width as flex-basis, but does not let it grow", () => {
    const panel = sidebarOf({ sideWidth: "20rem" }).findAll("div")[1]!;
    const style = panel.attributes("style") ?? "";
    // Vue collapses flex properties into shorthand: `flex: 0 1 20rem`.
    expect(style).toContain("20rem");
    expect(style).toContain("flex: 0 1");
  });

  it("lets the sidebar shrink, so it can accommodate a narrower container before wrapping", () => {
    const panel = sidebarOf().findAll("div")[1]!;
    const style = panel.attributes("style") ?? "";
    // `flex-shrink: 1` appears in the shorthand: `flex: 0 1 16rem`.
    expect(style).toMatch(/flex:\s*0\s+1/);
  });

  it("lets the content area grow to fill all remaining space", () => {
    const content = sidebarOf().findAll("div")[2]!;
    const style = content.attributes("style") ?? "";
    // `flex-grow: 999` appears in the shorthand: `flex: 999 1 0`.
    expect(style).toMatch(/flex:\s*999/);
  });

  it("demands the contentMin percentage for content before the layout wraps", () => {
    const content = sidebarOf({ contentMin: "60%" }).findAll("div")[2]!;
    const style = content.attributes("style") ?? "";
    expect(style).toContain("60%");
  });

  it("applies the responsive gap class by default", () => {
    const root = sidebarOf().find("div");
    expect(root.classes()).toEqual(expect.arrayContaining(["gap-3", "sm:gap-4"]));
  });

  it("omits the gap class when gap is false", () => {
    const root = sidebarOf({ gap: false }).find("div");
    expect(root.classes()).not.toContain("gap-3");
  });

  it("defaults to left side, 16rem width, 50% content min, with gap", () => {
    const root = sidebarOf().find("div");
    expect(root.classes()).toContain("flex-row");
    const panel = sidebarOf().findAll("div")[1]!;
    expect(panel.attributes("style") ?? "").toContain("16rem");
  });
});
