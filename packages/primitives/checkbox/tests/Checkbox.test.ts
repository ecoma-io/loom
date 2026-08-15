import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import Checkbox from "../src/Checkbox.vue";
import { provideFieldContext } from "@ecoma-io/loom-labels";

type CheckboxProps = InstanceType<typeof Checkbox>["$props"];

// A stand-in for the Field wrapping this control. Field's own behaviour —
// which id it mints, when it publishes a description — is pinned in
// `Field.test.ts`; what matters here is the other half, that the box reads a
// row it is inside at all.
//
// It renders a real `<form>` because that is the only place Reka mints the
// hidden input carrying `name`: outside one, a resolved name has nowhere
// observable to land, and a test that could not see it would pass with the key
// dropped.
const ProbeRow = defineComponent({
  props: {
    controlId: { type: String, default: undefined },
    describedBy: { type: String, default: undefined },
    name: { type: String, default: undefined },
    required: { type: Boolean, default: undefined },
    invalid: { type: Boolean, default: undefined },
    disabled: { type: Boolean, default: undefined },
    readonly: { type: Boolean, default: undefined },
  },
  setup(props, { slots }) {
    provideFieldContext({
      controlId: () => props.controlId,
      describedBy: () => props.describedBy,
      name: () => props.name,
      required: () => props.required,
      invalid: () => props.invalid,
      disabled: () => props.disabled,
      readonly: () => props.readonly,
    });
    return () => h("form", slots.default?.());
  },
});

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

  // Both halves were silently missing: this component renders a fragment root
  // (two branches and a comment), and Vue drops fallthrough attributes on a
  // fragment rather than inheriting them, so an `id` or a `class` written at a
  // call site reached no element at all. The id now lands on the box because
  // that is what a row's `<label for>` must resolve to — `for` names a labelable
  // element, and the wrapping `<label>` is not one.
  it("puts a caller's id and test hooks on the box while class still sizes the labelled row", () => {
    const wrapper = mount(Checkbox, {
      props: { label: "Remember me" },
      attrs: { id: "remember", "data-testid": "remember-box", class: "w-40" },
    });
    const box = wrapper.get('[role="checkbox"]');
    expect(box.attributes("id")).toBe("remember");
    expect(box.attributes("data-testid")).toBe("remember-box");
    expect(wrapper.get("label").classes()).toContain("w-40");
    expect(box.classes()).not.toContain("w-40");
  });

  it("takes its id, description, name, required and invalid state from the row it sits in", () => {
    const row = mount(ProbeRow, {
      props: {
        controlId: "terms",
        describedBy: "terms-description",
        name: "terms",
        required: true,
        invalid: true,
      },
      slots: { default: h(Checkbox, { ariaLabel: "Accept the terms" }) },
    });
    const box = row.get('[role="checkbox"]');

    expect(box.attributes("id")).toBe("terms");
    expect(box.attributes("aria-describedby")).toBe("terms-description");
    expect(box.attributes("aria-required")).toBe("true");
    expect(box.attributes("aria-invalid")).toBe("true");
    expect((row.get("input").element as HTMLInputElement).name).toBe("terms");
  });

  it("takes a row's disabled state, and dims the label text with it", () => {
    const row = mount(ProbeRow, {
      props: { disabled: true },
      slots: { default: h(Checkbox, { label: "Accept the terms" }) },
    });
    expect((row.get('[role="checkbox"]').element as HTMLButtonElement).disabled).toBe(true);
    expect(row.get("label").classes()).toContain("cursor-not-allowed");
  });

  it("keeps the dim on the box, which holds no text, and never on the label beside it", () => {
    // The library-wide rule is that an `opacity` may drain a border, a fill or
    // a glyph and may never drain text, because compositing at 50% more than
    // halves the contrast of whatever is underneath. This control is on the
    // right side of it *by construction* — the box is a sibling of the label,
    // not a wrapper around it — and this test is what stops a later edit from
    // hoisting the dim onto the `<label>` and taking the words with it.
    const row = mount(ProbeRow, {
      props: { disabled: true },
      slots: { default: h(Checkbox, { label: "Accept the terms" }) },
    });

    const box = row.get('[role="checkbox"]');
    expect(box.classes()).toContain("disabled:opacity-50");
    expect(box.text()).toBe("");

    const dimmed = row
      .findAll("*")
      .filter((el) => el.text().trim() !== "")
      .filter((el) => el.classes().some((name) => /(^|:)opacity-/.test(name)));
    expect(dimmed.map((el) => el.classes().join(" "))).toEqual([]);
  });

  it("lets an explicit disabled overrule the row in both directions", () => {
    const optedOut = mount(ProbeRow, {
      props: { disabled: true },
      slots: { default: h(Checkbox, { ariaLabel: "Accept the terms", disabled: false }) },
    });
    expect((optedOut.get('[role="checkbox"]').element as HTMLButtonElement).disabled).toBe(false);

    const optedIn = mount(ProbeRow, {
      slots: { default: h(Checkbox, { ariaLabel: "Accept the terms", disabled: true }) },
    });
    expect((optedIn.get('[role="checkbox"]').element as HTMLButtonElement).disabled).toBe(true);
  });

  it("adds the row's description to one the caller already set rather than replacing it", () => {
    const row = mount(ProbeRow, {
      props: { describedBy: "terms-description" },
      slots: {
        default: h(Checkbox, {
          ariaLabel: "Accept the terms",
          "aria-describedby": "terms-summary",
        }),
      },
    });
    expect(row.get('[role="checkbox"]').attributes("aria-describedby")).toBe(
      "terms-summary terms-description",
    );
  });

  // The whole bag drops every key that resolved to nothing, so a checkbox with
  // no row above it has to render exactly what it rendered before the context
  // existed — no generated id, no name, no aria-* the caller did not ask for.
  it("outside any Field adds nothing of its own", () => {
    const wrapper = mount(Checkbox, { props: { label: "Remember me" } });
    const box = wrapper.get('[role="checkbox"]');
    for (const attribute of ["id", "name", "aria-describedby", "aria-invalid"]) {
      expect(box.attributes(attribute)).toBeUndefined();
    }
    // Reka has always written this one from its own `required` prop, and an
    // unwrapped checkbox resolves that prop to `false` exactly as it did before
    // the context existed.
    expect(box.attributes("aria-required")).toBe("false");
  });

  // A checkbox has no read-only state to render (the native attribute is a
  // no-op on `<input type="checkbox">`), so a row asking for one must not
  // arrive as a half-measure: not disabled, and not a `readonly` attribute on
  // a button that would mean nothing there either.
  it("ignores a row's readonly rather than approximating it", () => {
    const row = mount(ProbeRow, {
      props: { readonly: true },
      slots: { default: h(Checkbox, { ariaLabel: "Accept the terms" }) },
    });
    const box = row.get('[role="checkbox"]');
    expect((box.element as HTMLButtonElement).disabled).toBe(false);
    expect(box.attributes("readonly")).toBeUndefined();
    expect(box.attributes("aria-readonly")).toBeUndefined();
  });
});
