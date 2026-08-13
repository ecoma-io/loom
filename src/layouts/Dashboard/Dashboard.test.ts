import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Dashboard from "./Dashboard.vue";

function dashboardOf(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(Dashboard, {
    props,
    slots: { default: "<div>tile</div>", ...slots },
  });
}

describe("Dashboard", () => {
  it("renders with default slot content", () => {
    const wrapper = dashboardOf();
    expect(wrapper.text()).toContain("tile");
  });

  it("applies minTileWidth as grid-template-columns style", () => {
    const style = dashboardOf({ minTileWidth: "14rem" }).find(".grid").attributes("style") ?? "";

    expect(style).toContain("auto-fit");
    expect(style).toContain("14rem");
  });

  it("floors the tile at the container width so a tile never forces horizontal overflow", () => {
    const style = dashboardOf({ minTileWidth: "40rem" }).find(".grid").attributes("style") ?? "";
    expect(style).toContain("min(100%, 40rem)");
  });

  it("applies gap classes matching the gap prop", () => {
    const grid = dashboardOf({ gap: "lg" }).find(".grid");
    expect(grid.classes()).toEqual(expect.arrayContaining(["gap-4", "sm:gap-6"]));

    const gridSm = dashboardOf({ gap: "sm" }).find(".grid");
    expect(gridSm.classes()).toEqual(expect.arrayContaining(["gap-2", "sm:gap-3"]));
  });

  it("defaults to the md gap step", () => {
    const grid = dashboardOf().find(".grid");
    expect(grid.classes()).toEqual(expect.arrayContaining(["gap-3", "sm:gap-4"]));
  });

  it("renders header slot when provided", () => {
    const wrapper = dashboardOf({}, { header: "<nav>header</nav>" });
    expect(wrapper.find("header").text()).toContain("header");
  });

  it("does not render a header element when the header slot is absent", () => {
    const wrapper = dashboardOf();
    expect(wrapper.find("header").exists()).toBe(false);
  });

  it("renders sidebar slot when provided", () => {
    const wrapper = dashboardOf({}, { sidebar: "<nav>sidebar</nav>" });
    expect(wrapper.find("aside").text()).toContain("sidebar");
  });

  it("does not render a sidebar element when the sidebar slot is absent", () => {
    const wrapper = dashboardOf();
    // Only the aside slot renders a second <aside>; with neither sidebar nor
    // aside, there should be zero <aside> elements.
    expect(wrapper.findAll("aside").length).toBe(0);
  });

  it("renders aside slot when provided", () => {
    const wrapper = dashboardOf({}, { aside: "<div>metrics</div>" });
    // The aside is hidden below 2xl, but the element is present in the DOM.
    const asides = wrapper.findAll("aside");
    const metricsAside = asides.find((el) => el.text().includes("metrics"));
    expect(metricsAside).toBeDefined();
    expect(metricsAside!.classes()).toContain("2xl:block");
  });
});
