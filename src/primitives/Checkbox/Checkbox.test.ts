import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Checkbox from "./Checkbox.vue";

type CheckboxProps = InstanceType<typeof Checkbox>["$props"];

describe("Checkbox", () => {
  it("emits the toggled value on click, flipping unchecked to checked", async () => {
    const wrapper = mount(Checkbox, { props: { modelValue: false, label: "Remember me" } });
    await wrapper.get('[role="checkbox"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([[true]]);
  });

  it("moves out of indeterminate into checked on click, not back to unchecked", async () => {
    const wrapper = mount(Checkbox, {
      props: { modelValue: "indeterminate", label: "Partially selected" },
    });
    await wrapper.get('[role="checkbox"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([[true]]);
  });

  it("disabled prevents any change from a click", async () => {
    const wrapper = mount(Checkbox, {
      props: { modelValue: false, disabled: true, label: "Disabled" },
    });
    await wrapper.get('[role="checkbox"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("marks the underlying control disabled so it is inert to keyboard input too", () => {
    const wrapper = mount(Checkbox, { props: { disabled: true, label: "Disabled" } });
    expect((wrapper.get('[role="checkbox"]').element as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders a checked indicator icon only while checked, not while unchecked", () => {
    const uncheckedWrapper = mount(Checkbox, { props: { modelValue: false, label: "X" } });
    expect(uncheckedWrapper.find("svg").exists()).toBe(false);

    const checkedWrapper = mount(Checkbox, { props: { modelValue: true, label: "X" } });
    expect(checkedWrapper.find("svg").exists()).toBe(true);
  });

  // aria-checked="mixed" is its own value, not a boolean cast of "some state in
  // between" — a consumer's a11y tree and any string-typed check against
  // aria-checked would silently pass a stray "true"/"false" through.
  it("reports the three states on aria-checked distinctly: false, true, and mixed for indeterminate", () => {
    const states: { modelValue: boolean | "indeterminate"; ariaChecked: string }[] = [
      { modelValue: false, ariaChecked: "false" },
      { modelValue: true, ariaChecked: "true" },
      { modelValue: "indeterminate", ariaChecked: "mixed" },
    ];
    for (const { modelValue, ariaChecked } of states) {
      const wrapper = mount(Checkbox, { props: { modelValue, label: "X" } });
      expect(wrapper.get('[role="checkbox"]').attributes("aria-checked")).toBe(ariaChecked);
    }
  });

  it("draws a different glyph for indeterminate than for checked, so mixed reads as its own state rather than a checked look-alike", () => {
    const indeterminate = mount(Checkbox, {
      props: { modelValue: "indeterminate", label: "Partially selected" },
    });
    const checked = mount(Checkbox, { props: { modelValue: true, label: "Checked" } });

    expect(indeterminate.get("svg").html()).not.toBe(checked.get("svg").html());
    // Exactly one glyph renders per state — never both stacked.
    expect(indeterminate.findAll("svg")).toHaveLength(1);
    expect(checked.findAll("svg")).toHaveLength(1);
  });

  // Iconography's ≤12px rule: the 12px tick/dash must declare stroke-width
  // 2.5 rather than inherit the global 1.5, which would render 0.75 device px
  // and wash out against the filled box. Both branches of the template render
  // their own copy of the pair, so both are pinned — dropping the attribute on
  // either one is the exact drift this guards.
  const indicatorCases: { name: string; props: CheckboxProps }[] = [
    { name: "labelled + checked", props: { modelValue: true, label: "Selected" } },
    {
      name: "labelled + indeterminate",
      props: { modelValue: "indeterminate", label: "Partially selected" },
    },
    { name: "bare + checked", props: { modelValue: true, ariaLabel: "Select row" } },
    {
      name: "bare + indeterminate",
      props: { modelValue: "indeterminate", ariaLabel: "Select row" },
    },
  ];
  it.each(indicatorCases)(
    "draws the 12px indicator glyph at the small-glyph stroke width ($name)",
    ({ props }) => {
      const wrapper = mount(Checkbox, { props });
      const glyph = wrapper.get("svg");
      expect(glyph.classes()).toContain("h-3"); // still the 12px box the rule applies to
      expect(glyph.attributes("stroke-width")).toBe("2.5");
    },
  );

  it("renders the visible label text inline instead of requiring a separate aria-label", () => {
    const wrapper = mount(Checkbox, { props: { modelValue: false, label: "Agree to terms" } });
    expect(wrapper.text()).toContain("Agree to terms");
  });

  it("names the control via aria-label when no visible label is given", () => {
    const wrapper = mount(Checkbox, { props: { modelValue: false, ariaLabel: "Select row" } });
    expect(wrapper.get('[role="checkbox"]').attributes("aria-label")).toBe("Select row");
  });

  // The by-reference half of the same contract, and the half nothing checked —
  // measured: deleting the `aria-labelledby` binding left this file green.
  // It is the documented answer for a checkbox named by a table header cell,
  // where the id is the only thing that can carry the name; unforwarded, the
  // consumer sets the prop and ships an unnamed checkbox with no warning.
  it("names the control by reference when the visible label lives in another element", () => {
    const wrapper = mount(Checkbox, {
      props: { modelValue: false, ariaLabelledby: "column-heading" },
    });
    const control = wrapper.get('[role="checkbox"]');
    expect(control.attributes("aria-labelledby")).toBe("column-heading");
    expect(control.attributes("aria-label")).toBeUndefined();
  });

  it("renders the box as a native button with nothing here blocking Space, so the platform's own keyboard handling toggles it", () => {
    const wrapper = mount(Checkbox, { props: { modelValue: false, label: "Remember me" } });
    const control = wrapper.get('[role="checkbox"]').element as HTMLButtonElement;
    expect(control.tagName).toBe("BUTTON");

    const spaceKeydown = new KeyboardEvent("keydown", {
      key: " ",
      code: "Space",
      cancelable: true,
    });
    control.dispatchEvent(spaceKeydown);
    expect(spaceKeydown.defaultPrevented).toBe(false);
  });

  // Every other case here hands `modelValue` in, which is exactly why none of
  // them caught the box being dead without it: a default of `false` reads as
  // "the host says unchecked" and pins the control there forever, while the
  // update event still fires. It looks like a working component to a test that
  // only listens for the emit, and like a broken one to a user.
  it("toggles itself when no modelValue is supplied, rather than emitting into a control that never moves", async () => {
    const wrapper = mount(Checkbox, { props: { label: "Remember me" } });
    const control = wrapper.get('[role="checkbox"]');
    expect(control.attributes("aria-checked")).toBe("false");

    await control.trigger("click");
    expect(wrapper.get('[role="checkbox"]').attributes("aria-checked")).toBe("true");
  });
});
