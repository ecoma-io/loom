import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { h, type Component } from "vue";
import Field from "./Field.vue";
import Checkbox from "../Checkbox/Checkbox.vue";
import ColorPicker from "../ColorPicker/ColorPicker.vue";
import Combobox from "../Combobox/Combobox.vue";
import DatePicker from "../DatePicker/DatePicker.vue";
import DateRangePicker from "../DateRangePicker/DateRangePicker.vue";
import DateTimePicker from "../DateTimePicker/DateTimePicker.vue";
import DateTimeRangePicker from "../DateTimeRangePicker/DateTimeRangePicker.vue";
import FileUpload from "../FileUpload/FileUpload.vue";
import NumberField from "../NumberField/NumberField.vue";
import OtpInput from "../OtpInput/OtpInput.vue";
import RadioGroup from "../RadioGroup/RadioGroup.vue";
import Rating from "../Rating/Rating.vue";
import SegmentedControl from "../SegmentedControl/SegmentedControl.vue";
import Select from "../Select/Select.vue";
import Slider from "../Slider/Slider.vue";
import Switch from "../Switch/Switch.vue";
import TextField from "../TextField/TextField.vue";
import Textarea from "../Textarea/Textarea.vue";
import TimePicker from "../TimePicker/TimePicker.vue";

// Integration tier, deliberately: only a real `InlineError` proves the error
// message actually reaches assistive tech as a live alert (`role="alert"`)
// and that the description id Field computes actually lands on that alert
// element — InlineError.vue's fallthrough-attrs behavior is what carries it
// there, and mocking InlineError would remove both the role and the
// fallthrough, leaving these assertions pinning nothing. `Field.test.ts`
// covers Field's own logic (label/id pairing, required asterisk, hint-vs-
// error swap, which id it computes) against a mocked `InlineError`.
describe("Field", () => {
  it("surfaces its error message to assistive tech as a live alert", () => {
    const wrapper = mount(Field, {
      props: { label: "Email", for: "email-input", error: "That address is not valid" },
    });
    expect(wrapper.get('[role="alert"]').text()).toContain("That address is not valid");
  });

  it("carries the description id through to the rendered alert, completing the aria-describedby link a consumer wires on their control", () => {
    const wrapper = mount(Field, {
      props: { label: "Email", for: "email-input", error: "That address is not valid" },
    });
    expect(wrapper.get('[role="alert"]').attributes("id")).toBe("email-input-description");
  });
});

/**
 * One row per control that opts into the Field context, naming the node each
 * of the row's answers lands on.
 *
 * The table exists because every failure in this family is silent. A control
 * that never calls `useFieldControl`, or that calls it and re-declares one of
 * the four booleans as `false` in its `withDefaults`, still renders, still
 * passes its own unit tests, and still looks wired when read — it simply never
 * hears the row. Nothing else in the repository would notice: the row's
 * `<label for>` would point at an id nothing carries, its error would be shown
 * to sighted readers and to nobody else, and `axe` does not run over a
 * component in isolation. So the wiring is asserted here, per control, against
 * a real Field and a real control with nothing stubbed.
 *
 * The selectors are per row rather than shared because the node the row is
 * talking about is a different one in almost every control — a `<button
 * role="checkbox">` here, the thumb of a slider there, a hidden input Reka
 * mints for the form somewhere else. A row that pointed all six at the same
 * element would be asserting the shape of this table rather than the wiring.
 */
interface FieldControlRow {
  /** The component's name, which is also the test title. */
  readonly name: string;
  readonly component: Component;
  /** Whatever the control needs to render at all, plus a name of its own where a row's label cannot give it one. */
  readonly props: Record<string, unknown>;
  /** The node that adopts the row's control id — what the row's `<label for>` resolves to. */
  readonly identity: string;
  /** The node carrying `aria-describedby`, which is where the row's message is announced. */
  readonly describes: string;
  /** The node carrying `aria-required` and `aria-invalid`. */
  readonly states: string;
  /** The node a surrounding `<form>` submits under the row's `name`. */
  readonly submits: string;
  /**
   * A node that exists only once the row is read-only — or `null` for a
   * control that ignores a row's `readonly`, which is then asserted from the
   * other side: the row's `readonly` leaves the rendering untouched. Both are
   * claims the component's own documentation page makes, and neither is
   * checkable anywhere else.
   */
  readonly readonlyMark: string | null;
}

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
];

const CONTROLS: readonly FieldControlRow[] = [
  {
    name: "Checkbox",
    component: Checkbox,
    props: {},
    identity: 'button[role="checkbox"]',
    describes: 'button[role="checkbox"]',
    states: 'button[role="checkbox"]',
    // Reka mints the hidden `<input type="checkbox">` a `<form>` posts.
    submits: "input[data-hidden]",
    readonlyMark: null,
  },
  {
    name: "ColorPicker",
    component: ColorPicker,
    props: { ariaLabel: "Brand colour" },
    // The identity and the description go to the group — no one of the four
    // parts is the picker — while the form-control answers go to the hex
    // field, which is the only real input among them.
    identity: '[role="group"]',
    describes: '[role="group"]',
    states: 'input[aria-label="Hex value"]',
    submits: 'input[aria-label="Hex value"]',
    readonlyMark: null,
  },
  {
    name: "Combobox",
    component: Combobox,
    props: { options },
    identity: 'input[role="combobox"]',
    describes: 'input[role="combobox"]',
    states: 'input[role="combobox"]',
    // Not the input: the input holds the chosen option's label, the hidden
    // control holds the value.
    submits: "input[data-hidden]",
    readonlyMark: null,
  },
  {
    name: "DatePicker",
    component: DatePicker,
    props: {},
    // `DateFieldRoot` declares `id` and `name` and puts both on the
    // visually-hidden input it submits through — a `role="group"` div being
    // unlabelable, that is also the node a `<label for>` can name.
    identity: 'input[aria-hidden="true"]',
    describes: '[role="group"]',
    states: '[role="group"]',
    submits: 'input[aria-hidden="true"]',
    readonlyMark: "[data-readonly]",
  },
  {
    name: "DateRangePicker",
    component: DateRangePicker,
    props: {},
    identity: 'input[aria-hidden="true"]',
    describes: '[role="group"]',
    states: '[role="group"]',
    submits: 'input[aria-hidden="true"]',
    readonlyMark: "[data-readonly]",
  },
  {
    name: "DateTimePicker",
    component: DateTimePicker,
    props: {},
    identity: 'input[aria-hidden="true"]',
    describes: '[role="group"]',
    states: '[role="group"]',
    submits: 'input[aria-hidden="true"]',
    readonlyMark: "[data-readonly]",
  },
  {
    name: "DateTimeRangePicker",
    component: DateTimeRangePicker,
    props: {},
    identity: 'input[aria-hidden="true"]',
    describes: '[role="group"]',
    states: '[role="group"]',
    submits: 'input[aria-hidden="true"]',
    readonlyMark: "[data-readonly]",
  },
  {
    name: "FileUpload",
    component: FileUpload,
    props: {},
    identity: 'input[type="file"]',
    describes: 'input[type="file"]',
    states: 'input[type="file"]',
    submits: 'input[type="file"]',
    readonlyMark: null,
  },
  {
    name: "NumberField",
    component: NumberField,
    props: {},
    identity: 'input[role="spinbutton"]',
    describes: 'input[role="spinbutton"]',
    states: 'input[role="spinbutton"]',
    // Not the spinbutton: it holds a formatted number, and a name on it would
    // post the grouping separators along with the digits.
    submits: "input[data-hidden]",
    readonlyMark: "input[readonly]",
  },
  {
    name: "OtpInput",
    component: OtpInput,
    props: { ariaLabel: "Verification code" },
    identity: 'input[aria-hidden="true"]',
    // The description is about the whole code, so it goes on the group;
    // `aria-required` and `aria-invalid` are states of the boxes being typed
    // into, and `role="group"` supports neither.
    describes: '[role="group"]',
    states: 'input[aria-label="Digit 1 of 6"]',
    submits: 'input[aria-hidden="true"]',
    readonlyMark: null,
  },
  {
    name: "RadioGroup",
    component: RadioGroup,
    props: { options },
    identity: '[role="radiogroup"]',
    describes: '[role="radiogroup"]',
    states: '[role="radiogroup"]',
    submits: "input[data-hidden]",
    readonlyMark: null,
  },
  {
    name: "Rating",
    component: Rating,
    props: { "aria-label": "Overall quality" },
    identity: '[role="radiogroup"]',
    describes: '[role="radiogroup"]',
    states: '[role="radiogroup"]',
    submits: "input[data-hidden]",
    // The one control whose read-only state is not a native attribute: there
    // is no element to set one on, so the row's `readonly` turns the score
    // into a picture of a number.
    readonlyMark: '[role="img"]',
  },
  {
    name: "SegmentedControl",
    component: SegmentedControl,
    props: { options, "aria-label": "Density" },
    identity: '[role="radiogroup"]',
    describes: '[role="radiogroup"]',
    states: '[role="radiogroup"]',
    submits: "input[data-hidden]",
    readonlyMark: null,
  },
  {
    name: "Select",
    component: Select,
    props: { options },
    identity: '[role="combobox"]',
    describes: '[role="combobox"]',
    states: '[role="combobox"]',
    // A trigger is a `<button>`, and a button's name is never part of a
    // submission — the hidden input at the end of the template carries it.
    submits: 'input[type="hidden"]',
    readonlyMark: null,
  },
  {
    name: "Slider",
    component: Slider,
    props: { "aria-label": "Volume" },
    // The thumb is the `role="slider"` element, so it is what the row is
    // describing rather than the track around it.
    identity: '[role="slider"]',
    describes: '[role="slider"]',
    states: '[role="slider"]',
    submits: 'input[type="hidden"]',
    readonlyMark: null,
  },
  {
    name: "Switch",
    component: Switch,
    props: {},
    identity: '[role="switch"]',
    describes: '[role="switch"]',
    states: '[role="switch"]',
    submits: "input[data-hidden]",
    readonlyMark: null,
  },
  {
    name: "TextField",
    component: TextField,
    props: {},
    identity: "input",
    describes: "input",
    states: "input",
    submits: "input",
    readonlyMark: "input[readonly]",
  },
  {
    name: "Textarea",
    component: Textarea,
    props: {},
    identity: "textarea",
    describes: "textarea",
    states: "textarea",
    submits: "textarea",
    readonlyMark: "textarea[readonly]",
  },
  {
    name: "TimePicker",
    component: TimePicker,
    props: {},
    identity: 'input[aria-hidden="true"]',
    describes: '[role="group"]',
    states: '[role="group"]',
    submits: 'input[aria-hidden="true"]',
    readonlyMark: "[data-readonly]",
  },
];

// Select, Combobox and the pickers portal their overlays and drive them with
// real pointer capture, focus and layout APIs. jsdom implements none of those,
// so each is stubbed to the shape Reka reads rather than mocked away — the
// same set `Select.test.ts` sets up, and for the same reason: the library
// itself stays the real thing under test.
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

// Portalled content lives outside the wrapper, so wiping `document.body` would
// tear those nodes out from under a component that is still mounted and leave
// Vue patching into a detached tree. Unmounting is what actually ends the test.
enableAutoUnmount(afterEach);

function mountRow(row: FieldControlRow, fieldProps: Record<string, unknown> = {}) {
  return mount(Field, {
    props: { label: "Label", ...fieldProps },
    slots: { default: h(row.component, row.props) },
    // Several of these move focus on mount, and focus only works for a tree
    // that is actually in the document.
    attachTo: document.body,
  });
}

describe.each(CONTROLS)("$name inside a Field", (row) => {
  it("adopts the row's control id, so the row's <label for> resolves to it", () => {
    const wrapper = mountRow(row);
    const id = wrapper.get(row.identity).attributes("id");

    expect(id).toBeTruthy();
    expect(wrapper.get("label").attributes("for")).toBe(id);
  });

  it("points aria-describedby at the row's message, which is the element that renders it", () => {
    const wrapper = mountRow(row, { error: "Something is wrong" });
    // `?? ""` rather than a non-null assertion: a control that adopted no id at
    // all fails on the mismatch below with the empty string in the message,
    // which reads as the defect it is rather than as a thrown assertion.
    const id = wrapper.get(row.identity).attributes("id") ?? "";

    // `toContain`, not `toBe`: the row's description is *added* to whatever the
    // control already pointed at — FileUpload's own refusal message is the live
    // case — so an equality check here would forbid the merge.
    expect(wrapper.get(row.describes).attributes("aria-describedby")).toContain(
      `${id}-description`,
    );
    expect(wrapper.get('[role="alert"]').attributes("id")).toBe(`${id}-description`);
  });

  it("announces the row's required and its error as aria-required and aria-invalid", () => {
    const wrapper = mountRow(row, { required: true, error: "Something is wrong" });
    const states = wrapper.get(row.states);

    expect(states.attributes("aria-required")).toBe("true");
    expect(states.attributes("aria-invalid")).toBe("true");
  });

  it("submits under the row's name", () => {
    const wrapper = mountRow(row, { name: "given" });

    expect(wrapper.get(row.submits).attributes("name")).toBe("given");
  });

  // Both halves of the `own ?? wrapper ?? false` rule, and the one pair that
  // catches a control whose participating prop was left defaulting to `false`
  // rather than `undefined`: such a control renders identically in all three
  // of these mounts, so the first assertion fails while the code still reads
  // as fully wired.
  it("takes the row's disabled, and yields to a control that declares itself available", () => {
    const bare = mountRow(row).html();

    expect(mountRow(row, { disabled: true }).html()).not.toBe(bare);
    expect(
      mount(Field, {
        props: { label: "Label", disabled: true },
        slots: { default: h(row.component, { ...row.props, disabled: false }) },
        attachTo: document.body,
      }).html(),
    ).toBe(bare);
  });

  if (row.readonlyMark === null) {
    it("ignores the row's readonly rather than approximating it", () => {
      expect(mountRow(row, { readonly: true }).html()).toBe(mountRow(row).html());
    });
  } else {
    const mark = row.readonlyMark;
    it("renders read-only when the row is", () => {
      const wrapper = mountRow(row, { readonly: true });

      expect(wrapper.find(mark).exists()).toBe(true);
      expect(mountRow(row).find(mark).exists()).toBe(false);
    });
  }
});
