import { mount, type VueWrapper } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import Fieldset from "./Fieldset.vue";
import ColorPicker from "../ColorPicker/ColorPicker.vue";
import DatePicker from "../DatePicker/DatePicker.vue";
import DateRangePicker from "../DateRangePicker/DateRangePicker.vue";
import DateTimePicker from "../DateTimePicker/DateTimePicker.vue";
import DateTimeRangePicker from "../DateTimeRangePicker/DateTimeRangePicker.vue";
import Editable from "../Editable/Editable.vue";
import FileUpload from "../FileUpload/FileUpload.vue";
import NumberField from "../NumberField/NumberField.vue";
import Rating from "../Rating/Rating.vue";
import SegmentedControl from "../SegmentedControl/SegmentedControl.vue";
import Slider from "../Slider/Slider.vue";
import TagsInput from "../TagsInput/TagsInput.vue";
import TextField from "../TextField/TextField.vue";
import TimePicker from "../TimePicker/TimePicker.vue";

/**
 * What a `<fieldset disabled>` does to the controls inside it, asserted on the
 * real components rather than on a probe — which is the point of the file.
 *
 * The regression this pins was invisible to every unit test in the library and
 * to the `axe` gate alike. Each control's own suite mounts it with `disabled`
 * set as a prop and passes; axe exempts a disabled control from 1.4.3 and never
 * looks. The state only goes missing at the seam between two components, and
 * the seam is what an integration file is for.
 *
 * There is no third case here for "disabled by its own prop". Every control
 * already has one in its own suite, and duplicating it would make this file a
 * second place to update when a treatment moves.
 */

// jsdom has no ResizeObserver, and several of these measure themselves with one
// on mount. Reka and SegmentedControl's indicator are the real things under
// test, so the gap is stubbed rather than mocked around.
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

function inGroup(
  component: unknown,
  props: Record<string, unknown>,
  disabled: boolean,
): VueWrapper {
  return mount(
    defineComponent({
      render: () =>
        h(
          Fieldset,
          { legend: "Preferences", disabled },
          { default: () => h(component as never, { ariaLabel: "Control", ...props }) },
        ),
    }),
    { attachTo: document.body },
  );
}

/** The mounted DOM, typed — `VueWrapper`'s own `element` is `any`. */
function rootOf(wrapper: VueWrapper): HTMLElement {
  return wrapper.element as HTMLElement;
}

/**
 * What Tab can still land on, which is not the same question as what carries
 * `tabindex="0"`. Reka leaves that attribute on NumberField's spinbutton
 * whatever the state, and it costs nothing there because the node is an
 * `<input>` the fieldset has genuinely disabled — a disabled form control is
 * out of the tab order however it is marked up. What must not survive is a
 * `tabindex="0"` on something the platform never disabled, which is exactly the
 * shape this regression left on every Reka role-based root.
 */
function tabStopsIn(root: HTMLElement): Element[] {
  const candidates = root.querySelectorAll(
    'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  return Array.from(candidates).filter((element) => !element.matches(":disabled"));
}

/**
 * The controls whose unavailable appearance is *computed*, because the platform
 * could not disable them on its own — Reka renders each around a
 * `<span role="slider">`, a `<div role="spinbutton">` or a roving-focus
 * container, and a `<fieldset disabled>` reaches none of those. Every one reads
 * the group off the DOM and resolves it into the same `disabled` its own prop
 * feeds, so `data-disabled` is the single marker that says the state arrived.
 */
const computed: [string, unknown, Record<string, unknown>][] = [
  ["NumberField", NumberField, { modelValue: 5 }],
  [
    "SegmentedControl",
    SegmentedControl,
    { modelValue: "a", options: [{ value: "a", label: "A" }] },
  ],
  ["Slider", Slider, { modelValue: 0.5 }],
  ["Rating", Rating, { modelValue: 3 }],
  ["DatePicker", DatePicker, {}],
  ["DateRangePicker", DateRangePicker, {}],
  ["DateTimePicker", DateTimePicker, {}],
  ["DateTimeRangePicker", DateTimeRangePicker, {}],
  ["TimePicker", TimePicker, {}],
  ["ColorPicker", ColorPicker, {}],
  ["FileUpload", FileUpload, {}],
];

/**
 * The controls the platform disables correctly on its own — everything they
 * render that a reader can reach is an `<input>` or a `<button>` — so only the
 * paint was missing, and it is a CSS variant reading the same fieldset the
 * browser read. `in-[fieldset:disabled]:` rather than `has-[:disabled]:`: the
 * proxy form is wrong wherever a control holds a part that disables itself, and
 * NumberField's increment button does exactly that at `max`.
 */
const painted: [string, unknown, Record<string, unknown>, string][] = [
  ["TextField", TextField, {}, "input"],
  ["TagsInput", TagsInput, { modelValue: ["one"] }, "input"],
  ["Editable", Editable, { modelValue: "Title" }, "input"],
];

/** The library's disabled row, as the three painted controls spell it. */
const TREATMENT = [
  "in-[fieldset:disabled]:bg-muted",
  "in-[fieldset:disabled]:text-muted-foreground",
  "in-[fieldset:disabled]:border-border",
];

/** The node carrying the treatment: the only one that names any of it. */
function paintedBoxOf(wrapper: VueWrapper): Element {
  const box = rootOf(wrapper).querySelector(`[class*="${String(TREATMENT[0])}"]`);
  if (box === null) throw new Error("no element carries the group-disabled treatment");
  return box;
}

describe("a control inside a disabled Fieldset", () => {
  describe.each(computed)("%s", (_name, component, props) => {
    it("wears the same unavailable state its own disabled prop produces", async () => {
      const wrapper = inGroup(component, props, true);
      await nextTick();
      await nextTick();

      expect(rootOf(wrapper).querySelectorAll("[data-disabled]").length).toBeGreaterThan(0);
    });

    it("gives up every tab stop, so it is not merely painted unavailable", async () => {
      const wrapper = inGroup(component, props, true);
      await nextTick();
      await nextTick();

      // The half the appearance fix could not reach on its own. A control that
      // looks unreachable and still answers the keyboard is worse than one that
      // looks available, and before this every one of these kept `tabindex="0"`
      // on a `role="slider"` or a `role="spinbutton"` that the group had no way
      // to disable.
      expect(tabStopsIn(rootOf(wrapper))).toHaveLength(0);
    });

    it("is untouched outside a disabled group", async () => {
      const wrapper = inGroup(component, props, false);
      await nextTick();
      await nextTick();

      expect(rootOf(wrapper).querySelectorAll("[data-disabled]")).toHaveLength(0);
    });
  });

  describe.each(painted)("%s", (_name, component, props, control) => {
    it("carries the drained fill, the muted text and the slackened rim, and stands under a disabled fieldset so the rule that names them applies", async () => {
      const wrapper = inGroup(component, props, true);
      await nextTick();

      const box = paintedBoxOf(wrapper);
      for (const utility of TREATMENT) expect(box.className).toContain(utility);
      // The other half, and the half a class list alone cannot show: the
      // ancestor half of `in-[fieldset:disabled]:` is a real selector against a
      // real element, and this is that element matching it.
      expect(box.closest("fieldset:disabled")).not.toBeNull();
    });

    it("is genuinely inert, not merely drained", async () => {
      const wrapper = inGroup(component, props, true);
      await nextTick();

      // These three are here rather than above because the platform disables
      // them itself: everything reachable inside is an `<input>` or a
      // `<button>`, so no Loom code participates and none should.
      expect(wrapper.get(control).element.matches(":disabled")).toBe(true);
    });

    it("is untouched outside a disabled group", async () => {
      const wrapper = inGroup(component, props, false);
      await nextTick();

      const box = paintedBoxOf(wrapper);
      // The classes are still in the list — they are static, and that is the
      // point of a variant — but nothing above the box satisfies them.
      expect(box.closest("fieldset:disabled")).toBeNull();
      expect(wrapper.get(control).element.matches(":disabled")).toBe(false);
    });
  });
});

/**
 * The paths the native attribute does not close, one test each. Every one was
 * live on this branch: the control refused the keyboard, looked unavailable
 * after the appearance fix, and still changed its value through a gesture or a
 * drop.
 */
describe("a control inside a disabled Fieldset refuses the gestures a fieldset cannot", () => {
  it("Slider does not move on End, which reached it through a role rather than an element", async () => {
    const wrapper = inGroup(Slider, { modelValue: 0.5 }, true);
    await nextTick();
    await nextTick();

    const thumb = rootOf(wrapper).querySelector('[role="slider"]');
    thumb?.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    await nextTick();

    expect(wrapper.findComponent(Slider).emitted("update:modelValue")).toBeUndefined();
  });

  it("DatePicker does not type into a segment, which is a div and never inherited the attribute", async () => {
    const wrapper = inGroup(DatePicker, {}, true);
    await nextTick();
    await nextTick();

    const segment = rootOf(wrapper).querySelector('[role="spinbutton"]');
    const before = segment?.textContent;
    segment?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    await nextTick();

    expect(segment?.textContent).toBe(before);
  });

  it("NumberField does not scrub, a pointer gesture on the root that no form control mediates", async () => {
    const wrapper = inGroup(NumberField, { modelValue: 5 }, true);
    await nextTick();
    await nextTick();

    const root = wrapper.get('[role="group"], .group').element;
    root.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 0 }));
    window.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 200 }));
    window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
    await nextTick();

    expect(wrapper.findComponent(NumberField).emitted("update:modelValue")).toBeUndefined();
  });

  it("FileUpload refuses a dropped file, which arrives on a label and never on the input", async () => {
    const wrapper = inGroup(FileUpload, {}, true);
    await nextTick();
    await nextTick();

    // jsdom implements no `DataTransfer`; the stand-in carries the one member
    // the component reads.
    const drop = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(drop, "dataTransfer", {
      value: { files: [new File(["x"], "a.txt")], items: [], types: ["Files"], dropEffect: "none" },
    });
    wrapper.get("label").element.dispatchEvent(drop);
    await nextTick();

    expect(wrapper.findComponent(FileUpload).emitted("update:modelValue")).toBeUndefined();
  });
});
