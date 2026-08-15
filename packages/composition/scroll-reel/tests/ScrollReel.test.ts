import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ScrollReel from "../src/ScrollReel.vue";

function reelOf(props: Record<string, unknown> = {}) {
  return mount(ScrollReel, {
    props,
    slots: { default: "<div>item</div>" },
  });
}

describe("ScrollReel", () => {
  it("lays its children out in a horizontal row that scrolls when content overflows", () => {
    const root = reelOf().get("div");
    expect(root.classes()).toContain("flex");
    expect(root.classes()).toContain("flex-row");
    expect(root.classes()).toContain("overflow-x-auto");
  });

  it("applies scroll-snap alignment by default", () => {
    const classes = reelOf().get("div").classes();
    expect(classes).toContain("snap-x");
    expect(classes).toContain("snap-mandatory");
    expect(classes).toContain("snap-start");
  });

  it("applies center snap alignment when snap is 'center'", () => {
    const classes = reelOf({ snap: "center" }).get("div").classes();
    expect(classes).toContain("snap-center");
  });

  it("removes snap classes when snap is 'none'", () => {
    const classes = reelOf({ snap: "none" }).get("div").classes();
    expect(classes).not.toContain("snap-x");
    expect(classes).not.toContain("snap-mandatory");
  });

  it("tightens the gutter one step below the sm breakpoint", () => {
    expect(reelOf({ gap: "lg" }).get("div").classes()).toEqual(
      expect.arrayContaining(["gap-4", "sm:gap-6"]),
    );
    expect(reelOf({ gap: "sm" }).get("div").classes()).toEqual(
      expect.arrayContaining(["gap-2", "sm:gap-3"]),
    );
  });

  it("defaults to the md gap step and start snap", () => {
    const classes = reelOf().get("div").classes();
    expect(classes).toEqual(expect.arrayContaining(["gap-3", "sm:gap-4"]));
    expect(classes).toContain("snap-start");
  });

  it("is keyboard-focusable so arrow keys can navigate between snap points", () => {
    expect(reelOf().get("div").attributes("tabindex")).toBe("0");
  });

  it("identifies itself as a scrollable region for assistive technology", () => {
    const root = reelOf().get("div");
    expect(root.attributes("role")).toBe("region");
    expect(root.attributes("aria-label")).toBeTruthy();
  });
});
