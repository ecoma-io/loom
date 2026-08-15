import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import SegmentedControl, { type SegmentedControlOption } from "../src/SegmentedControl.vue";
import { provideFieldContext } from "@ecoma-io/loom-labels";

// A stand-in for the Field wrapping this control. Field's own behaviour is
// pinned in `Field.test.ts`; what matters here is that the group reads a row it
// is inside at all.
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

// jsdom has no ResizeObserver — the sliding indicator observes the checked
// segment (same jsdom gap the Tabs/Slider tests stub around).
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
});

const OPTIONS: SegmentedControlOption[] = [
  { value: "compact", label: "Compact" },
  { value: "cozy", label: "Cozy", testId: "density-cozy" },
  { value: "roomy", label: "Roomy", disabled: true },
];

// Reka's roving-focus machinery schedules its own follow-up work (a focus
// listener that arms on the *next* arrow keypress, a click queued a tick
// after focus moves) on real timers, so a keyboard-navigation assertion has
// to let both a microtask flush and a timer tick settle before it reads the
// result — otherwise it reads state mid-flight.
async function settle() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

describe("SegmentedControl", () => {
  it("exposes the options as a single-choice radio group so arrow keys move between them, not Tab", () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "compact" },
      attrs: { "aria-label": "Density" },
    });
    expect(wrapper.get('[role="radiogroup"]').attributes("aria-orientation")).toBe("horizontal");
    expect(wrapper.findAll('[role="radio"]').map((s) => s.text())).toEqual([
      "Compact",
      "Cozy",
      "Roomy",
    ]);
  });

  it("marks exactly the model value as checked, so one option is always the active one", () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "cozy" },
      attrs: { "aria-label": "Density" },
    });
    expect(wrapper.findAll('[role="radio"]').map((s) => s.attributes("aria-checked"))).toEqual([
      "false",
      "true",
      "false",
    ]);
  });

  it("emits the picked value as a string instead of self-updating — the host owns the setting", async () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "compact" },
      attrs: { "aria-label": "Density" },
    });
    await wrapper.findAll('[role="radio"]')[1]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["cozy"]]);
  });

  it("keeps a per-option disabled segment inert while its neighbours stay pickable", async () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "compact" },
      attrs: { "aria-label": "Density" },
    });
    await wrapper.findAll('[role="radio"]')[2]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect((wrapper.findAll('[role="radio"]')[2]!.element as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((wrapper.findAll('[role="radio"]')[1]!.element as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("disables the whole control when the group is disabled, not just its paint", async () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "compact", disabled: true },
      attrs: { "aria-label": "Density" },
    });
    await wrapper.findAll('[role="radio"]')[1]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(
      wrapper.findAll('[role="radio"]').every((s) => (s.element as HTMLButtonElement).disabled),
    ).toBe(true);

    // The track's own channel, and the only one it has left: its fill is
    // already `bg-muted` — the well every unavailable control drains to — so
    // the state is told at the group's edge instead, by the rim slackening from
    // `input` to the lighter `border`. Without it a wholly unavailable control
    // was tellable only cell by cell.
    expect(wrapper.classes()).toContain("border-border");
    expect(wrapper.classes()).not.toContain("border-input");
    expect(
      mount(SegmentedControl, {
        props: { options: OPTIONS, modelValue: "compact" },
        attrs: { "aria-label": "Density" },
      }).classes(),
    ).toContain("border-input");
  });

  it("drains an unavailable segment to a fill instead of dimming the label it is made of", () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "roomy" },
      attrs: { "aria-label": "Density" },
    });

    // The third option is disabled *and* chosen, which is the case that made
    // the segment itself the wrong home for the colour: `data-[disabled]:`
    // sorts ahead of `data-[state=checked]:` in Tailwind's variant order, so a
    // mute written on the button would have lost to `text-foreground`. The
    // label carries its own, and it beats an inherited colour outright.
    const segment = wrapper.findAll('[role="radio"]')[2]!;
    expect(segment.attributes("data-state")).toBe("checked");
    expect(segment.attributes("data-disabled")).toBe("");
    expect(segment.classes()).toContain("data-[disabled]:bg-background");
    expect(segment.get("span").classes()).toContain(
      "group-data-[disabled]/segment:text-muted-foreground",
    );

    // A segment is nothing but its label, so an `opacity` anywhere on this
    // tree has nothing to act on except text. There is nowhere it may sit.
    const dimmed = wrapper
      .findAll("*")
      .filter((el) => el.text().trim() !== "")
      .filter((el) => el.classes().some((name) => /(^|:)opacity-/.test(name)));
    expect(dimmed.map((el) => el.classes().join(" "))).toEqual([]);
  });

  it("compresses padding and type in the sm form for dense chrome, and uses the roomier default otherwise", () => {
    const dense = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "compact", size: "sm" },
      attrs: { "aria-label": "Density" },
    });
    expect(dense.findAll('[role="radio"]')[0]!.classes()).toContain("text-[11px]");

    const roomy = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "compact" },
      attrs: { "aria-label": "Density" },
    });
    expect(roomy.findAll('[role="radio"]')[0]!.classes()).toContain("text-sm");
    expect(roomy.findAll('[role="radio"]')[0]!.classes()).toContain("px-3");
  });

  it("forwards an option's test id to its segment so hosts keep a stable hook onto one choice", () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "compact" },
      attrs: { "aria-label": "Density" },
    });
    expect(wrapper.get('[data-testid="density-cozy"]').text()).toBe("Cozy");
  });

  it("hides the sliding indicator while nothing is checked, instead of parking it over the first segment", async () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS },
      attrs: { "aria-label": "Density" },
      attachTo: document.body,
    });
    await nextTick();
    const indicator = wrapper.get('[aria-hidden="true"]');
    expect(indicator.attributes("style")).toContain("opacity: 0");
    wrapper.unmount();
  });

  it("disconnects its resize observer on unmount so a removed control leaves no live observer behind", () => {
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = disconnect;
      },
    );
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "compact" },
      attrs: { "aria-label": "Density" },
    });
    disconnect.mockClear();
    wrapper.unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("gives only the focused segment a tab stop, so the group is one Tab stop rather than one per segment", async () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "compact" },
      attrs: { "aria-label": "Density" },
      attachTo: document.body,
    });
    const items = wrapper.findAll('[role="radio"]');
    (items[0]!.element as HTMLButtonElement).focus();
    await settle();

    expect(wrapper.findAll('[role="radio"]').map((s) => s.attributes("tabindex"))).toEqual([
      "0",
      "-1",
      "-1",
    ]);
    wrapper.unmount();
  });

  it("moves the roving tab stop and the selection to the next segment on ArrowRight, since the group is horizontal", async () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "compact" },
      attrs: { "aria-label": "Density" },
      attachTo: document.body,
    });
    const items = wrapper.findAll('[role="radio"]');
    (items[0]!.element as HTMLButtonElement).focus();
    await settle();

    items[0]!.element.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
    );
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([["cozy"]]);
    expect(wrapper.findAll('[role="radio"]').map((s) => s.attributes("tabindex"))).toEqual([
      "-1",
      "0",
      "-1",
    ]);
    wrapper.unmount();
  });

  it("ignores the vertical arrows, since a horizontal group navigates on the horizontal axis only", async () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "compact" },
      attrs: { "aria-label": "Density" },
      attachTo: document.body,
    });
    const items = wrapper.findAll('[role="radio"]');
    (items[0]!.element as HTMLButtonElement).focus();
    await settle();

    items[0]!.element.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }),
    );
    await settle();

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    wrapper.unmount();
  });

  it("takes its id, description, name, required and invalid state from the row it sits in", () => {
    const row = mount(ProbeRow, {
      props: {
        controlId: "density",
        describedBy: "density-description",
        name: "density",
        required: true,
        invalid: true,
      },
      slots: {
        default: h(SegmentedControl, {
          options: OPTIONS,
          modelValue: "compact",
          "aria-label": "Density",
        }),
      },
    });
    const group = row.get('[role="radiogroup"]');

    expect(group.attributes("id")).toBe("density");
    expect(group.attributes("aria-describedby")).toBe("density-description");
    expect(group.attributes("aria-required")).toBe("true");
    expect(group.attributes("aria-invalid")).toBe("true");
    expect((row.get("input").element as HTMLInputElement).name).toBe("density");
  });

  it("lets an explicit disabled overrule the row in both directions", () => {
    const optedOut = mount(ProbeRow, {
      props: { disabled: true },
      slots: {
        default: h(SegmentedControl, {
          options: OPTIONS,
          modelValue: "compact",
          disabled: false,
          "aria-label": "Density",
        }),
      },
    });
    // The third option is disabled in its own right, so only the pickable two
    // answer the question the row asked.
    expect(
      optedOut
        .findAll('[role="radio"]')
        .slice(0, 2)
        .every((segment) => (segment.element as HTMLButtonElement).disabled),
    ).toBe(false);

    const optedIn = mount(ProbeRow, {
      slots: {
        default: h(SegmentedControl, {
          options: OPTIONS,
          modelValue: "compact",
          disabled: true,
          "aria-label": "Density",
        }),
      },
    });
    expect(
      optedIn
        .findAll('[role="radio"]')
        .every((segment) => (segment.element as HTMLButtonElement).disabled),
    ).toBe(true);
  });

  it("adds the row's description to one the caller already set rather than replacing it", () => {
    const row = mount(ProbeRow, {
      props: { describedBy: "density-description" },
      slots: {
        default: h(SegmentedControl, {
          options: OPTIONS,
          modelValue: "compact",
          "aria-label": "Density",
          "aria-describedby": "density-preview",
        }),
      },
    });
    expect(row.get('[role="radiogroup"]').attributes("aria-describedby")).toBe(
      "density-preview density-description",
    );
  });

  // Every key that resolved to nothing is dropped from the bag, so a control
  // with no row above it renders exactly what it rendered before the context
  // existed.
  it("outside any Field adds nothing of its own", () => {
    const wrapper = mount(SegmentedControl, {
      props: { options: OPTIONS, modelValue: "compact" },
      attrs: { "aria-label": "Density" },
    });
    const group = wrapper.get('[role="radiogroup"]');
    for (const attribute of ["id", "name", "aria-describedby", "aria-invalid"]) {
      expect(group.attributes(attribute)).toBeUndefined();
    }
    // Reka has always written this one from its own `required` prop, and an
    // unwrapped control resolves that prop to `false` exactly as it did before.
    expect(group.attributes("aria-required")).toBe("false");
    expect(wrapper.find("input").exists()).toBe(false);
  });

  // One segment is always active, so a read-only control here would be a
  // disabled one showing an answer. A row's `readonly` has to arrive as nothing
  // at all rather than as that disguise.
  it("ignores a row's readonly rather than approximating it", () => {
    const row = mount(ProbeRow, {
      props: { readonly: true },
      slots: {
        default: h(SegmentedControl, {
          options: OPTIONS,
          modelValue: "compact",
          "aria-label": "Density",
        }),
      },
    });
    const group = row.get('[role="radiogroup"]');
    expect(group.attributes("aria-readonly")).toBeUndefined();
    expect((row.findAll('[role="radio"]')[0]!.element as HTMLButtonElement).disabled).toBe(false);
  });
});
