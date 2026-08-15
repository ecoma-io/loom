import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import FormActions from "../src/FormActions.vue";

// FormActions has no primitive collaborators — it is a layout-only block, so
// there is nothing project-internal to mock. The tests assert the geometry
// (justify class, border separator, slot placement) rather than any behaviour
// delegated to a child.

describe("FormActions", () => {
  it("renders both slots in between mode, with the cancel slot on the left and the default slot on the right", () => {
    const wrapper = mount(FormActions, {
      slots: {
        default: '<button type="submit">Save</button>',
        cancel: '<button type="button">Cancel</button>',
      },
    });

    // cancel slot comes before the default slot in the DOM order, which
    // justify-between pushes to opposite ends
    const buttons = wrapper.findAll("button");
    expect(buttons[0]!.text()).toBe("Cancel");
    expect(buttons[1]!.text()).toBe("Save");
  });

  it("applies justify-between by default, so cancel and submit sit at opposite ends", () => {
    const wrapper = mount(FormActions, {
      slots: {
        default: '<button type="submit">Save</button>',
        cancel: '<button type="button">Cancel</button>',
      },
    });

    expect(wrapper.find("div").classes()).toContain("justify-between");
  });

  it("applies justify-end when align is right, pushing all actions to the right edge", () => {
    const wrapper = mount(FormActions, {
      props: { align: "right" },
      slots: { default: '<button type="submit">Save</button>' },
    });

    expect(wrapper.find("div").classes()).toContain("justify-end");
  });

  it("applies justify-start when align is left, pushing all actions to the left edge", () => {
    const wrapper = mount(FormActions, {
      props: { align: "left" },
      slots: { default: '<button type="submit">Save</button>' },
    });

    expect(wrapper.find("div").classes()).toContain("justify-start");
  });

  it("renders a top border separator, so the action row is visually distinct from form content", () => {
    const wrapper = mount(FormActions, {
      slots: { default: '<button type="submit">Save</button>' },
    });

    const root = wrapper.find("div");
    expect(root.classes()).toContain("border-t");
    expect(root.classes()).toContain("border-border");
    expect(root.classes()).toContain("pt-6");
  });

  it("defaults to between alignment when no align prop is provided", () => {
    const wrapper = mount(FormActions, {
      slots: { default: '<button type="submit">Save</button>' },
    });

    expect(wrapper.find("div").classes()).toContain("justify-between");
  });
});
