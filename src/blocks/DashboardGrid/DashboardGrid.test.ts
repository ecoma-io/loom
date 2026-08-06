import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import DashboardGrid from "./DashboardGrid.vue";

// No primitive collaborators to mock: DashboardGrid renders one `div` and a
// default slot, so its own logic — the grid-template-columns expression and
// the gap step lookup — is everything there is to isolate.
function gridOf(props: Record<string, unknown> = {}) {
  return mount(DashboardGrid, { props, slots: { default: "<div>panel</div>" } }).get("div");
}

describe("DashboardGrid", () => {
  it("derives the column count from the container's own width, so the same grid reflows inside a narrowed panel and full-bleed alike", () => {
    const style = gridOf({ minTileWidth: "14rem" }).attributes("style") ?? "";

    // `auto-fit` + `minmax` rather than fixed `grid-cols-N` breakpoints: a
    // fixed count needs one breakpoint per host viewport and is already wrong
    // the moment the grid sits in a sidebar narrower than the viewport.
    expect(style).toContain("auto-fit");
    expect(style).toContain("14rem");
  });

  it("floors the track at the container width so a tile never forces horizontal overflow on a container narrower than minTileWidth", () => {
    const style = gridOf({ minTileWidth: "40rem" }).attributes("style") ?? "";
    expect(style).toContain("min(100%, 40rem)");
  });

  it("tightens the gutter one step below the sm breakpoint, where the grid is single-column and the air buys no separation", () => {
    // The value each step documents applies from `sm` up; below it every step
    // drops a notch, because on a phone a 24px gutter between stacked tiles
    // only pushes the second tile off screen.
    expect(gridOf({ gap: "lg" }).classes()).toEqual(expect.arrayContaining(["gap-4", "sm:gap-6"]));
    expect(gridOf({ gap: "sm" }).classes()).toEqual(expect.arrayContaining(["gap-2", "sm:gap-3"]));
  });

  it("defaults to the md gutter step and a 16rem tile floor, so a host that passes nothing still gets the documented grid", () => {
    const grid = gridOf();
    expect(grid.classes()).toEqual(expect.arrayContaining(["gap-3", "sm:gap-4"]));
    expect(grid.attributes("style") ?? "").toContain("min(100%, 16rem)");
  });
});
