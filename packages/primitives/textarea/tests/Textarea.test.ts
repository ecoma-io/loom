import { enableAutoUnmount, mount, type DOMWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, type PropType } from "vue";
import Textarea from "../src/Textarea.vue";
import { provideFieldContext } from "@ecoma-io/loom-labels";
import { provideLoomLabels, type LoomLabelOverrides } from "@ecoma-io/loom-labels";

// The focus assertions below need the textarea in the real document, so the
// mounted tree has to come back off it afterwards.
enableAutoUnmount(afterEach);

// A stand-in for the Field wrapping this control — Field is a project-internal
// collaborator, and what it publishes is pinned in `Field.test.ts`. This file
// pins the other half: that Textarea reads the row it is inside.
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

/**
 * The counter, located by the one class only it carries. A locator rather than
 * an assertion: every expectation below reads its text or its state marker,
 * which is what the component promises — nothing here cares how it is painted.
 */
function counterOf(wrapper: Queryable): Found {
  return wrapper.get("span.tabular");
}

/** What `mount()` and a slotted probe row have in common, for the helper above. */
type Found = Omit<DOMWrapper<Element>, "exists">;
interface Queryable {
  get: (selector: string) => Found;
}

describe("Textarea", () => {
  it("emits the raw string on input so v-model tracks each keystroke", async () => {
    const wrapper = mount(Textarea, { props: { ariaLabel: "Description" } });
    const textarea = wrapper.get("textarea");
    await textarea.setValue("hello\nworld");
    expect(wrapper.emitted("update:modelValue")).toEqual([["hello\nworld"]]);
  });

  it("marks the textarea aria-invalid only while invalid, so screen readers announce the error state and not merely the styling", () => {
    const valid = mount(Textarea, { props: { ariaLabel: "Notes" } });
    expect(valid.get("textarea").attributes("aria-invalid")).toBeUndefined();

    const invalid = mount(Textarea, { props: { ariaLabel: "Notes", invalid: true } });
    expect(invalid.get("textarea").attributes("aria-invalid")).toBe("true");
  });

  it("disables the underlying textarea so the field is inert to typing, not merely dimmed", () => {
    const wrapper = mount(Textarea, { props: { ariaLabel: "Notes", disabled: true } });
    expect((wrapper.get("textarea").element as HTMLTextAreaElement).disabled).toBe(true);
  });

  it("locks the size with resize-none only when resize is set to none", () => {
    const vertical = mount(Textarea, { props: { ariaLabel: "Notes" } });
    expect(vertical.get("textarea").classes()).toContain("resize-y");

    const locked = mount(Textarea, { props: { ariaLabel: "Notes", resize: "none" } });
    expect(locked.get("textarea").classes()).toContain("resize-none");
  });

  it("forwards aria-describedby onto the textarea, completing the link to a Field-owned hint or error id", () => {
    const wrapper = mount(Textarea, {
      props: { ariaLabel: "Notes" },
      attrs: { "aria-describedby": "notes-description" },
    });
    expect(wrapper.get("textarea").attributes("aria-describedby")).toBe("notes-description");
  });

  // Every case in this file supplies `ariaLabel` and none of them looks at
  // where it lands — measured: deleting both bindings from the template left
  // the file green. A Textarea used outside a Field carries no visible label,
  // so the name a host passes is the only one the control will ever have.
  it("carries the name a host supplies onto the native textarea, by value or by reference", () => {
    const named = mount(Textarea, { props: { ariaLabel: "Notes" } });
    expect(named.get("textarea").attributes("aria-label")).toBe("Notes");

    const referenced = mount(Textarea, { props: { ariaLabelledby: "notes-heading" } });
    const textarea = referenced.get("textarea");
    expect(textarea.attributes("aria-labelledby")).toBe("notes-heading");
    expect(textarea.attributes("aria-label")).toBeUndefined();
  });

  it("marks the textarea aria-required only while required, so the asterisk is not a promise made to sighted readers alone", () => {
    const optional = mount(Textarea, { props: { ariaLabel: "Notes" } });
    expect(optional.get("textarea").attributes("aria-required")).toBeUndefined();

    const mandatory = mount(Textarea, { props: { ariaLabel: "Notes", required: true } });
    expect(mandatory.get("textarea").attributes("aria-required")).toBe("true");
  });

  it("submits under the name it is given", () => {
    const wrapper = mount(Textarea, { props: { ariaLabel: "Notes", name: "notes" } });
    expect((wrapper.get("textarea").element as HTMLTextAreaElement).name).toBe("notes");
  });

  it("renders leading and trailing adornments inside the field frame", () => {
    const wrapper = mount(Textarea, {
      props: { ariaLabel: "Notes" },
      slots: { leading: "📝", trailing: "📋" },
    });
    expect(wrapper.text()).toContain("📝");
    expect(wrapper.text()).toContain("📋");
  });

  it("routes the fallthrough class onto the field frame so a caller can size the whole field, not just the textarea", () => {
    const wrapper = mount(Textarea, {
      props: { ariaLabel: "Notes" },
      attrs: { class: "w-64" },
    });
    expect(wrapper.get("div.group").classes()).toContain("w-64");
    expect(wrapper.get("textarea").classes()).not.toContain("w-64");
  });

  it("keeps a readonly textarea focusable and submitted where a disabled one is neither", () => {
    const readOnly = mount(Textarea, {
      props: { ariaLabel: "Notes", name: "notes", readonly: true },
      attachTo: document.body,
    });
    const readOnlyEl = readOnly.get("textarea").element as HTMLTextAreaElement;
    readOnlyEl.focus();
    expect(document.activeElement).toBe(readOnlyEl);
    expect(readOnlyEl.readOnly).toBe(true);
    expect(readOnlyEl.disabled).toBe(false);

    const disabled = mount(Textarea, {
      props: { ariaLabel: "Notes", name: "notes", disabled: true },
      attachTo: document.body,
    });
    const disabledEl = disabled.get("textarea").element as HTMLTextAreaElement;
    disabledEl.focus();
    expect(document.activeElement).not.toBe(disabledEl);
  });

  it("shows a readonly textarea on the subtle fill, at full text strength and on the input hairline", () => {
    const readOnly = mount(Textarea, { props: { ariaLabel: "Notes", readonly: true } });
    // The state classes moved to the field frame wrapper — the textarea itself is
    // transparent — so the assertions target the wrapper, not the textarea.
    const frame = readOnly.get("div.group");

    expect(frame.attributes("data-readonly")).toBe("true");
    // The lighter of the two neutrals, and it is what separates this state from
    // the disabled one on the fill rather than on the text colour alone — a
    // difference a sighted reader can see without resolving a hue.
    expect(frame.classes()).toContain("bg-subtle");
    expect(frame.classes()).not.toContain("bg-muted");
    // Full strength: the muted colour rides the disabled class, which a
    // read-only element never matches, so the value stays on `text-foreground`.
    expect(frame.classes()).toContain("text-foreground");
    // The hairline is the third channel, and read-only keeps the resting one.
    expect(frame.classes()).toContain("border-input");
    expect(frame.classes()).not.toContain("border-border");
    expect(frame.classes().some((name) => /(^|:)opacity-/.test(name))).toBe(false);
    expect((readOnly.get("textarea").element as HTMLTextAreaElement).disabled).toBe(false);
  });

  // The defect this pins. The element *is* the text: `disabled:opacity-50` took
  // a filed answer from 14.09:1 to 3.06:1 and its placeholder from 5.25:1 to
  // 2.05:1. Drained instead, to the deeper neutral with the muted label colour
  // over it — 12.58:1 and 4.68:1 measured.
  it("drains a disabled textarea on all three channels rather than fading the text written in it", () => {
    const wrapper = mount(Textarea, { props: { ariaLabel: "Notes", disabled: true } });
    // State classes are on the field frame wrapper, not the textarea itself.
    const frame = wrapper.get("div.group");

    expect(frame.classes().some((name) => /(^|:)opacity-/.test(name))).toBe(false);
    expect(frame.classes()).toContain("bg-muted");
    expect(frame.classes()).toContain("text-muted-foreground");
    // The hairline recedes with the fill. Two states that parted only on the
    // text colour were a colour-only distinction; the border makes it a
    // difference in shape as well.
    expect(frame.classes()).toContain("border-border");
  });

  it("takes its id, description, name, required and invalid state from the row it sits in", () => {
    const row = mount(ProbeRow, {
      props: {
        controlId: "bio",
        describedBy: "bio-description",
        name: "bio",
        required: true,
        invalid: true,
      },
      slots: { default: h(Textarea, { ariaLabel: "Bio" }) },
    });
    const textarea = row.get("textarea");

    expect(textarea.attributes("id")).toBe("bio");
    expect(textarea.attributes("aria-describedby")).toBe("bio-description");
    expect(textarea.attributes("name")).toBe("bio");
    expect(textarea.attributes("aria-required")).toBe("true");
    expect(textarea.attributes("aria-invalid")).toBe("true");
    // The destructive border is on the field frame wrapper, not the textarea.
    expect(row.get("div.group").classes()).toContain("border-destructive");
  });

  it("lets an explicit prop overrule the row in both directions", () => {
    const optedOut = mount(ProbeRow, {
      props: { invalid: true, required: true, disabled: true, readonly: true },
      slots: {
        default: h(Textarea, {
          ariaLabel: "Bio",
          invalid: false,
          required: false,
          disabled: false,
          readonly: false,
        }),
      },
    });
    const optedOutEl = optedOut.get("textarea").element as HTMLTextAreaElement;
    expect(optedOut.get("textarea").attributes("aria-invalid")).toBeUndefined();
    expect(optedOut.get("textarea").attributes("aria-required")).toBeUndefined();
    expect(optedOutEl.disabled).toBe(false);
    expect(optedOutEl.readOnly).toBe(false);

    const optedIn = mount(ProbeRow, {
      slots: { default: h(Textarea, { ariaLabel: "Bio", invalid: true, required: true }) },
    });
    expect(optedIn.get("textarea").attributes("aria-invalid")).toBe("true");
    expect(optedIn.get("textarea").attributes("aria-required")).toBe("true");
  });

  it("adds the row's description to one the caller already set rather than replacing it", () => {
    const row = mount(ProbeRow, {
      props: { describedBy: "bio-description" },
      slots: { default: h(Textarea, { ariaLabel: "Bio", "aria-describedby": "bio-format" }) },
    });
    expect(row.get("textarea").attributes("aria-describedby")).toBe("bio-format bio-description");
  });

  describe("character count", () => {
    it("renders neither the counter nor its live region when no count is asked for", () => {
      const wrapper = mount(Textarea, { props: { ariaLabel: "Notes" } });
      expect(wrapper.findAll("span")).toHaveLength(0);
      expect(wrapper.get("textarea").attributes("aria-describedby")).toBeUndefined();
    });

    it("shows the counter as soon as a maximum is set, and lets showCount overrule that either way", () => {
      const limited = mount(Textarea, { props: { ariaLabel: "Bio", maxLength: 200 } });
      expect(counterOf(limited).text()).toBe("0/200");

      const suppressed = mount(Textarea, {
        props: { ariaLabel: "Bio", maxLength: 200, showCount: false },
      });
      expect(suppressed.find("span.tabular").exists()).toBe(false);

      const unlimited = mount(Textarea, { props: { ariaLabel: "Bio", showCount: true } });
      expect(counterOf(unlimited).text()).toBe("0");
    });

    it("counts what the reader typed with no v-model, without wiping the field to do it", async () => {
      // Uncontrolled: `modelValue` stays undefined while the counter forces a
      // re-render on every keystroke, and Vue's `value` patch coerces an
      // undefined binding to "". Counting the typed value is what keeps the
      // text in the box.
      const wrapper = mount(Textarea, { props: { ariaLabel: "Bio", maxLength: 200 } });
      const textarea = wrapper.get("textarea");
      await textarea.setValue("hello\nworld");

      expect((textarea.element as HTMLTextAreaElement).value).toBe("hello\nworld");
      expect(counterOf(wrapper).text()).toBe("11/200");
    });

    it("counts the value a controlled host actually applied, not the keystroke it declined", async () => {
      const wrapper = mount(Textarea, {
        props: { ariaLabel: "Bio", maxLength: 200, modelValue: "ok" },
      });
      await wrapper.get("textarea").setValue("rejected");
      expect(counterOf(wrapper).text()).toBe("2/200");
    });

    it("describes the textarea with the counter, after the caller's own description and before the row's", () => {
      const row = mount(ProbeRow, {
        props: { describedBy: "bio-hint" },
        slots: {
          default: h(Textarea, {
            ariaLabel: "Bio",
            maxLength: 200,
            modelValue: "hello",
            "aria-describedby": "bio-rules",
          }),
        },
      });
      const ids = (row.get("textarea").attributes("aria-describedby") ?? "").split(" ");

      expect(ids).toHaveLength(3);
      expect(ids[0]).toBe("bio-rules");
      expect(ids[2]).toBe("bio-hint");
      expect(row.get(`[id="${String(ids[1])}"]`).text()).toBe("5/200");
    });

    it("reports the limit rather than enforcing it, leaving the native maxlength to the caller", () => {
      const wrapper = mount(Textarea, { props: { ariaLabel: "Bio", maxLength: 200 } });
      expect(wrapper.get("textarea").attributes("maxlength")).toBeUndefined();

      const enforced = mount(Textarea, {
        props: { ariaLabel: "Bio", maxLength: 200 },
        attrs: { maxlength: 200 },
      });
      expect(enforced.get("textarea").attributes("maxlength")).toBe("200");
    });

    it("says the limit is passed in words, not only in red", async () => {
      const wrapper = mount(Textarea, {
        props: { ariaLabel: "Bio", maxLength: 5, modelValue: "ab" },
      });
      const counter = counterOf(wrapper);
      expect(counter.text()).toBe("2/5");
      expect(counter.attributes("data-over-limit")).toBeUndefined();

      await wrapper.setProps({ modelValue: "abcdefg" });
      expect(counter.text()).toBe("7/5 over limit");
      expect(counter.attributes("data-over-limit")).toBe("true");
    });

    it("announces the limit once as it is neared and once as it is passed, never per keystroke", async () => {
      const wrapper = mount(Textarea, {
        props: { ariaLabel: "Bio", maxLength: 20, modelValue: "" },
      });
      const live = wrapper.get('[role="status"]');
      expect(live.text()).toBe("");

      await wrapper.setProps({ modelValue: "a".repeat(10) });
      expect(live.text()).toBe("");

      await wrapper.setProps({ modelValue: "a".repeat(15) });
      expect(live.text()).toBe("5 characters left");

      // Still inside the warning band: the counter moves, the announcement does
      // not. A region that re-spoke here would read a number on every keystroke.
      await wrapper.setProps({ modelValue: "a".repeat(16) });
      expect(counterOf(wrapper).text()).toBe("16/20");
      expect(live.text()).toBe("5 characters left");

      await wrapper.setProps({ modelValue: "a".repeat(21) });
      expect(live.text()).toBe("1 character over the limit of 20");

      await wrapper.setProps({ modelValue: "a" });
      expect(live.text()).toBe("");
    });

    it("keeps the counter below the box, where a drag-resize moves it rather than covering the value", () => {
      // The layout claim, pinned structurally: the counter is a sibling that
      // follows the field frame inside the control's own outer element, so the
      // native resize grabber in the box's bottom-right corner is never under
      // it. `resize` changes the box, not where the readout sits.
      const wrapper = mount(Textarea, { props: { ariaLabel: "Bio", maxLength: 200 } });
      // The counter follows the field frame div, which contains the textarea.
      expect(counterOf(wrapper).element.previousElementSibling?.tagName).toBe("DIV");

      const locked = mount(Textarea, {
        props: { ariaLabel: "Bio", maxLength: 200, resize: "none" },
      });
      expect(counterOf(locked).element.previousElementSibling?.tagName).toBe("DIV");
      expect(locked.get("textarea").classes()).toContain("resize-none");
    });

    it("takes the counter wording from the labels prop, key by key", async () => {
      const wrapper = mount(Textarea, {
        props: {
          ariaLabel: "Bio",
          maxLength: 20,
          modelValue: "hello",
          labels: { countOfMax: ({ count, max }) => `còn ${String(max - count)}` },
        },
      });
      expect(counterOf(wrapper).text()).toBe("còn 15");

      // The override said nothing about the over-limit wording, so Loom's
      // English stands there rather than the slot falling back whole.
      await wrapper.setProps({ modelValue: "a".repeat(21) });
      expect(counterOf(wrapper).text()).toBe("21/20 over limit");
    });

    it("takes its counter wording from a host's vocabulary, and lets one instance correct one key", () => {
      const host = mount(LabelHost, {
        props: {
          vocabulary: () => ({
            textarea: {
              countOfMax: ({ count, max }) => `${String(count)} trên ${String(max)}`,
              count: ({ count }) => `${String(count)} ký tự`,
            },
          }),
        },
        slots: {
          default: () => [
            h(Textarea, { ariaLabel: "Bio", maxLength: 20, modelValue: "hello" }),
            h(Textarea, {
              ariaLabel: "Notes",
              showCount: true,
              modelValue: "hi",
              labels: { count: ({ count }) => `${String(count)} chữ` },
            }),
          ],
        },
      });
      const counters = host.findAll("span.tabular");

      expect(counters[0]?.text()).toBe("5 trên 20");
      // The instance corrects one key; the vocabulary still reaches the other.
      expect(counters[1]?.text()).toBe("2 chữ");
    });
  });
});
