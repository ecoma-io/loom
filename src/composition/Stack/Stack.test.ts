import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Stack from "./Stack.vue";

// No collaborators to mock: Stack renders one `div` and a default slot, so its
// own logic — the gap step lookup and the alignment class — is everything
// there is to isolate.
function stackOf(props: Record<string, unknown> = {}) {
  return mount(Stack, { props, slots: { default: "<div>item</div>" } }).get("div");
}

describe("Stack", () => {
  it("lays its children out in a vertical column, not a row", () => {
    const classes = stackOf().classes();
    expect(classes).toContain("flex");
    expect(classes).toContain("flex-col");
  });

  it("tightens the gutter one step below the sm breakpoint, where the air buys no separation between stacked items", () => {
    expect(stackOf({ gap: "lg" }).classes()).toEqual(expect.arrayContaining(["gap-4", "sm:gap-6"]));
    expect(stackOf({ gap: "sm" }).classes()).toEqual(expect.arrayContaining(["gap-2", "sm:gap-3"]));
  });

  it("defaults to the md gap step, so a host that passes nothing still gets the documented spacing", () => {
    expect(stackOf().classes()).toEqual(expect.arrayContaining(["gap-3", "sm:gap-4"]));
  });

  it("aligns children along the cross axis as requested", () => {
    expect(stackOf({ align: "start" }).classes()).toContain("items-start");
    expect(stackOf({ align: "center" }).classes()).toContain("items-center");
    expect(stackOf({ align: "end" }).classes()).toContain("items-end");
  });

  it("stretches children to the stack's full width by default", () => {
    expect(stackOf().classes()).toContain("items-stretch");
  });
});
