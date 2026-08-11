import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, useAttrs } from "vue";
import Fieldset from "./Fieldset.vue";
import { useFieldControl } from "../../lib/field-context";

// Unit tier: the internal collaborator is isolated
// (local/no-unmocked-internal-imports). The stub keeps only the seam this
// file's behavior is defined against — whether Fieldset renders InlineError
// at all, and what it hands it — not what InlineError does with the message.
//
// The stub's props are read from the real component at mock time, so a rename
// of InlineError's `message` prop changes the shape the stub declares and the
// test that passes `message` to it breaks.
vi.mock("../InlineError/InlineError.vue", async () => {
  const actual = await vi.importActual("../InlineError/InlineError.vue");
  const c = (actual as { default: { props?: Record<string, unknown> } }).default;
  return {
    default: {
      name: "InlineError",
      props: c.props ? Object.keys(c.props) : [],
      template: "<div />",
    },
  };
});

// A stand-in for any Loom form control, opting into the group through the same
// composable every real control uses. A real TextField here would make this an
// integration test; what is pinned is what the group publishes.
const ProbeControl = defineComponent({
  inheritAttrs: false,
  setup() {
    const attrs = useAttrs();
    const field = useFieldControl(() => ({
      id: attrs.id as string | undefined,
      describedBy: attrs["aria-describedby"] as string | undefined,
    }));
    return () =>
      h("input", {
        ...attrs,
        ...field.attrs,
        disabled: field.disabled,
        readonly: field.readonly,
      });
  },
});

describe("Fieldset", () => {
  // The reason the component exists rather than a `div role="group"`: the
  // slotted control is one Fieldset holds no reference to and could never
  // pass a `disabled` prop to. jsdom implements the "actually disabled"
  // rule, so `:disabled` here is the real inheritance and not a proxy for it.
  it("disables a slotted control it has no reference to, and stops when the group is enabled again", async () => {
    const wrapper = mount(Fieldset, {
      props: { legend: "Notifications", disabled: true },
      slots: { default: '<input aria-label="Nested" />' },
    });
    expect(wrapper.get("input").element.matches(":disabled")).toBe(true);

    await wrapper.setProps({ disabled: false });
    expect(wrapper.get("input").element.matches(":disabled")).toBe(false);
  });

  it("names the group with a real legend inside a real fieldset", () => {
    const wrapper = mount(Fieldset, { props: { legend: "Shipping address" } });
    expect(wrapper.html()).toMatch(/^<fieldset/);
    expect(wrapper.get("fieldset").get("legend").text()).toContain("Shipping address");
  });

  it("renders no legend at all rather than an empty one when none is given", () => {
    const wrapper = mount(Fieldset, { slots: { default: "<input aria-label='Nested' />" } });
    expect(wrapper.find("legend").exists()).toBe(false);
  });

  it("renders InlineError with the error message and hides the hint when an error is present", () => {
    const withError = mount(Fieldset, {
      props: {
        legend: "Shipping address",
        id: "shipping",
        hint: "Where the order goes",
        error: "Enter a street and a city",
      },
    });
    const inlineError = withError.findComponent({ name: "InlineError" });
    expect(inlineError.exists()).toBe(true);
    expect(inlineError.props("message")).toBe("Enter a street and a city");
    expect(withError.text()).not.toContain("Where the order goes");

    const withHint = mount(Fieldset, {
      props: { legend: "Shipping address", id: "shipping", hint: "Where the order goes" },
    });
    expect(withHint.findComponent({ name: "InlineError" }).exists()).toBe(false);
    expect(withHint.text()).toContain("Where the order goes");
  });

  it("describes the group with its own hint, and publishes that id for a consumer to reuse", () => {
    const wrapper = mount(Fieldset, {
      props: { legend: "Shipping address", id: "shipping", hint: "Where the order goes" },
    });
    expect(wrapper.get("p").attributes("id")).toBe("shipping-description");
    expect(wrapper.attributes("aria-describedby")).toBe("shipping-description");
  });

  it("hands that same description id to InlineError once an error replaces the hint", () => {
    const wrapper = mount(Fieldset, {
      props: { legend: "Shipping address", id: "shipping", error: "Enter a street and a city" },
    });
    expect(wrapper.findComponent({ name: "InlineError" }).attributes("id")).toBe(
      "shipping-description",
    );
    expect(wrapper.attributes("aria-describedby")).toBe("shipping-description");
  });

  it("assigns no description id when there is no id to derive one from", () => {
    const wrapper = mount(Fieldset, {
      props: { legend: "Shipping address", hint: "Where the order goes" },
    });
    expect(wrapper.get("p").attributes("id")).toBeUndefined();
    expect(wrapper.attributes("aria-describedby")).toBeUndefined();
  });

  // A described-by pointing at an element that was never rendered is a
  // dangling IDREF, which a screen reader resolves to nothing.
  it("leaves aria-describedby off entirely when the group carries no message", () => {
    const wrapper = mount(Fieldset, { props: { legend: "Shipping address", id: "shipping" } });
    expect(wrapper.attributes("aria-describedby")).toBeUndefined();
  });

  it("shows a required asterisk only when required is set", () => {
    const required = mount(Fieldset, { props: { legend: "Shipping address", required: true } });
    expect(required.get("legend").text()).toContain("*");

    const optional = mount(Fieldset, { props: { legend: "Shipping address" } });
    expect(optional.get("legend").text()).not.toContain("*");
  });

  // `min-w-0` is what stops the UA's `min-inline-size: min-content` from
  // blowing out a form grid, and it is also the utility a consumer is most
  // likely to want back. Concatenated fallthrough would leave which one wins
  // to Tailwind's emission order; the cn() merge makes the caller's the
  // later declaration and drops ours.
  it("lets a caller's width utility replace the root's own, and lands other attributes on the fieldset", () => {
    const wrapper = mount(Fieldset, {
      props: { legend: "Shipping address" },
      attrs: { class: "min-w-full", "data-testid": "shipping-group" },
    });
    expect(wrapper.classes()).toContain("min-w-full");
    expect(wrapper.classes()).not.toContain("min-w-0");
    expect(wrapper.attributes("data-testid")).toBe("shipping-group");
  });

  it("renders every control in the group read-only, which no native fieldset attribute can do", () => {
    const wrapper = mount(Fieldset, {
      props: { legend: "Shipping address", readonly: true },
      slots: { default: h(ProbeControl) },
    });
    const input = wrapper.get("input").element as HTMLInputElement;

    expect(input.readOnly).toBe(true);
    expect(input.disabled).toBe(false);
  });

  it("keeps its required, error and description to itself rather than restating them on every control", () => {
    // A mandatory group is not fifteen mandatory controls, and a group-level
    // error does not make each control in it individually wrong — both would be
    // false statements to the only audience that hears them. The group's own
    // `aria-describedby` already carries the message once.
    const wrapper = mount(Fieldset, {
      props: {
        legend: "Shipping address",
        id: "shipping",
        error: "Enter a street and a city",
        required: true,
      },
      slots: { default: h(ProbeControl) },
    });
    const input = wrapper.get("input");

    expect(input.attributes("aria-required")).toBeUndefined();
    expect(input.attributes("aria-invalid")).toBeUndefined();
    expect(input.attributes("aria-describedby")).toBeUndefined();
    expect(input.attributes("id")).toBeUndefined();
  });

  it("disables the group through the element alone, never a second time through a prop", () => {
    // One fact carried two ways is one fact that can disagree with itself: a
    // control written `:disabled="false"` would beat a context and still be
    // disabled by the element, leaving a live-looking control that refuses
    // input. The `<fieldset>` reaches further anyway.
    const wrapper = mount(Fieldset, {
      props: { legend: "Notifications", disabled: true },
      slots: { default: h(ProbeControl) },
    });
    const input = wrapper.get("input");

    expect(input.attributes("disabled")).toBeUndefined();
    expect(input.element.matches(":disabled")).toBe(true);
  });
});
