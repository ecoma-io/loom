import { enableAutoUnmount, mount } from "@vue/test-utils";
import { ColorAreaRoot, ColorFieldRoot, ColorSliderRoot, ColorSwatchPickerRoot } from "reka-ui";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import ColorPicker from "./ColorPicker.vue";
import { provideFieldContext } from "../../lib/field-context";

// A stand-in for the Field wrapping this control. Field's own behaviour is
// pinned in `Field.test.ts`; what matters here is that the picker reads a row
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

// Reka is the real thing under test here, so the browser APIs it reads are
// stubbed to the shape it expects rather than mocked around: the hue slider's
// thumb measures itself with a ResizeObserver, and the preset listbox scrolls
// the highlighted option into view when it moves.
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  Element.prototype.scrollIntoView = vi.fn();
});

enableAutoUnmount(afterEach);

function mountPicker(props: Partial<InstanceType<typeof ColorPicker>["$props"]> = {}, attrs = {}) {
  return mount(ColorPicker, {
    props: { modelValue: "#3366cc", ...props },
    attrs,
    // The preset listbox moves real focus between its options, and focus only
    // works for a tree that is actually in the document.
    attachTo: document.body,
  });
}

type Picker = ReturnType<typeof mountPicker>;

function hexInput(wrapper: Picker) {
  return wrapper.get<HTMLInputElement>('input[aria-label="Hex value"]');
}

function hexText(wrapper: Picker): string {
  return hexInput(wrapper).element.value;
}

function options(wrapper: Picker) {
  return wrapper.findAll('[role="option"]');
}

function thumbs(wrapper: Picker) {
  return wrapper.findAll('[role="slider"]');
}

// `findAll()[n]` is possibly-undefined under this repository's TypeScript
// settings, and a cast there would hide the case worth being loud about: a
// preset that silently failed to render.
function option(wrapper: Picker, index: number) {
  const found = options(wrapper)[index];
  if (found === undefined) throw new Error(`no preset rendered at index ${String(index)}`);
  return found;
}

// The parts' own event boundary. Reka's pointer paths run on
// `getBoundingClientRect` and pointer capture, neither of which jsdom lays out,
// so a true drag cannot be simulated — but `update:modelValue` per tick and
// `changeEnd` at release are exactly what the parts emit, and that boundary is
// what this component is written against.
async function emitFromArea(wrapper: Picker, event: string, value: unknown): Promise<void> {
  wrapper.getComponent(ColorAreaRoot).vm.$emit(event, value);
  await nextTick();
}

async function emitFromHue(wrapper: Picker, event: string, value: unknown): Promise<void> {
  wrapper.getComponent(ColorSliderRoot).vm.$emit(event, value);
  await nextTick();
}

describe("ColorPicker colour model", () => {
  it("feeds one colour to every part, so the area, the hue slider and the field cannot disagree", () => {
    const wrapper = mountPicker({ modelValue: "#3366cc" });
    expect(wrapper.getComponent(ColorAreaRoot).props("modelValue")).toBe("#3366cc");
    expect(wrapper.getComponent(ColorSliderRoot).props("modelValue")).toBe("#3366cc");
    expect(wrapper.getComponent(ColorFieldRoot).props("modelValue")).toBe("#3366cc");
    expect(hexText(wrapper)).toBe("#3366cc");
  });

  it("falls back to a parseable colour instead of throwing when the model value is not one", () => {
    const wrapper = mountPicker({ modelValue: "rebeccapurple-ish" });
    expect(hexText(wrapper)).toBe("#000000");
  });

  it("still runs with no model value at all, rather than sticking on a coerced one", async () => {
    const wrapper = mount(ColorPicker, { attachTo: document.body });
    expect(hexText(wrapper)).toBe("#000000");

    await emitFromArea(wrapper, "update:modelValue", "#112233");
    expect(wrapper.emitted("update:modelValue")).toEqual([["#112233"]]);
    expect(hexText(wrapper)).toBe("#112233");
  });

  it("reflects a host-driven change while idle, so an external write moves both thumbs", async () => {
    const wrapper = mountPicker({ modelValue: "#3366cc" });
    await wrapper.setProps({ modelValue: "#ff0000" });
    expect(wrapper.getComponent(ColorAreaRoot).props("modelValue")).toBe("#ff0000");
    expect(hexText(wrapper)).toBe("#ff0000");
  });

  it("resolves a colour object from a part to hex, so the public value is never stringified junk", async () => {
    const wrapper = mountPicker({ modelValue: "#3366cc" });
    await emitFromHue(wrapper, "update:modelValue", {
      space: "rgb",
      r: 255,
      g: 0,
      b: 0,
      alpha: 1,
    });
    expect(wrapper.emitted("update:modelValue")).toEqual([["#ff0000"]]);
  });
});

describe("ColorPicker transient and committed", () => {
  it("streams a drag through update:modelValue and commits once at the release", async () => {
    const wrapper = mountPicker({ modelValue: "#3366cc" });

    await emitFromArea(wrapper, "update:modelValue", "#3366aa");
    await emitFromArea(wrapper, "update:modelValue", "#336688");
    expect(wrapper.emitted("commit")).toBeUndefined();

    await emitFromArea(wrapper, "changeEnd", "#336688");
    expect(wrapper.emitted("update:modelValue")).toEqual([["#3366aa"], ["#336688"]]);
    expect(wrapper.emitted("commit")).toEqual([["#336688"]]);
  });

  it("feeds each transient tick back into the parts, so a host that withholds them cannot freeze the drag", async () => {
    const wrapper = mountPicker({ modelValue: "#3366cc" });
    await emitFromArea(wrapper, "update:modelValue", "#336688");

    // The host never echoed the transient value back, so `modelValue` is still
    // the pre-drag colour — but the parts have to see the live one or the
    // thumbs snap back under the pointer.
    expect(wrapper.props("modelValue")).toBe("#3366cc");
    expect(wrapper.getComponent(ColorAreaRoot).props("modelValue")).toBe("#336688");
    expect(wrapper.getComponent(ColorSliderRoot).props("modelValue")).toBe("#336688");
  });

  it("a gesture that ends on the colour it started from commits nothing", async () => {
    const wrapper = mountPicker({ modelValue: "#3366cc" });

    await emitFromArea(wrapper, "update:modelValue", "#336688");
    await emitFromArea(wrapper, "update:modelValue", "#3366cc");
    await emitFromArea(wrapper, "changeEnd", "#3366cc");

    expect(wrapper.emitted("commit")).toBeUndefined();
  });

  it("commits an arrow step in the area, which Reka itself only commits on pointer release", async () => {
    const wrapper = mountPicker({ modelValue: "#3366cc" });
    await wrapper.get('[role="application"]').trigger("keydown", { key: "ArrowRight" });
    await nextTick();

    const transient = wrapper.emitted("update:modelValue");
    expect(transient).toHaveLength(1);
    expect(wrapper.emitted("commit")).toEqual(transient);
  });

  it("a key that does not step the area commits nothing, so the key stays free for the surface around it", async () => {
    const wrapper = mountPicker({ modelValue: "#3366cc" });
    await wrapper.get('[role="application"]').trigger("keydown", { key: "Escape" });
    await nextTick();

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("commit")).toBeUndefined();
  });

  it("forwards the hue slider's ticks and its release the same way the area's are forwarded", async () => {
    const wrapper = mountPicker({ modelValue: "#3366cc" });

    await emitFromHue(wrapper, "update:modelValue", "#cc3333");
    expect(wrapper.emitted("commit")).toBeUndefined();

    await emitFromHue(wrapper, "changeEnd", "#cc3333");
    expect(wrapper.emitted("update:modelValue")).toEqual([["#cc3333"]]);
    expect(wrapper.emitted("commit")).toEqual([["#cc3333"]]);
  });

  it("a typed hex reaches the model only when the field is left, and that one emit is the checkpoint", async () => {
    const wrapper = mountPicker({ modelValue: "#3366cc" });
    const input = hexInput(wrapper);

    await input.setValue("#abcdef");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();

    await input.trigger("blur");
    expect(wrapper.emitted("update:modelValue")).toEqual([["#abcdef"]]);
    expect(wrapper.emitted("commit")).toEqual([["#abcdef"]]);
  });

  it("an arrow step in the hex field is its own boundary, so it emits and checkpoints together", async () => {
    const wrapper = mountPicker({ modelValue: "#3366cc" });
    await hexInput(wrapper).trigger("keydown", { key: "ArrowUp" });

    expect(wrapper.emitted("update:modelValue")).toEqual([["#3366cd"]]);
    expect(wrapper.emitted("commit")).toEqual([["#3366cd"]]);
  });

  it("text that is not a colour is reverted rather than emitted, so the model never holds a half-typed value", async () => {
    const wrapper = mountPicker({ modelValue: "#3366cc" });
    const input = hexInput(wrapper);

    await input.setValue("#zzz");
    await input.trigger("blur");

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(hexText(wrapper)).toBe("#3366cc");
  });

  it("an external write is not mistaken for a gesture and commits nothing on its own", async () => {
    const wrapper = mountPicker({ modelValue: "#3366cc" });
    await wrapper.setProps({ modelValue: "#ff0000" });
    expect(wrapper.emitted("commit")).toBeUndefined();

    // It does re-baseline the checkpoint, so moving back to the old colour is
    // a change again rather than being swallowed as "already committed".
    await emitFromArea(wrapper, "update:modelValue", "#3366cc");
    await emitFromArea(wrapper, "changeEnd", "#3366cc");
    expect(wrapper.emitted("commit")).toEqual([["#3366cc"]]);
  });
});

describe("ColorPicker presets", () => {
  it("renders no swatch row at all when none are given", () => {
    const wrapper = mountPicker();
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
  });

  it("renders no row when nothing survives parsing, rather than an empty listbox with no options", () => {
    const wrapper = mountPicker({ swatches: ["chartreuse-ish", ""] });
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
  });

  it("drops a preset that cannot be parsed rather than rendering an unusable square", () => {
    const wrapper = mountPicker({ swatches: ["#ff0000", "not a colour", "#00ff00"] });
    expect(options(wrapper)).toHaveLength(2);
  });

  it("names every preset, so a swatch is never a bare coloured square", () => {
    const wrapper = mountPicker({ swatches: ["#ff0000", "#00ff00"] });
    expect(options(wrapper).map((option) => option.attributes("aria-label"))).toEqual([
      "vibrant red",
      "vibrant green",
    ]);
  });

  it("marks the chosen preset with aria-selected, so the choice is not carried by colour alone", () => {
    const wrapper = mountPicker({ modelValue: "#00ff00", swatches: ["#ff0000", "#00ff00"] });
    expect(options(wrapper).map((option) => option.attributes("aria-selected"))).toEqual([
      "false",
      "true",
    ]);
  });

  it("is one tab stop with roving focus, not one per swatch", () => {
    const wrapper = mountPicker({ swatches: ["#ff0000", "#00ff00", "#0000ff"] });
    const tabbable = [
      ...options(wrapper).map((option) => option.attributes("tabindex")),
      wrapper.get('[role="listbox"]').attributes("tabindex"),
    ].filter((tabindex) => tabindex === "0");
    expect(tabbable).toHaveLength(1);
  });

  it("choosing a preset emits the colour and checkpoints it in one go", async () => {
    const wrapper = mountPicker({ modelValue: "#3366cc", swatches: ["#ff0000", "#00ff00"] });
    await option(wrapper, 1).trigger("click");

    expect(wrapper.emitted("update:modelValue")).toEqual([["#00ff00"]]);
    expect(wrapper.emitted("commit")).toEqual([["#00ff00"]]);
  });

  it("ignores an empty selection from the listbox, because 'no colour' is not a value this can carry", async () => {
    const wrapper = mountPicker({ modelValue: "#ff0000", swatches: ["#ff0000", "#00ff00"] });
    wrapper.getComponent(ColorSwatchPickerRoot).vm.$emit("update:modelValue", undefined);
    await nextTick();

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(hexText(wrapper)).toBe("#ff0000");
  });

  it("choosing the preset already showing re-affirms it rather than clearing the colour", async () => {
    const wrapper = mountPicker({ modelValue: "#ff0000", swatches: ["#ff0000", "#00ff00"] });
    await option(wrapper, 0).trigger("click");

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("commit")).toBeUndefined();
    expect(hexText(wrapper)).toBe("#ff0000");
    expect(option(wrapper, 0).attributes("aria-selected")).toBe("true");
  });
});

describe("ColorPicker accessibility contract", () => {
  it("names each thumb by what it moves, and reads the axes out as values rather than as colour", () => {
    const wrapper = mountPicker({ modelValue: "#3366cc" });

    expect(thumbs(wrapper).map((thumb) => thumb.attributes("aria-label"))).toEqual([
      "Saturation, Brightness",
      "Hue",
    ]);
    expect(thumbs(wrapper).map((thumb) => thumb.attributes("aria-valuetext"))).toEqual([
      "Saturation 60, Brightness 80",
      "220",
    ]);
  });

  it("names the area, because Reka gives it role=application and hands it every key press", () => {
    const wrapper = mountPicker();
    const area = wrapper.get('[role="application"]');
    expect(area.attributes("aria-label")).toBe("Saturation and brightness");
  });

  it("keeps the hex on screen as editable text, which is the picker's only non-colour channel", async () => {
    const wrapper = mountPicker({ modelValue: "#3366cc" });
    expect(hexInput(wrapper).attributes("readonly")).toBeUndefined();

    // It tracks the colour rather than only seeding from it, so a drag is
    // legible to a reader who cannot see the gradient move.
    await emitFromArea(wrapper, "update:modelValue", "#00ff00");
    expect(hexText(wrapper)).toBe("#00ff00");
  });

  it("carries the group's accessible name, since the picker has no text of its own", () => {
    const named = mountPicker({ ariaLabel: "Brand colour" });
    expect(named.get('[role="group"]').attributes("aria-label")).toBe("Brand colour");

    const labelled = mountPicker({ ariaLabelledby: "brand-colour-label" });
    expect(labelled.get('[role="group"]').attributes("aria-labelledby")).toBe("brand-colour-label");
  });
});

describe("ColorPicker disabled", () => {
  it("says so through aria-disabled, not only by dimming", () => {
    const wrapper = mountPicker({ disabled: true });
    const group = wrapper.get('[role="group"]');
    expect(group.attributes("aria-disabled")).toBe("true");
    expect(group.attributes("data-disabled")).toBeDefined();
  });

  it("takes both thumbs out of the tab order and locks the field", () => {
    const wrapper = mountPicker({ disabled: true });
    for (const thumb of thumbs(wrapper)) {
      expect(thumb.attributes("tabindex")).not.toBe("0");
    }
    expect(hexInput(wrapper).attributes("disabled")).toBeDefined();
  });

  it("refuses an arrow step, so a locked picker cannot be moved from the keyboard", async () => {
    const wrapper = mountPicker({ disabled: true });
    await wrapper.get('[role="application"]').trigger("keydown", { key: "ArrowRight" });
    await nextTick();

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("commit")).toBeUndefined();
  });

  it("refuses a preset click", async () => {
    const wrapper = mountPicker({ disabled: true, swatches: ["#ff0000", "#00ff00"] });
    await option(wrapper, 1).trigger("click");

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("commit")).toBeUndefined();
  });
});

describe("ColorPicker attribute routing", () => {
  it("merges a caller's class onto the group, which is the element a parent's layout sizes", () => {
    const wrapper = mountPicker({}, { class: "max-w-sm" });
    expect(wrapper.classes()).toContain("max-w-sm");
    // The merge is Tailwind-aware, so the group's own width constraint gives
    // way instead of fighting the caller's in declaration order.
    expect(wrapper.classes()).not.toContain("max-w-xs");
  });

  it("routes every other fallthrough attribute to the group, which is what they describe", () => {
    const wrapper = mountPicker({}, { "data-testid": "brand", "aria-describedby": "hint" });
    const group = wrapper.get('[role="group"]');
    expect(group.attributes("data-testid")).toBe("brand");
    expect(group.attributes("aria-describedby")).toBe("hint");
  });
});

describe("ColorPicker inside a Field", () => {
  function mountRow(props: Record<string, unknown>, pickerProps: Record<string, unknown> = {}) {
    return mount(ProbeRow, {
      props,
      slots: { default: h(ColorPicker, { modelValue: "#3366cc", ...pickerProps }) },
      attachTo: document.body,
    });
  }

  it("takes the row's id and description onto the group, which is what the row is about", () => {
    const row = mountRow({ controlId: "brand", describedBy: "brand-description" });
    const group = row.get('[role="group"]');
    expect(group.attributes("id")).toBe("brand");
    expect(group.attributes("aria-describedby")).toBe("brand-description");
  });

  // `aria-required` and a form name are not allowed on `role="group"` — axe's
  // `aria-allowed-attr` is a WCAG 4.1.2 rule the docs gate runs — so they land
  // on the hex field, which is the picker's one real form control.
  it("takes the row's name, required and invalid onto the hex field, never onto the group", () => {
    const row = mountRow({ name: "brand", required: true, invalid: true });
    const group = row.get('[role="group"]');
    for (const attribute of ["name", "aria-required", "aria-invalid"]) {
      expect(group.attributes(attribute)).toBeUndefined();
    }

    const hex = row.get<HTMLInputElement>('input[aria-label="Hex value"]');
    // The field holds exactly the `#rrggbb` this component emits, so the name
    // posts the model value itself rather than a formatted spelling of it.
    expect(hex.element.name).toBe("brand");
    expect(hex.element.value).toBe("#3366cc");
    expect(hex.attributes("aria-required")).toBe("true");
    expect(hex.attributes("aria-invalid")).toBe("true");
  });

  it("lets an explicit disabled overrule the row in both directions", () => {
    const optedOut = mountRow({ disabled: true }, { disabled: false });
    expect(optedOut.get('[role="group"]').attributes("aria-disabled")).toBeUndefined();
    expect(optedOut.get<HTMLInputElement>('input[aria-label="Hex value"]').element.disabled).toBe(
      false,
    );

    const optedIn = mountRow({}, { disabled: true });
    expect(optedIn.get('[role="group"]').attributes("aria-disabled")).toBe("true");
  });

  it("adds the row's description to one the caller already set rather than replacing it", () => {
    const row = mount(ProbeRow, {
      props: { describedBy: "brand-description" },
      slots: {
        default: h(ColorPicker, { modelValue: "#3366cc", "aria-describedby": "brand-caveat" }),
      },
      attachTo: document.body,
    });
    expect(row.get('[role="group"]').attributes("aria-describedby")).toBe(
      "brand-caveat brand-description",
    );
  });

  // None of the four parts has a read-only state, so a row's must arrive as
  // nothing at all — and above all must not quietly become `disabled`.
  it("ignores a row's readonly rather than approximating it", () => {
    const row = mountRow({ readonly: true });
    expect(row.get('[role="group"]').attributes("aria-disabled")).toBeUndefined();
    expect(row.get('[role="group"]').attributes("aria-readonly")).toBeUndefined();
    expect(row.get<HTMLInputElement>('input[aria-label="Hex value"]').element.readOnly).toBe(false);
  });

  // Every key that resolved to nothing is dropped from the bag, so a picker
  // with no row above it renders exactly what it rendered before the context
  // existed.
  it("outside any Field adds nothing of its own", () => {
    const wrapper = mountPicker({}, { "aria-label": "Label colour" });
    const group = wrapper.get('[role="group"]');
    for (const attribute of ["id", "name", "aria-describedby", "aria-required", "aria-invalid"]) {
      expect(group.attributes(attribute)).toBeUndefined();
    }
    const hex = wrapper.get<HTMLInputElement>('input[aria-label="Hex value"]');
    expect(hex.attributes("name")).toBeUndefined();
    expect(hex.attributes("aria-required")).toBeUndefined();
    expect(hex.attributes("aria-invalid")).toBeUndefined();
  });
});
