import { mount } from "@vue/test-utils";
import { SliderRoot } from "reka-ui";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import Slider from "./Slider.vue";
import { provideFieldContext } from "../../lib/field-context";

// A stand-in for the Field wrapping this control. Field's own behaviour is
// pinned in `Field.test.ts`; what matters here is that the slider reads a row
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

// jsdom has no ResizeObserver, and Reka's thumb measures itself with one on
// mount. Reka is the real thing under test here, so the gap is stubbed rather
// than mocked around.
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

function mountSlider(props: Partial<InstanceType<typeof Slider>["$props"]> = {}) {
  return mount(Slider, { props: { modelValue: 0.5, min: 0, max: 1, step: 0.01, ...props } });
}

// Reka's root drives pointer capture and layout arithmetic off
// `getBoundingClientRect`, neither of which jsdom lays out, so a true
// pointerdown/move/up simulation is not available here. These drive the root's
// own event boundary instead: `update:modelValue` is what Reka emits on each
// drag tick, `valueCommit` is what it emits at release — and only if it sees
// the value actually changed, which is the whole reason the buffer exists.
function findRoot(wrapper: ReturnType<typeof mountSlider>) {
  return wrapper.getComponent(SliderRoot);
}

// `$emit` returns void, so it cannot be awaited to flush the render it causes.
// The tick has to be waited for separately, and every caller needs it.
async function emitFromRoot(
  root: ReturnType<typeof findRoot>,
  event: string,
  payload: number[],
): Promise<void> {
  root.vm.$emit(event, payload);
  await nextTick();
}

// The abort path needs a real pointerdown, since that is what arms its window
// listeners. The thumb is the target: Reka's own handler there only focuses
// the thumb — no layout arithmetic jsdom cannot do — and the event still
// bubbles to the root where this component listens.
async function startDrag(wrapper: ReturnType<typeof mountSlider>) {
  const thumb = wrapper.get('[role="slider"]');
  (thumb.element as HTMLElement).setPointerCapture = () => {
    /* jsdom has no pointer capture */
  };
  await thumb.trigger("pointerdown");
}

describe("Slider drag gesture", () => {
  it("streams update:modelValue on every tick and feeds the value back into the root, so the drag cannot snap back", async () => {
    const wrapper = mountSlider({ modelValue: 0.5 });
    const root = findRoot(wrapper);

    await emitFromRoot(root, "update:modelValue", [0.6]);
    await emitFromRoot(root, "update:modelValue", [0.7]);

    expect(wrapper.emitted("update:modelValue")).toEqual([[0.6], [0.7]]);
    // The host never echoes a transient value back down, so `modelValue` is
    // still 0.5 — but the root has to see the drag's real position or it can
    // never detect a change at release.
    expect(root.props("modelValue")).toEqual([0.7]);
    expect(wrapper.emitted("commit")).toBeUndefined();
  });

  it("commits exactly once on release, carrying the final dragged value", async () => {
    const wrapper = mountSlider({ modelValue: 0.5 });
    const root = findRoot(wrapper);

    await emitFromRoot(root, "update:modelValue", [0.6]);
    await emitFromRoot(root, "update:modelValue", [0.82]);
    await emitFromRoot(root, "valueCommit", [0.82]);

    expect(wrapper.emitted("commit")).toEqual([[0.82]]);
  });

  it("a drag that ends back at its start value commits nothing", async () => {
    const wrapper = mountSlider({ modelValue: 0.5 });
    const root = findRoot(wrapper);

    await emitFromRoot(root, "update:modelValue", [0.6]);
    await emitFromRoot(root, "update:modelValue", [0.5]); // back to the start
    // Reka's own comparison closes here, so there is no valueCommit to forward.

    expect(wrapper.emitted("commit")).toBeUndefined();
  });

  it("Escape mid-drag aborts: one reset tick with the committed value, and the release commit swallowed", async () => {
    const wrapper = mountSlider({ modelValue: 0.5 });
    const root = findRoot(wrapper);
    await startDrag(wrapper);

    await emitFromRoot(root, "update:modelValue", [0.6]);
    await emitFromRoot(root, "update:modelValue", [0.7]);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }));
    await nextTick();

    // The reset tick restores the host's preview and feeds the committed value
    // back into the root, which closes its own change check.
    expect(wrapper.emitted("update:modelValue")).toEqual([[0.6], [0.7], [0.5]]);
    expect(root.props("modelValue")).toEqual([0.5]);

    // Ticks after the Escape must not resurrect the gesture, and even a
    // commit from Reka is swallowed until the pointer releases.
    await emitFromRoot(root, "update:modelValue", [0.8]);
    await emitFromRoot(root, "valueCommit", [0.8]);
    expect(wrapper.emitted("update:modelValue")).toHaveLength(3);
    expect(wrapper.emitted("commit")).toBeUndefined();

    // The release re-arms: the next step commits normally again.
    window.dispatchEvent(new Event("pointerup"));
    await emitFromRoot(root, "update:modelValue", [0.51]);
    await emitFromRoot(root, "valueCommit", [0.51]);
    expect(wrapper.emitted("commit")).toEqual([[0.51]]);
  });

  it("pointercancel mid-drag aborts the same way, and no commit ever fires for that gesture", async () => {
    const wrapper = mountSlider({ modelValue: 0.5 });
    const root = findRoot(wrapper);
    await startDrag(wrapper);

    await emitFromRoot(root, "update:modelValue", [0.6]);
    window.dispatchEvent(new Event("pointercancel"));
    await nextTick();

    expect(wrapper.emitted("update:modelValue")).toEqual([[0.6], [0.5]]);
    expect(root.props("modelValue")).toEqual([0.5]);
    expect(wrapper.emitted("commit")).toBeUndefined();
  });

  it("an Escape with no drag under way changes nothing, so the key stays free for the surface around it", async () => {
    const wrapper = mountSlider({ modelValue: 0.5 });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }));
    await nextTick();
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("commit")).toBeUndefined();
  });

  it("a keyboard step is forwarded unchanged, commit and all", async () => {
    const wrapper = mountSlider({ modelValue: 0.5 });
    const root = findRoot(wrapper);

    // One arrow-key tick: Reka updates and commits in a single synchronous
    // call, with no preceding transient tick.
    await emitFromRoot(root, "update:modelValue", [0.51]);
    await emitFromRoot(root, "valueCommit", [0.51]);

    expect(wrapper.emitted("update:modelValue")).toEqual([[0.51]]);
    expect(wrapper.emitted("commit")).toEqual([[0.51]]);
  });

  it("a disabled slider arms no abort listeners, because it can never start a drag", async () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const wrapper = mountSlider({ disabled: true });
    addSpy.mockClear();
    await startDrag(wrapper);
    expect(addSpy).not.toHaveBeenCalledWith("pointerup", expect.any(Function));
    expect(addSpy).not.toHaveBeenCalledWith("pointercancel", expect.any(Function));
    addSpy.mockRestore();
  });
});

describe("Slider value model", () => {
  it("exposes a scalar while feeding Reka the array it models values with", () => {
    const wrapper = mountSlider({ modelValue: 0.42 });
    expect(findRoot(wrapper).props("modelValue")).toEqual([0.42]);
  });

  it("feeds an empty value set when no model value is given, rather than a hole inside one", () => {
    const wrapper = mount(Slider);
    expect(findRoot(wrapper).props("modelValue")).toEqual([]);
  });

  it("reflects a host-driven change while idle, so an external commit moves the thumb", async () => {
    const wrapper = mountSlider({ modelValue: 0.5 });
    await wrapper.setProps({ modelValue: 0.9 });
    expect(findRoot(wrapper).props("modelValue")).toEqual([0.9]);
  });

  it("defaults to the 0…1 range at a hundredth per step, the shape of a ratio", () => {
    const root = findRoot(mount(Slider, { props: { modelValue: 0.5 } }));
    expect(root.props("min")).toBe(0);
    expect(root.props("max")).toBe(1);
    expect(root.props("step")).toBe(0.01);
  });
});

describe("Slider accessibility contract", () => {
  it("exposes the value and both bounds on the thumb, which is the slider a screen reader reads", async () => {
    const wrapper = mountSlider({ modelValue: 0.25, min: 0, max: 1 });
    // Reka resolves the thumb's index against its collection after mount, and
    // `aria-valuenow` is read out of that index.
    await nextTick();
    const thumb = wrapper.get('[role="slider"]');
    expect(thumb.attributes("aria-valuenow")).toBe("0.25");
    expect(thumb.attributes("aria-valuemin")).toBe("0");
    expect(thumb.attributes("aria-valuemax")).toBe("1");
  });

  it("takes the thumb out of the tab order when disabled, so a locked control cannot be focused", () => {
    const wrapper = mountSlider({ disabled: true });
    const thumb = wrapper.get('[role="slider"]');
    expect(thumb.attributes("data-disabled")).toBeDefined();
    expect(thumb.attributes("tabindex")).not.toBe("0");
  });
});

describe("Slider attribute routing", () => {
  it("merges a caller's class onto the root, which is the element the parent's layout sizes", () => {
    const wrapper = mount(Slider, { props: { modelValue: 0.5 }, attrs: { class: "w-40" } });
    expect(wrapper.classes()).toContain("w-40");
    // The merge is Tailwind-aware, so the root's own width gives way instead
    // of fighting the caller's in declaration order.
    expect(wrapper.classes()).not.toContain("w-full");
    expect(wrapper.get('[role="slider"]').classes()).not.toContain("w-40");
  });

  it("routes every other fallthrough attribute to the thumb, the element those attributes describe", () => {
    const wrapper = mount(Slider, {
      props: { modelValue: 0.5 },
      attrs: { class: "w-40", "aria-labelledby": "volume-label", "data-testid": "volume" },
    });
    const thumb = wrapper.get('[role="slider"]');
    expect(thumb.attributes("aria-labelledby")).toBe("volume-label");
    expect(thumb.attributes("data-testid")).toBe("volume");
  });
});

describe("Slider inside a Field", () => {
  it("takes its id, description, name, required and invalid state from the row it sits in", () => {
    const row = mount(ProbeRow, {
      props: {
        controlId: "volume",
        describedBy: "volume-description",
        name: "volume",
        required: true,
        invalid: true,
      },
      slots: { default: h(Slider, { modelValue: 0.5 }) },
    });
    // The thumb is the `role="slider"` element, so it is what the row's id,
    // description and state have to land on — not the box around it.
    const thumb = row.get('[role="slider"]');
    expect(thumb.attributes("id")).toBe("volume");
    expect(thumb.attributes("aria-describedby")).toBe("volume-description");
    expect(thumb.attributes("aria-required")).toBe("true");
    expect(thumb.attributes("aria-invalid")).toBe("true");

    // The name posts the scalar this control exposes, under the row's own
    // name — not the `volume[0]` Reka's array-shaped hidden input would.
    const hidden = row.get('input[type="hidden"]');
    expect((hidden.element as HTMLInputElement).name).toBe("volume");
    expect((hidden.element as HTMLInputElement).value).toBe("0.5");
    expect(thumb.attributes("name")).toBeUndefined();
  });

  it("lets an explicit disabled overrule the row in both directions", () => {
    const optedOut = mount(ProbeRow, {
      props: { disabled: true },
      slots: { default: h(Slider, { modelValue: 0.5, disabled: false }) },
    });
    expect(optedOut.get('[role="slider"]').attributes("data-disabled")).toBeUndefined();

    const optedIn = mount(ProbeRow, {
      slots: { default: h(Slider, { modelValue: 0.5, disabled: true }) },
    });
    expect(optedIn.get('[role="slider"]').attributes("data-disabled")).toBeDefined();
  });

  it("adds the row's description to one the caller already set rather than replacing it", () => {
    const row = mount(ProbeRow, {
      props: { describedBy: "volume-description" },
      slots: { default: h(Slider, { modelValue: 0.5, "aria-describedby": "volume-caveat" }) },
    });
    expect(row.get('[role="slider"]').attributes("aria-describedby")).toBe(
      "volume-caveat volume-description",
    );
  });

  // A track that shows a value and refuses to move is a Progress bar wearing a
  // thumb, so a row's `readonly` must arrive as nothing at all — and above all
  // must not quietly become `disabled`.
  it("ignores a row's readonly rather than approximating it", () => {
    const row = mount(ProbeRow, {
      props: { readonly: true },
      slots: { default: h(Slider, { modelValue: 0.5 }) },
    });
    const thumb = row.get('[role="slider"]');
    expect(thumb.attributes("data-disabled")).toBeUndefined();
    expect(thumb.attributes("aria-readonly")).toBeUndefined();
  });

  // Every key that resolved to nothing is dropped from the bag, so a slider
  // with no row above it renders exactly what it rendered before the context
  // existed.
  it("outside any Field adds nothing of its own", () => {
    const wrapper = mountSlider({ modelValue: 0.5 });
    const thumb = wrapper.get('[role="slider"]');
    for (const attribute of ["id", "name", "aria-describedby", "aria-required", "aria-invalid"]) {
      expect(thumb.attributes(attribute)).toBeUndefined();
    }
    expect(wrapper.find('input[type="hidden"]').exists()).toBe(false);
  });
});

describe("Slider unmount cleanliness", () => {
  it("unmounting mid-drag detaches the window listeners the gesture attached", async () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const wrapper = mountSlider({ modelValue: 0.5 });
    await startDrag(wrapper);
    removeSpy.mockClear();
    wrapper.unmount();
    expect(removeSpy).toHaveBeenCalledWith("pointerup", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("pointercancel", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function), true);
    removeSpy.mockRestore();
  });
});
