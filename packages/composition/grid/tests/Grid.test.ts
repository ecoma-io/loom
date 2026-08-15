import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Grid from "../src/Grid.vue";

function gridOf(props: Record<string, unknown> = {}) {
  return mount(Grid, { props, slots: { default: "<div>cell</div>" } }).get("div");
}

describe("Grid", () => {
  it("derives the column count from the container's own width, so the same grid reflows inside a narrowed panel and full-bleed alike", () => {
    const style = gridOf({ minColWidth: "14rem" }).attributes("style") ?? "";

    // `auto-fit` + `minmax` rather than fixed `grid-cols-N` breakpoints.
    expect(style).toContain("auto-fit");
    expect(style).toContain("14rem");
  });

  it("floors the track at the container width so a cell never forces horizontal overflow on a container narrower than minColWidth", () => {
    const style = gridOf({ minColWidth: "40rem" }).attributes("style") ?? "";
    expect(style).toContain("min(100%, 40rem)");
  });

  it("tightens the gutter one step below the sm breakpoint, where the grid is single-column and the air buys no separation", () => {
    expect(gridOf({ gap: "lg" }).classes()).toEqual(expect.arrayContaining(["gap-4", "sm:gap-6"]));
    expect(gridOf({ gap: "sm" }).classes()).toEqual(expect.arrayContaining(["gap-2", "sm:gap-3"]));
  });

  it("defaults to the md gap step and a 16rem column floor, so a host that passes nothing still gets the documented grid", () => {
    const grid = gridOf();
    expect(grid.classes()).toEqual(expect.arrayContaining(["gap-3", "sm:gap-4"]));
    expect(grid.attributes("style") ?? "").toContain("min(100%, 16rem)");
  });
});
