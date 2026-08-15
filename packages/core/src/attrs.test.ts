import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { useSplitAttrs } from "./attrs";

// A host that routes `class` to one node and everything else to another —
// exactly what NumberField, Slider and Select do, reduced to the part under
// test. `inheritAttrs: false` is what makes the split necessary at all; with
// it left on, Vue would also apply the whole attribute set to the root and
// every assertion below would pass for the wrong reason.
const Host = defineComponent({
  inheritAttrs: false,
  setup() {
    const { attrs, rest } = useSplitAttrs();
    return () =>
      h("div", { "data-testid": "root" }, [
        h("span", { "data-testid": "class-target", class: attrs.class }),
        h("input", { "data-testid": "rest-target", ...rest.value }),
      ]);
  },
});

describe("useSplitAttrs", () => {
  it("hands `class` to the caller so it can be merged rather than applied twice", () => {
    const wrapper = mount(Host, { attrs: { class: "h-8 w-8", "aria-label": "Amount" } });

    expect(wrapper.get('[data-testid="class-target"]').classes()).toEqual(["h-8", "w-8"]);
  });

  it("keeps `class` out of the rest, so the two targets cannot both receive it", () => {
    const wrapper = mount(Host, { attrs: { class: "h-8 w-8", "aria-label": "Amount" } });
    const rest = wrapper.get('[data-testid="rest-target"]');

    expect(rest.attributes("aria-label")).toBe("Amount");
    expect(rest.attributes("class")).toBeUndefined();
  });

  it("passes every other fallthrough attribute through untouched", () => {
    const wrapper = mount(Host, {
      attrs: { "data-testid-extra": "x", "aria-describedby": "hint", disabled: "" },
    });
    const rest = wrapper.get('[data-testid="rest-target"]');

    expect(rest.attributes("data-testid-extra")).toBe("x");
    expect(rest.attributes("aria-describedby")).toBe("hint");
    expect(rest.attributes("disabled")).toBe("");
  });

  it("yields an empty rest when the only fallthrough attribute is `class`", () => {
    const wrapper = mount(Host, { attrs: { class: "rounded-md" } });
    const rest = wrapper.get('[data-testid="rest-target"]');

    expect(rest.attributes("class")).toBeUndefined();
    expect(wrapper.get('[data-testid="class-target"]').classes()).toEqual(["rounded-md"]);
  });
});
