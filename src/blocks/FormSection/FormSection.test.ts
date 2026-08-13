import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import FormSection from "./FormSection.vue";

// FormSection composes Fieldset, so Fieldset is stubbed to isolate the
// block's own behavior (how it maps its props, where the description and
// slot land relative to the group) from Fieldset's own rendering, which
// is covered in Fieldset.test.ts.
vi.mock("../../primitives/Fieldset/Fieldset.vue", () => ({
  default: {
    name: "Fieldset",
    // Fieldset's own declared props — the stub accepts them so
    // mount does not warn about unknown props being passed through.
    props: ["legend", "hint", "error", "required", "disabled", "readonly", "id"],
    template: '<fieldset data-testid="fieldset"><slot /></fieldset>',
  },
}));

describe("FormSection", () => {
  it("renders the legend by forwarding it to Fieldset, rather than owning its own heading element", () => {
    const wrapper = mount(FormSection, { props: { legend: "Shipping address" } });
    const fieldset = wrapper.getComponent({ name: "Fieldset" });

    expect(fieldset.props("legend")).toBe("Shipping address");
  });

  it("renders the description between the legend and the fields, because it orients the person filling the form — not the same position as Fieldset's hint", () => {
    const wrapper = mount(FormSection, {
      props: { legend: "Shipping address", description: "Where the order will be delivered." },
    });

    const description = wrapper.find("p");
    expect(description.text()).toBe("Where the order will be delivered.");
    expect(description.classes()).toContain("text-small");
    expect(description.classes()).toContain("text-muted-foreground");
    expect(description.classes()).toContain("max-w-prose");
  });

  it("omits the description element entirely when none is provided, so the block never reserves empty space", () => {
    const wrapper = mount(FormSection, { props: { legend: "Shipping address" } });

    expect(wrapper.find("p").exists()).toBe(false);
  });

  it("renders the default slot inside a flex-col container, so fields stack vertically", () => {
    const wrapper = mount(FormSection, {
      props: { legend: "Shipping address" },
      slots: { default: '<div data-testid="field">Street</div>' },
    });

    const field = wrapper.get("[data-testid='field']");
    // The slot content sits inside the gap container
    expect(field.element.parentElement!.className).toContain("flex-col");
  });

  it("forwards hint, error, required, disabled, readonly and id to Fieldset unchanged", () => {
    const wrapper = mount(FormSection, {
      props: {
        legend: "Payment",
        hint: "Billing address on file",
        error: "Card declined",
        required: true,
        disabled: true,
        readonly: true,
        id: "payment",
      },
    });
    const fieldset = wrapper.getComponent({ name: "Fieldset" });

    expect(fieldset.props("hint")).toBe("Billing address on file");
    expect(fieldset.props("error")).toBe("Card declined");
    expect(fieldset.props("required")).toBe(true);
    expect(fieldset.props("disabled")).toBe(true);
    expect(fieldset.props("readonly")).toBe(true);
    expect(fieldset.props("id")).toBe("payment");
  });

  it("applies the md gap class by default, matching Stack's responsive scale", () => {
    const wrapper = mount(FormSection, { props: { legend: "Address" } });
    const container = wrapper.find(".flex.flex-col");

    expect(container.classes()).toContain("gap-3");
    expect(container.classes()).toContain("sm:gap-4");
  });

  it("applies the sm gap class when gap is set to sm", () => {
    const wrapper = mount(FormSection, { props: { legend: "Address", gap: "sm" } });
    const container = wrapper.find(".flex.flex-col");

    expect(container.classes()).toContain("gap-2");
    expect(container.classes()).toContain("sm:gap-3");
  });

  it("applies the lg gap class when gap is set to lg", () => {
    const wrapper = mount(FormSection, { props: { legend: "Address", gap: "lg" } });
    const container = wrapper.find(".flex.flex-col");

    expect(container.classes()).toContain("gap-4");
    expect(container.classes()).toContain("sm:gap-6");
  });

  it("keeps description and hint as separate concerns — description is above the fields, hint is forwarded below them via Fieldset", () => {
    const wrapper = mount(FormSection, {
      props: {
        legend: "Shipping address",
        description: "Where the order will be delivered.",
        hint: "P.O. boxes are accepted",
      },
    });

    // Description is rendered by FormSection itself (above the field container)
    const description = wrapper.find("p");
    expect(description.text()).toBe("Where the order will be delivered.");

    // Hint is forwarded to Fieldset (rendered below the fields by Fieldset)
    const fieldset = wrapper.getComponent({ name: "Fieldset" });
    expect(fieldset.props("hint")).toBe("P.O. boxes are accepted");
  });
});
