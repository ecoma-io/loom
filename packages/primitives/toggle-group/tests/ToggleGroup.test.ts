import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import ToggleGroup, { type ToggleGroupItem } from "../src/ToggleGroup.vue";
import { provideFieldContext } from "@ecoma-io/loom-labels";

// A stand-in for the Field wrapping this control. Field's own behaviour is
// pinned in `Field.test.ts`; what matters here is that the group reads a row
// it is inside at all.
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

const ITEMS: ToggleGroupItem[] = [
  { value: "bold", label: "Bold" },
  { value: "italic", label: "Italic", testId: "fmt-italic" },
  { value: "underline", label: "Underline", disabled: true },
];

// Reka's roving-focus machinery schedules its own follow-up work on real
// timers, so a keyboard-navigation assertion has to let both a microtask
// flush and a timer tick settle before it reads the result — otherwise it
// reads state mid-flight.
async function settle() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

describe("ToggleGroup", () => {
  it("renders one group with every item as a real pressed-state button, not a radio", () => {
    const wrapper = mount(ToggleGroup, {
      props: { items: ITEMS, modelValue: [] },
      attrs: { "aria-label": "Formatting" },
    });
    expect(wrapper.get('[role="group"]').attributes("aria-label")).toBe("Formatting");
    const buttons = wrapper.findAll("button[aria-pressed]");
    expect(buttons.map((b) => b.text())).toEqual(["Bold", "Italic", "Underline"]);
    // The deliberate distinction from SegmentedControl: pressed semantics,
    // no radio role, no aria-checked anywhere.
    expect(wrapper.find('[role="radio"]').exists()).toBe(false);
    expect(wrapper.find('[role="radiogroup"]').exists()).toBe(false);
    for (const button of buttons) {
      expect(button.attributes("aria-pressed")).toBeDefined();
      expect(button.attributes("aria-checked")).toBeUndefined();
      expect((button.element as HTMLButtonElement).tagName).toBe("BUTTON");
    }
  });

  it("carries the single model as aria-pressed, and a null model as nothing pressed", () => {
    const pressed = mount(ToggleGroup, {
      props: { items: ITEMS, modelValue: "italic" },
      attrs: { "aria-label": "Formatting" },
    });
    expect(
      pressed.findAll("button[aria-pressed]").map((b) => b.attributes("aria-pressed")),
    ).toEqual(["false", "true", "false"]);

    const none = mount(ToggleGroup, {
      props: { items: ITEMS, modelValue: null },
      attrs: { "aria-label": "Formatting" },
    });
    expect(none.findAll('button[aria-pressed="true"]').length).toBe(0);
  });

  it("carries the multiple model as one pressed button per entry", () => {
    const wrapper = mount(ToggleGroup, {
      props: { items: ITEMS, modelValue: ["bold", "italic"], type: "multiple" },
      attrs: { "aria-label": "Formatting" },
    });
    expect(
      wrapper.findAll("button[aria-pressed]").map((b) => b.attributes("aria-pressed")),
    ).toEqual(["true", "true", "false"]);
  });

  it("emits the toggled value in single mode and null when the pressed one is pressed again", async () => {
    const wrapper = mount(ToggleGroup, {
      props: { items: ITEMS, modelValue: "bold" },
      attrs: { "aria-label": "Formatting" },
    });
    await wrapper.findAll("button[aria-pressed]")[1]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["italic"]]);

    const off = mount(ToggleGroup, {
      props: { items: ITEMS, modelValue: "bold" },
      attrs: { "aria-label": "Formatting" },
    });
    await off.findAll("button[aria-pressed]")[0]!.trigger("click");
    expect(off.emitted("update:modelValue")).toEqual([[null]]);
  });

  it("adds to and removes from the array in multiple mode, the host owning the model", async () => {
    const wrapper = mount(ToggleGroup, {
      props: { items: ITEMS, modelValue: ["italic"], type: "multiple" },
      attrs: { "aria-label": "Formatting" },
    });
    await wrapper.findAll("button[aria-pressed]")[0]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([[["italic", "bold"]]]);
    // The component never mutates its own model: the next press is computed
    // from the model the host has applied since, not from the one it emitted.
    await wrapper.setProps({ modelValue: ["italic", "bold"] });
    await wrapper.findAll("button[aria-pressed]")[1]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([[["italic", "bold"]], [["bold"]]]);
  });

  it("keeps a per-item disabled button inert while its neighbours stay toggleable", async () => {
    const wrapper = mount(ToggleGroup, {
      props: { items: ITEMS, modelValue: [] },
      attrs: { "aria-label": "Formatting" },
    });
    const buttons = wrapper.findAll("button[aria-pressed]");
    await buttons[2]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect((buttons[2]!.element as HTMLButtonElement).disabled).toBe(true);
    expect((buttons[0]!.element as HTMLButtonElement).disabled).toBe(false);
    // Unavailability is a fill, not a dim — the drained cell, same rule as
    // everywhere else a button goes out of service.
    expect(buttons[2]!.classes()).toContain("data-[disabled]:bg-background");
  });

  it("gives exactly one button a tab stop, so the group is one Tab stop rather than one per button", async () => {
    const wrapper = mount(ToggleGroup, {
      props: { items: ITEMS, modelValue: [] },
      attrs: { "aria-label": "Formatting" },
      attachTo: document.body,
    });
    (wrapper.findAll("button[aria-pressed]")[0]!.element as HTMLButtonElement).focus();
    await settle();

    expect(wrapper.findAll("button[aria-pressed]").map((b) => b.attributes("tabindex"))).toEqual([
      "0",
      "-1",
      "-1",
    ]);
    wrapper.unmount();
  });

  it("moves the roving tab stop on ArrowRight without flipping anything — focus travels, toggles wait for Space or a click", async () => {
    const wrapper = mount(ToggleGroup, {
      props: { items: ITEMS, modelValue: "bold" },
      attrs: { "aria-label": "Formatting" },
      attachTo: document.body,
    });
    (wrapper.findAll("button[aria-pressed]")[0]!.element as HTMLButtonElement).focus();
    await settle();

    wrapper
      .findAll("button[aria-pressed]")[0]!
      .element.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
      );
    await settle();

    expect(wrapper.findAll("button[aria-pressed]").map((b) => b.attributes("tabindex"))).toEqual([
      "-1",
      "0",
      "-1",
    ]);
    // Unlike a radio group, the arrows never change the value.
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(
      wrapper.findAll("button[aria-pressed]").map((b) => b.attributes("aria-pressed")),
    ).toEqual(["true", "false", "false"]);
    wrapper.unmount();
  });

  it("takes its id, description and invalid state from the row it sits in", () => {
    const row = mount(ProbeRow, {
      props: {
        controlId: "formatting",
        describedBy: "formatting-description",
        invalid: true,
      },
      slots: {
        default: h(ToggleGroup, {
          items: ITEMS,
          modelValue: [],
          "aria-label": "Formatting",
        }),
      },
    });
    const group = row.get('[role="group"]');

    expect(group.attributes("id")).toBe("formatting");
    expect(group.attributes("aria-describedby")).toBe("formatting-description");
    expect(group.attributes("aria-invalid")).toBe("true");
  });

  it("disables every button when the row it sits in is disabled, and lets an explicit disabled overrule it", () => {
    const row = mount(ProbeRow, {
      props: { disabled: true },
      slots: {
        default: h(ToggleGroup, {
          items: ITEMS,
          modelValue: [],
          "aria-label": "Formatting",
        }),
      },
    });
    expect(
      row.findAll("button[aria-pressed]").every((b) => (b.element as HTMLButtonElement).disabled),
    ).toBe(true);
    // The track's rim slackens when the whole group is unavailable — the only
    // channel the track has left, its well already spent.
    expect(row.get('[role="group"]').classes()).toContain("border-border");

    const optedOut = mount(ProbeRow, {
      props: { disabled: true },
      slots: {
        default: h(ToggleGroup, {
          items: ITEMS,
          modelValue: [],
          disabled: false,
          "aria-label": "Formatting",
        }),
      },
    });
    expect(
      optedOut
        .findAll("button[aria-pressed]")
        .every((b) => (b.element as HTMLButtonElement).disabled),
    ).toBe(false);
  });

  it("compresses padding and type in the sm form and floors every button at the 24px target minimum", () => {
    const dense = mount(ToggleGroup, {
      props: { items: [{ value: "b", label: "B" }], modelValue: [], size: "sm" },
      attrs: { "aria-label": "Formatting" },
    });
    const denseButton = dense.get("button[aria-pressed]");
    expect(denseButton.classes()).toContain("text-micro");
    expect(denseButton.classes()).toContain("min-h-6");
    expect(denseButton.classes()).toContain("min-w-6");

    const roomy = mount(ToggleGroup, {
      props: { items: [{ value: "b", label: "B" }], modelValue: [] },
      attrs: { "aria-label": "Formatting" },
    });
    expect(roomy.get("button[aria-pressed]").classes()).toContain("px-3");
  });

  it("paints the track per variant, and fills a pressed button with the primary token in every one of them", () => {
    for (const variant of ["secondary", "outline", "ghost"] as const) {
      const wrapper = mount(ToggleGroup, {
        props: { items: ITEMS, modelValue: "bold", variant },
        attrs: { "aria-label": "Formatting" },
      });
      const track = wrapper.get('[role="group"]');
      const pressed = wrapper.findAll("button[aria-pressed]")[0]!;
      // Fill + weight, alongside aria-pressed — the state is never colour alone.
      expect(pressed.classes()).toContain("data-[state=on]:bg-primary");
      expect(pressed.classes()).toContain("data-[state=on]:font-medium");
      // Ghost has no rim by construction; the other two variants carry the
      // input rim.
      expect(track.classes().includes("border-input")).toBe(variant !== "ghost");
    }
    const outline = mount(ToggleGroup, {
      props: { items: ITEMS, modelValue: [], variant: "outline" },
      attrs: { "aria-label": "Formatting" },
    });
    expect(outline.get('[role="group"]').classes()).toContain("bg-background");
  });

  it("renders an item's icon as a hidden glyph so the label stays the accessible name", () => {
    const Icon = defineComponent({ render: () => h("svg", { "data-icon": "" }) });
    const wrapper = mount(ToggleGroup, {
      props: {
        items: [{ value: "bold", label: "Bold", icon: Icon }],
        modelValue: [],
      },
      attrs: { "aria-label": "Formatting" },
    });
    const glyph = wrapper.get("svg");
    expect(glyph.attributes("aria-hidden")).toBe("true");
    expect(wrapper.get("button[aria-pressed]").text()).toBe("Bold");
  });

  it("forwards an item's test id to its button so hosts keep a stable hook onto one toggle", () => {
    const wrapper = mount(ToggleGroup, {
      props: { items: ITEMS, modelValue: [] },
      attrs: { "aria-label": "Formatting" },
    });
    expect(wrapper.get('[data-testid="fmt-italic"]').text()).toBe("Italic");
  });

  it("outside any Field adds nothing of its own", () => {
    const wrapper = mount(ToggleGroup, {
      props: { items: ITEMS, modelValue: [] },
      attrs: { "aria-label": "Formatting" },
    });
    const group = wrapper.get('[role="group"]');
    for (const attribute of ["id", "aria-describedby", "aria-invalid"]) {
      expect(group.attributes(attribute)).toBeUndefined();
    }
  });

  it("ignores a row's readonly rather than approximating it", () => {
    const row = mount(ProbeRow, {
      props: { readonly: true },
      slots: {
        default: h(ToggleGroup, {
          items: ITEMS,
          modelValue: [],
          "aria-label": "Formatting",
        }),
      },
    });
    expect(row.get('[role="group"]').attributes("aria-readonly")).toBeUndefined();
    expect((row.findAll("button[aria-pressed]")[0]!.element as HTMLButtonElement).disabled).toBe(
      false,
    );
  });
});
