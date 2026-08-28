import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import VisuallyHidden from "../src/VisuallyHidden.vue";

/** The class set that is the clip technique — every property the technique needs. */
const clipClasses = [
  "absolute",
  "h-px",
  "w-px",
  "-m-px",
  "overflow-hidden",
  "whitespace-nowrap",
  "border-0",
  "p-0",
  "[clip:rect(0,0,0,0)]",
  "[clip-path:inset(50%)]",
];

/** The dynamic-component render leaves `wrapper.element` untyped; every assertion here means an HTMLElement. */
function elementOf(wrapper: ReturnType<typeof mount>): HTMLElement {
  return wrapper.element as HTMLElement;
}

describe("VisuallyHidden", () => {
  it("renders its slot content — the whole point is that AT has something to read", () => {
    const wrapper = mount(VisuallyHidden, { slots: { default: "Rate limit reached" } });
    expect(wrapper.text()).toBe("Rate limit reached");
  });

  it("is a span by default, so the markup stays valid inside phrasing content — a label, a button, a paragraph", () => {
    const wrapper = mount(VisuallyHidden);
    expect(elementOf(wrapper).tagName).toBe("SPAN");
  });

  it("hides from the paint with the clip technique, which keeps the content in the accessibility tree and in in-page find", () => {
    const classes = mount(VisuallyHidden).classes();
    for (const name of clipClasses) {
      expect(classes).toContain(name);
    }
  });

  it("must not be display:none — that hides from screen readers too, erasing the content the component exists to expose", () => {
    const wrapper = mount(VisuallyHidden);
    expect(wrapper.classes()).not.toContain("hidden");
    expect(wrapper.attributes("style")).toBeUndefined();
    expect(elementOf(wrapper).style.display).not.toBe("none");
  });

  it("never takes focus in its own right — focusability belongs to a focusable element the caller slots in, not to the wrapper", () => {
    const wrapper = mount(VisuallyHidden, { slots: { default: "context" } });
    expect(wrapper.attributes("tabindex")).toBeUndefined();
    expect(elementOf(wrapper).matches("button, a, input, [tabindex]")).toBe(false);
  });

  it("switches the rendered tag with `as`, so a block of hidden content can live where a div reads better", () => {
    const div = mount(VisuallyHidden, { props: { as: "div" }, slots: { default: "status" } });
    expect(elementOf(div).tagName).toBe("DIV");
    // The clip class set is invariant across the tag — hiding must not depend on which element carries it.
    expect(div.classes()).toEqual(expect.arrayContaining(clipClasses));
  });

  it("passes attributes through to the rendered element — the caller's id and aria wiring must land on the exact node AT reads", () => {
    const wrapper = mount(VisuallyHidden, {
      attrs: { id: "vault-hint", "data-testid": "hint" },
    });
    expect(wrapper.attributes("id")).toBe("vault-hint");
    expect(wrapper.attributes("data-testid")).toBe("hint");
  });

  it("keeps the caller's class next to the clip set instead of replacing it", () => {
    const wrapper = mount(VisuallyHidden, { attrs: { class: "my-0" } });
    expect(wrapper.classes()).toEqual(expect.arrayContaining(clipClasses));
    expect(wrapper.classes()).toContain("my-0");
  });
});
