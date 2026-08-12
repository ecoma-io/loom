import { mount } from "@vue/test-utils";
import fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref, type PropType, type VNode } from "vue";
import NumberField from "./NumberField.vue";
import { provideFieldContext } from "../../lib/field-context";
import { provideLoomLabels, type LoomLabelOverrides } from "../../lib/labels";
import { attachToBody } from "../../testing/attach-to-body";

function mountField(props: Partial<InstanceType<typeof NumberField>["$props"]> = {}) {
  return mount(NumberField, { props: { modelValue: 10, ...props } });
}

// Real dispatched events rather than test-utils' `.trigger()`: trigger()
// re-assigns the init keys onto a synthetic event and trips over getter-only
// properties, and `PointerEvent.button` is one of them — which matters here
// because the pointerdown handler branches on `event.button !== 0`.
function firePointer(el: Element, type: string, init: PointerEventInit) {
  el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, ...init }));
}
function fireWindow(type: string, init: PointerEventInit) {
  window.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, ...init }));
}
function fireWindowKey(key: string) {
  window.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key }));
}

const ROOT = '[role="group"]';
const SPINBUTTON = '[role="spinbutton"]';

function updates(wrapper: ReturnType<typeof mountField>): number[][] {
  return wrapper.emitted("update:modelValue") ?? [];
}

describe("NumberField scrub-drag gesture", () => {
  it("does not start a drag below the pixel threshold, so a plain click still places the caret for typing", () => {
    const wrapper = mountField();
    const root = wrapper.get(ROOT).element;
    firePointer(root, "pointerdown", { clientX: 100, clientY: 0 });
    fireWindow("pointermove", { clientX: 101, clientY: 0 }); // 1px, under the 3px threshold
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    fireWindow("pointerup", { clientX: 101, clientY: 0 });
    expect(wrapper.emitted("commit")).toBeUndefined();
  });

  it("streams update:modelValue on every drag tick past the threshold, and commits exactly once on release", () => {
    const wrapper = mountField({ modelValue: 10, step: 1 });
    const root = wrapper.get(ROOT).element;
    firePointer(root, "pointerdown", { clientX: 100, clientY: 0 });
    // One step per 4px: +12px is +3 steps, +20px is +5.
    fireWindow("pointermove", { clientX: 112, clientY: 0 });
    fireWindow("pointermove", { clientX: 120, clientY: 0 });
    expect(updates(wrapper).length).toBeGreaterThanOrEqual(2);
    expect(updates(wrapper).at(-1)?.[0]).toBe(15);
    expect(wrapper.emitted("commit")).toBeUndefined();

    fireWindow("pointerup", { clientX: 120, clientY: 0 });
    expect(wrapper.emitted("commit")).toEqual([[15]]);
  });

  it("drags leftward as well as rightward, so the gesture is symmetric about its origin", () => {
    const wrapper = mountField({ modelValue: 10, step: 1 });
    const root = wrapper.get(ROOT).element;
    firePointer(root, "pointerdown", { clientX: 100, clientY: 0 });
    fireWindow("pointermove", { clientX: 80, clientY: 0 }); // -20px, -5 steps
    fireWindow("pointerup", { clientX: 80, clientY: 0 });
    expect(wrapper.emitted("commit")).toEqual([[5]]);
  });

  it("Escape mid-drag discards the gesture: the start value is restored transiently and nothing commits", () => {
    const wrapper = mountField({ modelValue: 10, step: 1 });
    const root = wrapper.get(ROOT).element;
    firePointer(root, "pointerdown", { clientX: 100, clientY: 0 });
    fireWindow("pointermove", { clientX: 140, clientY: 0 });
    expect(updates(wrapper).at(-1)?.[0]).not.toBe(10);

    fireWindowKey("Escape");
    expect(updates(wrapper).at(-1)?.[0]).toBe(10);
    expect(wrapper.emitted("commit")).toBeUndefined();

    // The pointerup that follows must not resurrect a commit.
    fireWindow("pointerup", { clientX: 140, clientY: 0 });
    expect(wrapper.emitted("commit")).toBeUndefined();
  });

  it("pointercancel mid-drag discards the gesture the same way Escape does", () => {
    const wrapper = mountField({ modelValue: 10, step: 1 });
    const root = wrapper.get(ROOT).element;
    firePointer(root, "pointerdown", { clientX: 100, clientY: 0 });
    fireWindow("pointermove", { clientX: 140, clientY: 0 });
    fireWindow("pointercancel", { clientX: 140, clientY: 0 });
    expect(updates(wrapper).at(-1)?.[0]).toBe(10);
    expect(wrapper.emitted("commit")).toBeUndefined();
  });

  it("clamps a dragged value to max, and commits the clamped value rather than the raw one", () => {
    const wrapper = mountField({ modelValue: 10, min: 0, max: 12, step: 1 });
    const root = wrapper.get(ROOT).element;
    firePointer(root, "pointerdown", { clientX: 100, clientY: 0 });
    fireWindow("pointermove", { clientX: 1000, clientY: 0 });
    expect(updates(wrapper).at(-1)?.[0]).toBe(12);
    fireWindow("pointerup", { clientX: 1000, clientY: 0 });
    expect(wrapper.emitted("commit")).toEqual([[12]]);
  });

  it("clamps a dragged value to min the same way", () => {
    const wrapper = mountField({ modelValue: 10, min: 8, max: 20, step: 1 });
    const root = wrapper.get(ROOT).element;
    firePointer(root, "pointerdown", { clientX: 100, clientY: 0 });
    fireWindow("pointermove", { clientX: -1000, clientY: 0 });
    expect(updates(wrapper).at(-1)?.[0]).toBe(8);
    fireWindow("pointerup", { clientX: -1000, clientY: 0 });
    expect(wrapper.emitted("commit")).toEqual([[8]]);
  });

  it("a disabled field ignores pointerdown entirely, so no drag can start", () => {
    const wrapper = mountField({ modelValue: 10, disabled: true });
    const root = wrapper.get(ROOT).element;
    firePointer(root, "pointerdown", { clientX: 100, clientY: 0 });
    fireWindow("pointermove", { clientX: 140, clientY: 0 });
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("ignores a non-primary pointer button, leaving the context menu and middle click alone", () => {
    const wrapper = mountField({ modelValue: 10, step: 1 });
    const root = wrapper.get(ROOT).element;
    firePointer(root, "pointerdown", { clientX: 100, clientY: 0, button: 2 });
    fireWindow("pointermove", { clientX: 140, clientY: 0 });
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });
});

describe("NumberField keyboard gesture", () => {
  // Plain arrow ticking is Reka's own behaviour and is not re-tested here.
  // What belongs to this component is the Shift ×10 override and the
  // keyup-to-commit wiring, both exercised through Shift below.
  it("a single Shift+ArrowUp tap ticks by ten steps and commits once, on the keyup", async () => {
    const wrapper = mountField({ modelValue: 10, step: 1 });
    const root = wrapper.get(ROOT);
    await root.trigger("keydown", { key: "ArrowUp", shiftKey: true });
    expect(wrapper.emitted("update:modelValue")).toEqual([[20]]);
    expect(wrapper.emitted("commit")).toBeUndefined();
    await root.trigger("keyup", { key: "ArrowUp" });
    expect(wrapper.emitted("commit")).toEqual([[20]]);
  });

  it("a held Shift+ArrowUp accumulates its repeats and still commits exactly once on the keyup", async () => {
    const wrapper = mountField({ modelValue: 10, step: 1 });
    const root = wrapper.get(ROOT);
    await root.trigger("keydown", { key: "ArrowUp", shiftKey: true }); // 10 → 20
    await root.trigger("keydown", { key: "ArrowUp", shiftKey: true }); // auto-repeat, 20 → 30
    await root.trigger("keydown", { key: "ArrowUp", shiftKey: true }); // 30 → 40
    expect(wrapper.emitted("commit")).toBeUndefined();
    await root.trigger("keyup", { key: "ArrowUp" });
    expect(wrapper.emitted("commit")).toEqual([[40]]);
  });

  it("Shift+ArrowDown ticks negative and clamps at min", async () => {
    const wrapper = mountField({ modelValue: 10, min: 5, step: 1 });
    const root = wrapper.get(ROOT);
    await root.trigger("keydown", { key: "ArrowDown", shiftKey: true });
    expect(wrapper.emitted("update:modelValue")).toEqual([[5]]);
    await root.trigger("keyup", { key: "ArrowDown" });
    expect(wrapper.emitted("commit")).toEqual([[5]]);
  });

  it("multiplies the declared step rather than assuming one, so Shift on a coarse field steps coarsely", async () => {
    const wrapper = mountField({ modelValue: 0, step: 0.25 });
    const root = wrapper.get(ROOT);
    await root.trigger("keydown", { key: "ArrowUp", shiftKey: true });
    expect(updates(wrapper).at(-1)?.[0]).toBeCloseTo(2.5, 10);
  });

  it("a Shift tick at max holds the value at max and commits nothing, because nothing changed", async () => {
    const wrapper = mountField({ modelValue: 12, min: 0, max: 12, step: 1 });
    const root = wrapper.get(ROOT);
    await root.trigger("keydown", { key: "ArrowUp", shiftKey: true });
    expect(updates(wrapper).at(-1)?.[0]).toBe(12);
    await root.trigger("keyup", { key: "ArrowUp" });
    expect(wrapper.emitted("commit")).toBeUndefined();
  });

  it("a Shift tick at min holds the value at min and commits nothing", async () => {
    const wrapper = mountField({ modelValue: 0, min: 0, max: 12, step: 1 });
    const root = wrapper.get(ROOT);
    await root.trigger("keydown", { key: "ArrowDown", shiftKey: true });
    expect(updates(wrapper).at(-1)?.[0]).toBe(0);
    await root.trigger("keyup", { key: "ArrowDown" });
    expect(wrapper.emitted("commit")).toBeUndefined();
  });

  it("a Shift tick one step short of max lands exactly on max instead of overshooting it", async () => {
    const wrapper = mountField({ modelValue: 9, min: 0, max: 12, step: 1 });
    const root = wrapper.get(ROOT);
    await root.trigger("keydown", { key: "ArrowUp", shiftKey: true }); // 9 + 10 = 19, clamped
    expect(updates(wrapper).at(-1)?.[0]).toBe(12);
    await root.trigger("keyup", { key: "ArrowUp" });
    expect(wrapper.emitted("commit")).toEqual([[12]]);
  });

  it("lets the bound win over step alignment when the step does not divide the range evenly", async () => {
    // max 10 with step 3: the nearest step multiples are 9 and 12, and 12 is
    // out of range. The bound is the harder constraint, so the emitted value
    // is the bound itself even though it is not a multiple of the step.
    const wrapper = mountField({ modelValue: 9, min: 1, max: 10, step: 3 });
    const root = wrapper.get(ROOT);
    await root.trigger("keydown", { key: "ArrowUp", shiftKey: true });
    expect(updates(wrapper).at(-1)?.[0]).toBe(10);

    const low = mountField({ modelValue: 9, min: 1, max: 10, step: 3 });
    await low.get(ROOT).trigger("keydown", { key: "ArrowDown", shiftKey: true });
    expect(updates(low).at(-1)?.[0]).toBe(1);
  });

  it("a disabled field ignores Shift+Arrow, so the keyboard path is locked with the pointer one", async () => {
    const wrapper = mountField({ modelValue: 10, disabled: true });
    await wrapper.get(ROOT).trigger("keydown", { key: "ArrowUp", shiftKey: true });
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("Enter commits the current value without waiting for the field to lose focus", async () => {
    const wrapper = mountField({ modelValue: 10, step: 1 });
    const root = wrapper.get(ROOT);
    await root.trigger("keydown", { key: "ArrowUp", shiftKey: true });
    await root.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("commit")).toEqual([[20]]);
  });

  it("commits once across an Enter followed by the blur it usually precedes", async () => {
    const wrapper = mountField({ modelValue: 10, step: 1 });
    const root = wrapper.get(ROOT);
    await root.trigger("keydown", { key: "ArrowUp", shiftKey: true });
    await root.trigger("keydown", { key: "Enter" });
    await root.trigger("focusout", { relatedTarget: null });
    expect(wrapper.emitted("commit")).toEqual([[20]]);
  });

  it("focus passing through with no edit commits nothing", async () => {
    const wrapper = mountField({ modelValue: 10 });
    await wrapper.get(ROOT).trigger("focusout", { relatedTarget: null });
    expect(wrapper.emitted("commit")).toBeUndefined();
  });

  it("holds the commit while focus moves from the input to the stepper inside the same field", async () => {
    const wrapper = mountField({ modelValue: 10, step: 1 });
    const root = wrapper.get(ROOT);
    await root.trigger("keydown", { key: "ArrowUp", shiftKey: true });
    // Focus shifting to a control inside the field is not the end of the edit.
    await root.trigger("focusout", { relatedTarget: wrapper.get("button").element });
    expect(wrapper.emitted("commit")).toBeUndefined();
    await root.trigger("focusout", { relatedTarget: null });
    expect(wrapper.emitted("commit")).toEqual([[20]]);
  });
});

describe("NumberField typed input", () => {
  it("never forwards a non-number when the text in the field does not parse", async () => {
    const wrapper = mountField({ modelValue: 10, min: 0, max: 100 });
    const input = wrapper.get(SPINBUTTON);
    (input.element as HTMLInputElement).value = "abc";
    await input.trigger("blur");
    await wrapper.get(ROOT).trigger("focusout", { relatedTarget: null });

    expect(updates(wrapper).length).toBeGreaterThan(0);
    for (const [value] of updates(wrapper)) {
      expect(Number.isFinite(value)).toBe(true);
    }
    for (const [value] of wrapper.emitted("commit") ?? []) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  it("falls back to min when the field is emptied, so the value it reports is always a number", async () => {
    const wrapper = mountField({ modelValue: 10, min: 4, max: 100 });
    const input = wrapper.get(SPINBUTTON);
    (input.element as HTMLInputElement).value = "";
    await input.trigger("blur");
    expect(updates(wrapper).at(-1)?.[0]).toBe(4);
  });

  it("falls back to zero when the field is emptied and no min is declared", async () => {
    const wrapper = mountField({ modelValue: 10 });
    const input = wrapper.get(SPINBUTTON);
    (input.element as HTMLInputElement).value = "";
    await input.trigger("blur");
    expect(updates(wrapper).at(-1)?.[0]).toBe(0);
  });
});

describe("NumberField spinbutton contract", () => {
  it("exposes the value and both bounds on the spinbutton, which is where a screen reader reads them", () => {
    const wrapper = mountField({ modelValue: 42, min: -180, max: 180 });
    const input = wrapper.get(SPINBUTTON);
    expect(input.attributes("aria-valuenow")).toBe("42");
    expect(input.attributes("aria-valuemin")).toBe("-180");
    expect(input.attributes("aria-valuemax")).toBe("180");
  });

  it("marks the group aria-disabled and the input disabled when the field is unavailable", () => {
    const wrapper = mountField({ modelValue: 10, disabled: true });
    expect(wrapper.get(ROOT).attributes("aria-disabled")).toBe("true");
    expect(wrapper.get(SPINBUTTON).attributes("disabled")).toBeDefined();
  });

  it("paints the destructive border on the group and sets aria-invalid on the spinbutton", () => {
    const wrapper = mountField({ invalid: true });
    expect(wrapper.get(ROOT).classes()).toContain("border-destructive");
    expect(wrapper.get(SPINBUTTON).attributes("aria-invalid")).toBe("true");

    const quiet = mountField();
    expect(quiet.get(ROOT).classes()).not.toContain("border-destructive");
    expect(quiet.get(SPINBUTTON).attributes("aria-invalid")).toBeUndefined();
  });

  it("hides the unit from assistive technology, because it is a suffix rather than part of the value", () => {
    const wrapper = mountField({ unit: "px" });
    const unit = wrapper.findAll("span").find((span) => span.text() === "px");
    expect(unit?.attributes("aria-hidden")).toBe("true");
    expect(wrapper.get(SPINBUTTON).attributes("aria-valuenow")).toBe("10");
  });

  it("draws both stepper chevrons at the stroke width a 12px glyph needs to stay legible", () => {
    const glyphs = mountField().findAll("svg");
    expect(glyphs).toHaveLength(2); // increment and decrement
    for (const glyph of glyphs) {
      expect(glyph.classes()).toContain("h-3"); // the 12px box the rule applies to
      expect(glyph.attributes("stroke-width")).toBe("2.5");
    }
  });
});

describe("NumberField attribute routing", () => {
  it("merges a caller's class onto the group so it beats the group's own sizing", () => {
    const wrapper = mountField();
    expect(wrapper.get(ROOT).classes()).toContain("w-full");

    const sized = mount(NumberField, { props: { modelValue: 10 }, attrs: { class: "w-24" } });
    const root = sized.get(ROOT);
    expect(root.classes()).toContain("w-24");
    // The merge is Tailwind-aware, so the group's own width is dropped rather
    // than left to fight the caller's in declaration order.
    expect(root.classes()).not.toContain("w-full");
  });

  it("routes every other fallthrough attribute to the spinbutton, which is the control being described", () => {
    const wrapper = mount(NumberField, {
      props: { modelValue: 10 },
      attrs: { class: "w-24", "aria-labelledby": "x-label", "data-testid": "x-field" },
    });
    const input = wrapper.get(SPINBUTTON);
    expect(input.attributes("aria-labelledby")).toBe("x-label");
    expect(input.attributes("data-testid")).toBe("x-field");
    // …and the class does not follow them there.
    expect(input.classes()).not.toContain("w-24");
    expect(wrapper.get(ROOT).attributes("aria-labelledby")).toBeUndefined();
  });
});

describe("NumberField external value sync", () => {
  it("reflects a host-driven modelValue change when no edit is pending", async () => {
    const wrapper = mountField({ modelValue: 10 });
    await wrapper.setProps({ modelValue: 42 });
    expect(wrapper.get("input").element.value).toBe("42");
  });

  it("does not let the host echoing a transient value back down swallow the gesture's commit", async () => {
    const wrapper = mountField({ modelValue: 10, step: 1 });
    const root = wrapper.get(ROOT).element;
    firePointer(root, "pointerdown", { clientX: 100, clientY: 0 });
    fireWindow("pointermove", { clientX: 120, clientY: 0 }); // → 15, transient
    // The host round-trips that transient value back as a prop, mid-gesture.
    await wrapper.setProps({ modelValue: 15 });
    fireWindow("pointerup", { clientX: 120, clientY: 0 });
    expect(wrapper.emitted("commit")).toEqual([[15]]);
  });
});

describe("NumberField unmount cleanliness", () => {
  it("unmounting mid-drag detaches the window listeners the gesture attached", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const wrapper = mountField({ modelValue: 10, step: 1 });
    const root = wrapper.get(ROOT).element;
    firePointer(root, "pointerdown", { clientX: 100, clientY: 0 });
    fireWindow("pointermove", { clientX: 120, clientY: 0 }); // enters the drag, attaches the listeners
    removeSpy.mockClear();
    wrapper.unmount();
    expect(removeSpy).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("pointerup", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("pointercancel", expect.any(Function));

    // A stray event after unmount must not resurrect a commit.
    fireWindow("pointerup", { clientX: 200, clientY: 0 });
    expect(wrapper.emitted("commit")).toBeUndefined();
    removeSpy.mockRestore();
  });
});

describe("NumberField read-only", () => {
  it("stays a Tab stop and stays enabled, where a disabled field is neither", () => {
    // The two are different states, not two dials on one: a read-only value is
    // on show and reachable by keyboard, a disabled one is unavailable.
    const readOnly = mount(NumberField, {
      props: { modelValue: 10, readonly: true },
      attachTo: document.body,
    });
    const input = readOnly.get(SPINBUTTON).element as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);
    expect(input.readOnly).toBe(true);
    expect(input.disabled).toBe(false);

    // The disabled half is asserted on the property rather than by focusing:
    // Reka writes an explicit `tabindex` on the spinbutton, and jsdom's
    // focusable-area rule answers `true` for anything carrying one before it
    // ever looks at `disabled`. A browser refuses the focus; jsdom would grant
    // it, so a focus assertion here would pin the stub rather than the rule.
    const disabled = mount(NumberField, { props: { modelValue: 10, disabled: true } });
    expect((disabled.get(SPINBUTTON).element as HTMLInputElement).disabled).toBe(true);
  });

  it("is filled rather than dimmed, so it does not read as unavailable", () => {
    const readOnly = mountField({ readonly: true });
    expect(readOnly.get(ROOT).classes()).toContain("bg-muted");
    expect(readOnly.get(ROOT).classes()).not.toContain("opacity-50");
    // A read-only value is on show: its text stays where an editable one is.
    expect(readOnly.get(SPINBUTTON).classes()).toContain("text-foreground");
    expect(readOnly.get(ROOT).attributes("data-readonly")).toBeDefined();

    const editable = mountField();
    expect(editable.get(ROOT).classes()).not.toContain("bg-muted");
    expect(editable.get(ROOT).attributes("data-readonly")).toBeUndefined();
  });

  // The defect this pins: `opacity-50` on the box faded the value inside it —
  // `--color-foreground` is 14.09:1 on the resting fill and 2.99:1 once
  // composited at half alpha, with the unit suffix beside it down at 2.02:1.
  // The state is a drained fill now, and the number keeps a measured 4.67:1.
  it("drains an unavailable field in colour rather than fading its value", () => {
    const disabled = mountField({ disabled: true, unit: "px" });
    expect(disabled.get(ROOT).classes()).not.toContain("opacity-50");
    expect(disabled.get(ROOT).classes()).toContain("bg-muted");

    // On the input rather than inherited from the box: the input names
    // `text-foreground` itself, and a colour set on an ancestor is only
    // inherited — it would lose to that declaration every time. `cn()` is what
    // keeps the pair to one class rather than two for the stylesheet to order.
    const input = disabled.get(SPINBUTTON);
    expect(input.classes()).toContain("text-muted-foreground");
    expect(input.classes()).not.toContain("text-foreground");
    expect(input.classes()).toContain("cursor-not-allowed");
  });

  it("takes no scrub: the pointer places a caret instead of running the value", () => {
    const wrapper = mountField({ readonly: true, step: 1 });
    const root = wrapper.get(ROOT).element;
    firePointer(root, "pointerdown", { clientX: 100, clientY: 0 });
    fireWindow("pointermove", { clientX: 140, clientY: 0 });
    fireWindow("pointerup", { clientX: 140, clientY: 0 });
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("commit")).toBeUndefined();
    expect(wrapper.get(SPINBUTTON).classes()).not.toContain("cursor-ew-resize");
  });

  it("takes no Shift+Arrow either, so the keyboard cannot edit what the pointer cannot", async () => {
    const wrapper = mountField({ readonly: true, step: 1 });
    await wrapper.get(ROOT).trigger("keydown", { key: "ArrowUp", shiftKey: true });
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("renders no stepper, rather than two buttons that answer by doing nothing", () => {
    expect(mountField({ readonly: true }).findAll("button")).toHaveLength(0);
    expect(mountField().findAll("button")).toHaveLength(2);
  });
});

// A stand-in for the Field wrapping this control. Field itself is a
// project-internal collaborator, and its own behaviour — which id it mints,
// when it publishes a description — is pinned in `Field.test.ts`. What matters
// here is the other half: that this control reads a row it is inside at all.
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
    return () => h("div", slots.default?.());
  },
});

function mountRow(
  rowProps: Partial<InstanceType<typeof ProbeRow>["$props"]> = {},
  control: VNode = h(NumberField, { modelValue: 10 }),
  into: Element = document.body,
) {
  return mount(ProbeRow, { props: rowProps, slots: { default: control }, attachTo: into });
}

describe("NumberField inside a Field", () => {
  it("takes its id, description, required and invalid state from the row it sits in", () => {
    const row = mountRow({
      controlId: "rotation",
      describedBy: "rotation-description",
      required: true,
      invalid: true,
    });
    const input = row.get(SPINBUTTON);

    expect(input.attributes("id")).toBe("rotation");
    expect(input.attributes("aria-describedby")).toBe("rotation-description");
    expect(input.attributes("aria-required")).toBe("true");
    expect(input.attributes("aria-invalid")).toBe("true");
    // The destructive border is painted on the group, so the row's error has
    // to reach that node too rather than only the spinbutton inside it.
    expect(row.get(ROOT).classes()).toContain("border-destructive");
  });

  it("takes the row's disabled and read-only states, which stay different states", () => {
    const disabled = mountRow({ disabled: true });
    expect(disabled.get(SPINBUTTON).attributes("disabled")).toBeDefined();

    const readOnly = mountRow({ readonly: true });
    const input = readOnly.get(SPINBUTTON).element as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    expect(input.disabled).toBe(false);
    expect(readOnly.get(ROOT).classes()).toContain("bg-muted");
  });

  it("lets an explicit prop overrule the row in both directions", () => {
    const optedOut = mountRow(
      { invalid: true, disabled: true, readonly: true },
      h(NumberField, { modelValue: 10, invalid: false, disabled: false, readonly: false }),
    );
    const optedOutInput = optedOut.get(SPINBUTTON).element as HTMLInputElement;
    expect(optedOut.get(SPINBUTTON).attributes("aria-invalid")).toBeUndefined();
    expect(optedOutInput.disabled).toBe(false);
    expect(optedOutInput.readOnly).toBe(false);
    expect(optedOut.get(ROOT).classes()).not.toContain("border-destructive");

    const optedIn = mountRow({}, h(NumberField, { modelValue: 10, invalid: true, readonly: true }));
    expect(optedIn.get(SPINBUTTON).attributes("aria-invalid")).toBe("true");
    expect((optedIn.get(SPINBUTTON).element as HTMLInputElement).readOnly).toBe(true);
  });

  it("keeps a caller's own id, so the row never moves a label or a selector they published", () => {
    const row = mountRow(
      { controlId: "rotation" },
      h(NumberField, { modelValue: 10, id: "chosen-by-the-host" }),
    );
    expect(row.get(SPINBUTTON).attributes("id")).toBe("chosen-by-the-host");
  });

  it("adds the row's description to one the caller already set rather than replacing it", () => {
    const row = mountRow(
      { describedBy: "rotation-description" },
      h(NumberField, { modelValue: 10, "aria-describedby": "scrub-hint" }),
    );
    expect(row.get(SPINBUTTON).attributes("aria-describedby")).toBe(
      "scrub-hint rotation-description",
    );
  });

  it("posts the raw number under the row's name, never the formatted text on screen", async () => {
    const form = attachToBody(document.createElement("form"));
    const row = mountRow({ name: "width" }, h(NumberField, { modelValue: 1234 }), form);
    await nextTick();

    // The whole reason the row's name is given to the root rather than spread
    // onto the spinbutton with the rest of the resolved bag: the spinbutton
    // holds the *formatted* number, so a `name` on it would post `1,234`.
    expect(row.get(SPINBUTTON).attributes("name")).toBeUndefined();
    expect((row.get(SPINBUTTON).element as HTMLInputElement).value).toBe("1,234");
    const submitted = form.querySelector<HTMLInputElement>('input[name="width"]');
    expect(submitted?.value).toBe("1234");
  });

  it("adds nothing at all when there is no row above it", () => {
    const bare = mountField();
    const input = bare.get(SPINBUTTON);

    expect(input.attributes("id")).toBeUndefined();
    expect(input.attributes("name")).toBeUndefined();
    expect(input.attributes("aria-describedby")).toBeUndefined();
    expect(input.attributes("aria-required")).toBeUndefined();
    expect(input.attributes("aria-invalid")).toBeUndefined();
    expect(bare.get(ROOT).attributes("data-readonly")).toBeUndefined();
  });
});

describe("NumberField clamping under arbitrary props", () => {
  // Finite inputs only: a NaN model value is not a valid host input, and what
  // the component does with one is a separate question.
  const num = fc.float({ min: -1_000_000, max: 1_000_000, noNaN: true });
  const minMax = fc.tuple(num, num).filter(([min, max]) => min <= max);
  const step = fc.float({ min: Math.fround(0.001), max: Math.fround(10_000), noNaN: true });

  // Dispatched synchronously on the root rather than through test-utils' async
  // trigger, so the property's predicate can stay synchronous.
  function tickShiftArrow(root: Element, key: "ArrowUp" | "ArrowDown") {
    root.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key, shiftKey: true }),
    );
  }

  it("never emits a value outside the declared bounds, for any value, bounds and step", () => {
    fc.assert(
      fc.property(
        num,
        minMax,
        step,
        fc.constantFrom<"ArrowUp" | "ArrowDown">("ArrowUp", "ArrowDown"),
        (modelValue, [min, max], step, key) => {
          const wrapper = mountField({ modelValue, min, max, step });
          tickShiftArrow(wrapper.get(ROOT).element, key);
          const value = updates(wrapper).at(-1)?.[0];
          expect(typeof value).toBe("number");
          expect(Number.isFinite(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(min);
          expect(value).toBeLessThanOrEqual(max);
          wrapper.unmount();
        },
      ),
      // A hundred mounts of a small component costs about a second; more runs
      // would only re-sample the same clamp arithmetic.
      { numRuns: 100 },
    );
  });
});

/** A host declaring an application-wide vocabulary above the control. */
const LabelHost = defineComponent({
  props: {
    vocabulary: { type: Function as PropType<() => LoomLabelOverrides>, required: true },
  },
  setup(props, { slots }) {
    provideLoomLabels(() => props.vocabulary());
    return () => h("div", slots.default?.());
  },
});

/** The stepper's two buttons, in document order. */
function stepperNames(wrapper: {
  findAll: (s: string) => { attributes: (n: string) => string | undefined }[];
}) {
  return wrapper.findAll("button").map((b) => b.attributes("aria-label"));
}

describe("NumberField labels", () => {
  it("names both spinners and the field itself from its own English", () => {
    const wrapper = mountField();
    expect(stepperNames(wrapper)).toEqual(["Increase value", "Decrease value"]);
    // Reka's own are the bare verbs, written inside its render function with no
    // prop to reach them by. A dropped binding falls back to those rather than
    // to an unnamed button, which is why the wording differs deliberately.
    for (const name of stepperNames(wrapper)) {
      expect(name).not.toMatch(/^(Increase|Decrease)$/);
    }
    expect(wrapper.get(SPINBUTTON).attributes("aria-roledescription")).toBe("Number field");
  });

  it("replaces every one of them when a caller hands it a bag", () => {
    const wrapper = mountField({
      labels: { increment: "Tăng", decrement: "Giảm", roleDescription: "Ô số" },
    });
    expect(stepperNames(wrapper)).toEqual(["Tăng", "Giảm"]);
    expect(wrapper.get(SPINBUTTON).attributes("aria-roledescription")).toBe("Ô số");
    // Replacing the name leaves everything else Reka publishes about the
    // spinbutton intact — the override is not a whole-props takeover.
    expect(wrapper.get(SPINBUTTON).attributes("aria-valuenow")).toBe("10");
  });

  it("keeps the keys a caller left out in English instead of blanking them", () => {
    const wrapper = mountField({ labels: { increment: "Tăng" } });
    expect(stepperNames(wrapper)).toEqual(["Tăng", "Decrease value"]);
    expect(wrapper.get(SPINBUTTON).attributes("aria-roledescription")).toBe("Number field");
  });

  it("takes its names from a host's vocabulary, and lets one instance correct one key", () => {
    const wrapper = mount(LabelHost, {
      props: {
        vocabulary: () => ({ numberField: { increment: "Tăng", roleDescription: "Ô số" } }),
      },
      slots: {
        default: () => [
          h(NumberField, { modelValue: 10 }),
          // The per-instance case: a field whose number is a rotation, which no
          // application-wide vocabulary can know.
          h(NumberField, { modelValue: 10, labels: { roleDescription: "Góc xoay" } }),
        ],
      },
    });
    const fields = wrapper.findAll('[role="spinbutton"]');
    expect(fields[0]!.attributes("aria-roledescription")).toBe("Ô số");
    expect(fields[1]!.attributes("aria-roledescription")).toBe("Góc xoay");
    // The vocabulary still reaches the key neither instance touched.
    expect(stepperNames(wrapper)).toEqual(["Tăng", "Decrease value", "Tăng", "Decrease value"]);
  });

  it("repaints its names when the host switches language under it", async () => {
    const locale = ref("en");
    const wrapper = mount(LabelHost, {
      props: {
        vocabulary: () => (locale.value === "en" ? {} : { numberField: { increment: "Tăng" } }),
      },
      slots: { default: () => h(NumberField, { modelValue: 10 }) },
    });
    expect(stepperNames(wrapper)[0]).toBe("Increase value");

    locale.value = "vi";
    await nextTick();

    // The assertion that fails the moment a label is read once in `setup`
    // instead of through `text.` inside the render.
    expect(stepperNames(wrapper)[0]).toBe("Tăng");
  });

  it("lets a caller's own aria-roledescription attribute still beat the resolved label", () => {
    // The binding sits before the fallthrough spread precisely so this works:
    // it is there to defeat Reka's literal, not the caller's.
    const wrapper = mount(NumberField, {
      props: { modelValue: 10 },
      attrs: { "aria-roledescription": "Rotation" },
    });
    expect(wrapper.get(SPINBUTTON).attributes("aria-roledescription")).toBe("Rotation");
  });
});
