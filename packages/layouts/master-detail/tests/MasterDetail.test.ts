import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import MasterDetail from "../src/MasterDetail.vue";

function layoutOf(props: Record<string, unknown> = {}) {
  return mount(MasterDetail, {
    props,
    slots: { default: "<p>Detail content</p>", master: "<nav>Master list</nav>" },
  });
}

describe("MasterDetail", () => {
  it("renders with both master and detail slots", () => {
    const wrapper = layoutOf();
    expect(wrapper.html()).toContain("Master list");
    expect(wrapper.html()).toContain("Detail content");
  });

  it("applies minMasterWidth as inline style on the master panel", () => {
    const wrapper = layoutOf({ minMasterWidth: "20rem" });
    const master = wrapper.findAll("div")[1]!;
    const style = master.attributes("style") ?? "";
    expect(style).toContain("20rem");
  });

  it("defaults to 14rem minMasterWidth", () => {
    const wrapper = layoutOf();
    const master = wrapper.findAll("div")[1]!;
    const style = master.attributes("style") ?? "";
    expect(style).toContain("14rem");
  });

  it("applies the gap class when gap is not 'none'", () => {
    const root = layoutOf({ gap: "md" }).find("div");
    expect(root.classes()).toEqual(expect.arrayContaining(["gap-3", "sm:gap-4"]));
  });

  it("applies no gap class when gap is 'none'", () => {
    const root = layoutOf({ gap: "none" }).find("div");
    expect(root.classes()).not.toContain("gap-3");
    expect(root.classes()).not.toContain("sm:gap-4");
  });

  it("gives the detail area overflow-y-auto", () => {
    const wrapper = layoutOf();
    const detail = wrapper.findAll("div")[2]!;
    expect(detail.classes()).toContain("overflow-y-auto");
  });

  it("wraps when the container is too narrow for both panels", () => {
    const wrapper = layoutOf();
    const root = wrapper.find("div");
    expect(root.classes()).toContain("flex");
    expect(root.attributes("style") ?? "").toContain("wrap");
  });

  it("places the detail panel after the master panel", () => {
    const wrapper = layoutOf();
    const divs = wrapper.findAll("div");
    // The second div is the master panel, the third is the detail panel.
    expect(divs[1]!.classes()).toContain("bg-sunken");
    expect(divs[2]!.classes()).toContain("bg-background");
  });
});
