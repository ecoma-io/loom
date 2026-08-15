import { enableAutoUnmount, mount, type DOMWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import TextField from "../src/TextField.vue";
import { provideFieldContext } from "@ecoma-io/loom-labels";

// The focus assertions below need the input in the real document, so the
// mounted tree has to come back off it afterwards.
enableAutoUnmount(afterEach);

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

/**
 * What a real engine does to the selection when `type` flips, and what jsdom
 * does not: measured, `input.type = "text"` leaves `selectionStart` and
 * `selectionEnd` exactly where they were here, so a test that only set a range
 * and read it back after the toggle would pass against a component that
 * restored nothing at all. The reset is installed so the restore has something
 * to undo.
 */
function breakSelectionOnTypeChange(input: HTMLInputElement): void {
  const native = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "type");
  Object.defineProperty(input, "type", {
    configurable: true,
    get: () => native?.get?.call(input) as string,
    set: (value: string) => {
      native?.set?.call(input, value);
      input.setSelectionRange(0, 0);
    },
  });
}

describe("TextField", () => {
  it("emits the raw string on input so v-model tracks each keystroke", async () => {
    const wrapper = mount(TextField, { props: { ariaLabel: "Name" } });
    const input = wrapper.get("input");
    await input.setValue("hello");
    expect(wrapper.emitted("update:modelValue")).toEqual([["hello"]]);
  });

  it("marks the input aria-invalid only while invalid, so screen readers announce the error state and not merely the styling", () => {
    const valid = mount(TextField, { props: { ariaLabel: "Email" } });
    expect(valid.get("input").attributes("aria-invalid")).toBeUndefined();

    const invalid = mount(TextField, { props: { ariaLabel: "Email", invalid: true } });
    expect(invalid.get("input").attributes("aria-invalid")).toBe("true");
  });

  it("disables the underlying input so the field is inert to typing, not merely dimmed", () => {
    const wrapper = mount(TextField, { props: { ariaLabel: "Name", disabled: true } });
    expect((wrapper.get("input").element as HTMLInputElement).disabled).toBe(true);
  });

  it("renders leading and trailing adornments inside the field frame", () => {
    const wrapper = mount(TextField, {
      props: { ariaLabel: "Search" },
      slots: { leading: "🔍", trailing: "⌫" },
    });
    expect(wrapper.text()).toContain("🔍");
    expect(wrapper.text()).toContain("⌫");
  });

  it("forwards aria-describedby onto the native input, completing the link to a Field-owned hint or error id", () => {
    // Field cannot reach into this component to set the attribute itself
    // (see Field.vue) — this is the other half of that contract: whatever
    // id a host passes through reaches the real input rather than the
    // wrapper div, which is where a screen reader looks for it.
    const wrapper = mount(TextField, {
      props: { ariaLabel: "Email" },
      attrs: { "aria-describedby": "email-description" },
    });
    expect(wrapper.get("input").attributes("aria-describedby")).toBe("email-description");
  });

  // Every case in this file supplies `ariaLabel` and none of them looks at
  // where it lands — measured: deleting both bindings from the template left
  // the file green. A TextField used outside a Field carries no visible label,
  // so the name a host passes is the only one the input will ever have.
  it("carries the name a host supplies onto the native input, by value or by reference", () => {
    const named = mount(TextField, { props: { ariaLabel: "Email" } });
    expect(named.get("input").attributes("aria-label")).toBe("Email");

    const referenced = mount(TextField, { props: { ariaLabelledby: "email-heading" } });
    const input = referenced.get("input");
    expect(input.attributes("aria-labelledby")).toBe("email-heading");
    expect(input.attributes("aria-label")).toBeUndefined();
  });

  it("routes the fallthrough class onto the wrapper so a caller can size the whole field, not just the input", () => {
    const wrapper = mount(TextField, {
      props: { ariaLabel: "Name" },
      attrs: { class: "w-64" },
    });
    expect(wrapper.classes()).toContain("w-64");
    expect(wrapper.get("input").classes()).not.toContain("w-64");
  });

  it("marks the input aria-required only while required, so the asterisk is not a promise made to sighted readers alone", () => {
    const optional = mount(TextField, { props: { ariaLabel: "Email" } });
    expect(optional.get("input").attributes("aria-required")).toBeUndefined();

    const mandatory = mount(TextField, { props: { ariaLabel: "Email", required: true } });
    expect(mandatory.get("input").attributes("aria-required")).toBe("true");
  });

  it("submits under the name it is given", () => {
    const wrapper = mount(TextField, { props: { ariaLabel: "Email", name: "email" } });
    expect((wrapper.get("input").element as HTMLInputElement).name).toBe("email");
  });

  it("keeps a readonly field focusable and submitted where a disabled one is neither", () => {
    // The two are different states, not two dials on one: a read-only value is
    // on show and reachable by keyboard, a disabled one is unavailable. jsdom
    // implements the focusable-area rule, so this is the real behaviour rather
    // than a proxy for it.
    const readOnly = mount(TextField, {
      props: { ariaLabel: "Email", name: "email", readonly: true },
      attachTo: document.body,
    });
    const readOnlyInput = readOnly.get("input").element as HTMLInputElement;
    readOnlyInput.focus();
    expect(document.activeElement).toBe(readOnlyInput);
    expect(readOnlyInput.readOnly).toBe(true);
    expect(readOnlyInput.disabled).toBe(false);

    const disabled = mount(TextField, {
      props: { ariaLabel: "Email", name: "email", disabled: true },
      attachTo: document.body,
    });
    const disabledInput = disabled.get("input").element as HTMLInputElement;
    disabledInput.focus();
    expect(document.activeElement).not.toBe(disabledInput);
  });

  it("tells available, read-only and disabled apart on fill, text colour and border weight", () => {
    // Three resting appearances, and the pairwise difference is the assertion.
    // Read-only and disabled used to share `bg-muted` and part on the text
    // colour alone — a distinction in hue, which is the one a reader with a
    // colour deficiency never receives.
    const available = mount(TextField, { props: { ariaLabel: "Email" } });
    expect(available.classes()).toEqual(
      expect.arrayContaining(["bg-background", "text-foreground", "border-input"]),
    );

    // A value on show: the fill lifts, and the text and the rim stay exactly
    // where an editable field's are, because the field is still a Tab stop and
    // still submitted.
    const readOnly = mount(TextField, { props: { ariaLabel: "Email", readonly: true } });
    expect(readOnly.attributes("data-readonly")).toBe("true");
    expect(readOnly.classes()).toEqual(
      expect.arrayContaining(["bg-subtle", "text-foreground", "border-input"]),
    );
    expect(readOnly.classes()).not.toContain("bg-muted");
    expect(readOnly.classes()).not.toContain("text-muted-foreground");

    // Unavailable moves all three: the fill one step further down, the text to
    // the muted colour, the rim from `input` to the lighter `border`.
    const disabled = mount(TextField, { props: { ariaLabel: "Email", disabled: true } });
    expect(disabled.classes()).toEqual(
      expect.arrayContaining([
        "bg-muted",
        "text-muted-foreground",
        "border-border",
        "cursor-not-allowed",
      ]),
    );
    expect(disabled.classes()).not.toContain("bg-subtle");
    expect(disabled.classes()).not.toContain("border-input");
    expect(disabled.attributes("data-readonly")).toBeUndefined();

    // And on none of the three is any of it carried by an alpha. `opacity-50`
    // over this box took the value to 3.08:1 and the placeholder to 2.07:1,
    // which is the defect the whole treatment exists to keep out.
    for (const state of [available, readOnly, disabled]) {
      expect(state.classes().some((name) => /(^|:)opacity-/.test(name))).toBe(false);
    }
  });

  it("keeps the destructive rim on a field that is both invalid and unavailable", () => {
    // The disabled rule and the invalid rule both name a border colour and
    // `cn()` resolves that by order, so this pins the order rather than the
    // colours: an error that stops being visible the moment the row goes
    // unavailable is an error nobody can act on.
    const wrapper = mount(TextField, {
      props: { ariaLabel: "Email", disabled: true, invalid: true },
    });
    expect(wrapper.classes()).toContain("border-destructive");
    expect(wrapper.classes()).not.toContain("border-border");
    expect(wrapper.classes()).toContain("bg-muted");
  });

  it("takes its id, description, name, required and invalid state from the row it sits in", () => {
    const row = mount(ProbeRow, {
      props: {
        controlId: "email",
        describedBy: "email-description",
        name: "email",
        required: true,
        invalid: true,
      },
      slots: { default: h(TextField, { ariaLabel: "Email" }) },
    });
    const input = row.get("input");

    expect(input.attributes("id")).toBe("email");
    expect(input.attributes("aria-describedby")).toBe("email-description");
    expect(input.attributes("name")).toBe("email");
    expect(input.attributes("aria-required")).toBe("true");
    expect(input.attributes("aria-invalid")).toBe("true");
    expect(row.find('[data-invalid="true"]').exists()).toBe(true);
  });

  it("lets an explicit prop overrule the row in both directions", () => {
    const optedOut = mount(ProbeRow, {
      props: { invalid: true, required: true, disabled: true, readonly: true },
      slots: {
        default: h(TextField, {
          ariaLabel: "Email",
          invalid: false,
          required: false,
          disabled: false,
          readonly: false,
        }),
      },
    });
    const optedOutInput = optedOut.get("input").element as HTMLInputElement;
    expect(optedOut.get("input").attributes("aria-invalid")).toBeUndefined();
    expect(optedOut.get("input").attributes("aria-required")).toBeUndefined();
    expect(optedOutInput.disabled).toBe(false);
    expect(optedOutInput.readOnly).toBe(false);

    const optedIn = mount(ProbeRow, {
      slots: { default: h(TextField, { ariaLabel: "Email", invalid: true, required: true }) },
    });
    expect(optedIn.get("input").attributes("aria-invalid")).toBe("true");
    expect(optedIn.get("input").attributes("aria-required")).toBe("true");
  });

  it("adds the row's description to one the caller already set rather than replacing it", () => {
    const row = mount(ProbeRow, {
      props: { describedBy: "email-description" },
      slots: {
        default: h(TextField, { ariaLabel: "Email", "aria-describedby": "password-rules" }),
      },
    });
    expect(row.get("input").attributes("aria-describedby")).toBe(
      "password-rules email-description",
    );
  });

  describe("revealable", () => {
    it("shows the password in place and puts the caret back where the reader left it", async () => {
      const wrapper = mount(TextField, {
        props: { ariaLabel: "Password", type: "password", revealable: true, modelValue: "hunter2" },
        attachTo: document.body,
      });
      const input = wrapper.get("input").element as HTMLInputElement;
      breakSelectionOnTypeChange(input);
      input.setSelectionRange(2, 4);

      await wrapper.get("button").trigger("click");
      await nextTick();

      expect(input.type).toBe("text");
      expect(input.value).toBe("hunter2");
      expect([input.selectionStart, input.selectionEnd]).toEqual([2, 4]);
    });

    it("renders no toggle at all on a type that has nothing to reveal", async () => {
      const wrapper = mount(TextField, {
        props: { ariaLabel: "Email", type: "email", revealable: true },
      });
      expect(wrapper.find("button").exists()).toBe(false);
      expect(wrapper.get("input").attributes("type")).toBe("email");

      await wrapper.setProps({ type: "password" });
      expect(wrapper.find("button").exists()).toBe(true);
    });

    it("keeps the toggle after the input, so nothing stands between the reader and the field", () => {
      const wrapper = mount(TextField, {
        props: { ariaLabel: "Password", type: "password", revealable: true },
        attachTo: document.body,
      });
      const input = wrapper.get("input").element;
      const toggle = wrapper.get("button").element;
      // DOCUMENT_POSITION_FOLLOWING: the toggle comes after the input in
      // document order, which is what fixes the sequential-focus order — the
      // toggle takes no tabindex of its own.
      expect(input.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(toggle.hasAttribute("tabindex")).toBe(false);
    });

    it("reports whether the password is showing through aria-pressed, under a name that does not move", async () => {
      const wrapper = mount(TextField, {
        props: { ariaLabel: "Password", type: "password", revealable: true },
      });
      const toggle = wrapper.get("button");
      const name = toggle.attributes("aria-label");

      expect(name).toBe("Show password");
      expect(toggle.attributes("aria-pressed")).toBe("false");

      await toggle.trigger("click");

      expect(toggle.attributes("aria-pressed")).toBe("true");
      expect(toggle.attributes("aria-label")).toBe(name);
      expect(wrapper.get("input").attributes("type")).toBe("text");
    });

    it("keeps the password showing across blur, and hides it only when the field stops being one", async () => {
      const wrapper = mount(TextField, {
        props: { ariaLabel: "Password", type: "password", revealable: true },
        attachTo: document.body,
      });
      await wrapper.get("button").trigger("click");
      expect(wrapper.get("input").attributes("type")).toBe("text");

      // Blur does not re-hide, and it must not: clicking the toggle blurs the
      // input on the way, so a reset there would undo the reveal it was asked
      // for. See TextField.vue for why the reveal is the reader's to end.
      await wrapper.get("input").trigger("blur");
      expect(wrapper.get("input").attributes("type")).toBe("text");

      await wrapper.setProps({ type: "text" });
      await wrapper.setProps({ type: "password" });
      expect(wrapper.get("input").attributes("type")).toBe("password");
      expect(wrapper.get("button").attributes("aria-pressed")).toBe("false");
    });

    it("stays usable on a read-only field and goes unavailable with a disabled one", () => {
      const readOnly = mount(TextField, {
        props: { ariaLabel: "Password", type: "password", revealable: true, readonly: true },
      });
      expect((readOnly.get("button").element as HTMLButtonElement).disabled).toBe(false);

      const disabled = mount(TextField, {
        props: { ariaLabel: "Password", type: "password", revealable: true, disabled: true },
      });
      expect((disabled.get("button").element as HTMLButtonElement).disabled).toBe(true);
    });

    it("never submits the form it sits in", () => {
      const wrapper = mount(TextField, {
        props: { ariaLabel: "Password", type: "password", revealable: true },
      });
      expect(wrapper.get("button").attributes("type")).toBe("button");
    });
  });

  describe("character count", () => {
    it("leaves the field's box exactly as it was when no count is asked for", () => {
      // Nothing but the input inside the border: no counter, no live region,
      // and no wrapper span that would put a gap in the row.
      const wrapper = mount(TextField, { props: { ariaLabel: "Name" } });
      expect(wrapper.findAll("span")).toHaveLength(0);
      expect(wrapper.findAll("input")).toHaveLength(1);
      expect(wrapper.get("input").attributes("aria-describedby")).toBeUndefined();
    });

    it("shows the counter as soon as a maximum is set, and lets showCount overrule that either way", () => {
      const limited = mount(TextField, { props: { ariaLabel: "Bio", maxLength: 20 } });
      expect(counterOf(limited).text()).toBe("0/20");

      const suppressed = mount(TextField, {
        props: { ariaLabel: "Bio", maxLength: 20, showCount: false },
      });
      expect(suppressed.find('[role="status"]').exists()).toBe(false);

      const unlimited = mount(TextField, { props: { ariaLabel: "Bio", showCount: true } });
      expect(counterOf(unlimited).text()).toBe("0");
    });

    it("counts what the reader typed with no v-model, without wiping the field to do it", async () => {
      // Uncontrolled: `modelValue` stays undefined while the counter forces a
      // re-render on every keystroke, and Vue's `value` patch coerces an
      // undefined binding to "". Counting the typed value is what keeps the
      // text in the box.
      const wrapper = mount(TextField, { props: { ariaLabel: "Bio", maxLength: 20 } });
      const input = wrapper.get("input");
      await input.setValue("hello");

      expect((input.element as HTMLInputElement).value).toBe("hello");
      expect(counterOf(wrapper).text()).toBe("5/20");
    });

    it("counts the value a controlled host actually applied, not the keystroke it declined", async () => {
      const wrapper = mount(TextField, {
        props: { ariaLabel: "Bio", maxLength: 20, modelValue: "ok" },
      });
      await wrapper.get("input").setValue("rejected");
      expect(counterOf(wrapper).text()).toBe("2/20");
    });

    it("describes the input with the counter, after the caller's own description and before the row's", () => {
      const row = mount(ProbeRow, {
        props: { describedBy: "bio-hint" },
        slots: {
          default: h(TextField, {
            ariaLabel: "Bio",
            maxLength: 20,
            modelValue: "hello",
            "aria-describedby": "bio-rules",
          }),
        },
      });
      const ids = (row.get("input").attributes("aria-describedby") ?? "").split(" ");

      expect(ids).toHaveLength(3);
      expect(ids[0]).toBe("bio-rules");
      expect(ids[2]).toBe("bio-hint");
      expect(row.get(`[id="${String(ids[1])}"]`).text()).toBe("5/20");
    });

    it("reports the limit rather than enforcing it, leaving the native maxlength to the caller", () => {
      const wrapper = mount(TextField, { props: { ariaLabel: "Bio", maxLength: 20 } });
      expect(wrapper.get("input").attributes("maxlength")).toBeUndefined();

      const enforced = mount(TextField, {
        props: { ariaLabel: "Bio", maxLength: 20 },
        attrs: { maxlength: 20 },
      });
      expect(enforced.get("input").attributes("maxlength")).toBe("20");
    });

    it("says the limit is passed in words, not only in red", async () => {
      const wrapper = mount(TextField, {
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
      const wrapper = mount(TextField, {
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

    it("takes the counter wording and the toggle name from the labels prop", async () => {
      const wrapper = mount(TextField, {
        props: {
          ariaLabel: "Bio",
          type: "password",
          revealable: true,
          maxLength: 20,
          modelValue: "hello",
          labels: {
            reveal: "Hiện mật khẩu",
            countOfMax: ({ count, max }) => `còn ${String(max - count)}`,
          },
        },
      });
      expect(counterOf(wrapper).text()).toBe("còn 15");
      expect(wrapper.get("button").attributes("aria-label")).toBe("Hiện mật khẩu");

      // Key by key: the override said nothing about the over-limit wording, so
      // Loom's English stands there rather than the slot falling back whole.
      await wrapper.setProps({ modelValue: "a".repeat(21) });
      expect(counterOf(wrapper).text()).toBe("21/20 over limit");
    });
  });
});
