import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Inline from "../src/Inline.vue";

function inlineOf(props: Record<string, unknown> = {}) {
  return mount(Inline, { props, slots: { default: "<span>item</span>" } }).get("div");
}

describe("Inline", () => {
  it("lays its children out in a horizontal row, not a column", () => {
    const classes = inlineOf().classes();
    expect(classes).toContain("flex");
    expect(classes).toContain("flex-row");
  });

  it("wraps by default, so items that exceed the container width move to the next line rather than overflowing", () => {
    expect(inlineOf().classes()).toContain("flex-wrap");
  });

  it("can disable wrapping when items must stay on a single line", () => {
    expect(inlineOf({ wrap: false }).classes()).toContain("flex-nowrap");
  });

  it("tightens the gutter one step below the sm breakpoint, where the air buys no separation between wrapped items", () => {
    expect(inlineOf({ gap: "lg" }).classes()).toEqual(
      expect.arrayContaining(["gap-4", "sm:gap-6"]),
    );
    expect(inlineOf({ gap: "sm" }).classes()).toEqual(
      expect.arrayContaining(["gap-2", "sm:gap-3"]),
    );
  });

  it("defaults to the md gap step, so a host that passes nothing still gets the documented spacing", () => {
    expect(inlineOf().classes()).toEqual(expect.arrayContaining(["gap-3", "sm:gap-4"]));
  });

  it("aligns children along the cross axis as requested", () => {
    expect(inlineOf({ align: "start" }).classes()).toContain("items-start");
    expect(inlineOf({ align: "center" }).classes()).toContain("items-center");
    expect(inlineOf({ align: "end" }).classes()).toContain("items-end");
    expect(inlineOf({ align: "baseline" }).classes()).toContain("items-baseline");
  });

  it("stretches children to the row's full height by default", () => {
    expect(inlineOf().classes()).toContain("items-stretch");
  });
});
