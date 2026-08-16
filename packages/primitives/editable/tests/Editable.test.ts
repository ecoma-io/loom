import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import Editable from "../src/Editable.vue";
import { provideFieldContext } from "@ecoma-io/loom-labels";
import { attachToBody } from "../../../../packages/core/src/testing/attach-to-body";

// Every case here drives real focus, and focus only works for a tree that is
// actually in the document — so the mounted tree has to come back off it
// afterwards.
enableAutoUnmount(afterEach);

// Reka focuses the editor from a `watch` that defers to the next tick, and the
// focus hand-off after an edit ends defers once more on top of that. Waiting
// for the macrotask is what lets an assertion read a settled control rather
// than one mid-swap.
async function settle(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

// `@vue/test-utils`' `trigger` builds the event and then assigns the extra keys
// onto it, which throws on `MouseEvent.detail` — a getter with no setter. The
// component reads `detail` to tell a click synthesised by Enter or Space from a
// pointer one, so the distinction this file is testing only exists on a real
// `MouseEvent` constructed with it.
function fireMouse(el: Element, type: string, detail: number): void {
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, detail }));
}

function mountEditable(props: Record<string, unknown> = {}, attrs: Record<string, unknown> = {}) {
  return mount(Editable, {
    props: { modelValue: "Quarterly report", ...props },
    attrs,
    attachTo: document.body,
  });
}

// A stand-in for the Field wrapping this control. Field's own behaviour — which
// id it mints, when it publishes a description — is pinned in `Field.test.ts`.
// What matters here is the other half: that this control reads a row it is
// inside at all.
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

describe("Editable", () => {
  it("announces the resting value as a control, with the value first in its name", () => {
    // The accessibility failure specific to edit-in-place: it looks like text,
    // so without this it reads like text and a reader never learns the value
    // can be changed. The value has to come first, because that is the visible
    // label a voice-control reader will say out loud (WCAG 2.5.3).
    const wrapper = mountEditable();
    const preview = wrapper.get("button");

    expect(preview.element.tagName).toBe("BUTTON");
    expect(preview.attributes("type")).toBe("button");
    expect(preview.text()).toContain("Quarterly report");
    expect(preview.text().indexOf("Quarterly report")).toBeLessThan(preview.text().indexOf("Edit"));
  });

  it("opens the editor on a click and moves focus into it", async () => {
    const wrapper = mountEditable();
    fireMouse(wrapper.get("button").element, "click", 1);
    await settle();

    const input = wrapper.get("input");
    expect(input.attributes("hidden")).toBeUndefined();
    expect(document.activeElement).toBe(input.element);
  });

  it("keeps a single click inert in dblclick mode, and still opens on Enter", async () => {
    // A cell whose single click already selects its row is the case this mode
    // exists for — and a mode nobody can reach from a keyboard would be no mode
    // at all, which is why the synthesised click still opens it.
    const wrapper = mountEditable({ activationMode: "dblclick" });
    const preview = wrapper.get("button").element;

    fireMouse(preview, "click", 1);
    await settle();
    expect(wrapper.get("input").attributes("hidden")).toBe("");

    fireMouse(preview, "dblclick", 2);
    await settle();
    expect(wrapper.get("input").attributes("hidden")).toBeUndefined();
  });

  it("opens from the keyboard in a mode no keyboard can otherwise reach", async () => {
    const wrapper = mountEditable({ activationMode: "dblclick" });
    // Enter and Space on a `<button>` arrive as a click carrying `detail === 0`.
    fireMouse(wrapper.get("button").element, "click", 0);
    await settle();
    expect(wrapper.get("input").attributes("hidden")).toBeUndefined();
  });

  it("opens when focus lands on it in focus mode", async () => {
    const wrapper = mountEditable({ activationMode: "focus" });
    wrapper.get("button").element.focus();
    await settle();
    expect(wrapper.get("input").attributes("hidden")).toBeUndefined();
  });

  it("restores the previous value on Escape and reports a cancel", async () => {
    const wrapper = mountEditable();
    fireMouse(wrapper.get("button").element, "click", 1);
    await settle();

    await wrapper.get("input").setValue("Draft");
    await wrapper.get("input").trigger("keydown", { key: "Escape" });
    await settle();

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("cancel")).toHaveLength(1);
    expect(wrapper.get("button").text()).toContain("Quarterly report");
  });

  it("hands focus back to the preview when an edit ends, without re-opening it in focus mode", async () => {
    // The trap this control would otherwise set: ending an edit hides the
    // editor, focus falls to `<body>`, and a reader who opened the editor by
    // tabbing into it has lost their place in the document. Handing focus back
    // fixes that — and in focus mode would immediately re-open the editor they
    // just escaped from, so the returning focus is suppressed exactly once.
    const wrapper = mountEditable({ activationMode: "focus" });
    const preview = wrapper.get("button").element;

    preview.focus();
    await settle();
    await wrapper.get("input").trigger("keydown", { key: "Escape" });
    await settle();

    expect(document.activeElement).toBe(preview);
    expect(wrapper.get("input").attributes("hidden")).toBe("");
  });

  it("re-opens on a deliberate return in focus mode, so the suppression lasts one arrival", async () => {
    const wrapper = mountEditable({ activationMode: "focus" });
    const preview = wrapper.get("button").element;

    preview.focus();
    await settle();
    await wrapper.get("input").trigger("keydown", { key: "Escape" });
    await settle();

    preview.blur();
    preview.focus();
    await settle();
    expect(wrapper.get("input").attributes("hidden")).toBeUndefined();
  });

  it("leaves focus where a reader has already moved it", async () => {
    // The other half of the hand-off: only focus that was actually lost is
    // rescued. A reader who has moved on — clicked a button elsewhere, tabbed
    // into the next row — has put focus where they meant it, and pulling it
    // back would be the worse bug.
    const elsewhere = attachToBody(document.createElement("button"));
    const wrapper = mountEditable();
    fireMouse(wrapper.get("button").element, "click", 1);
    await settle();

    elsewhere.focus();
    await wrapper.get("input").trigger("keydown", { key: "Escape" });
    await settle();

    expect(document.activeElement).toBe(elsewhere);
  });

  it("commits on Enter, publishing the value once rather than once per keystroke", async () => {
    // The model moving only at the commit is what makes an edit abandonable:
    // a control that published every character would have nothing left to
    // restore by the time Escape was pressed.
    const wrapper = mountEditable();
    fireMouse(wrapper.get("button").element, "click", 1);
    await settle();

    await wrapper.get("input").setValue("Annual report");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();

    await wrapper.get("input").trigger("keydown", { key: "Enter" });
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([["Annual report"]]);
    expect(wrapper.emitted("submit")).toEqual([["Annual report"]]);
  });

  it("leaves Enter alone under submitMode blur", async () => {
    const wrapper = mountEditable({ submitMode: "blur" });
    fireMouse(wrapper.get("button").element, "click", 1);
    await settle();

    await wrapper.get("input").setValue("Annual report");
    await wrapper.get("input").trigger("keydown", { key: "Enter" });
    await settle();

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.get("input").attributes("hidden")).toBeUndefined();
  });

  it("shows the host's value until they acknowledge a submit, and its own when they never asked to", async () => {
    // Controlled: the prop is the value, so a host that rejects the submit sees
    // the old one stay put rather than a box that has already moved on.
    const controlled = mountEditable();
    fireMouse(controlled.get("button").element, "click", 1);
    await settle();
    await controlled.get("input").setValue("Annual report");
    await controlled.get("input").trigger("keydown", { key: "Enter" });
    await settle();
    expect(controlled.get("button").text()).toContain("Quarterly report");

    await controlled.setProps({ modelValue: "Annual report" });
    expect(controlled.get("button").text()).toContain("Annual report");

    // Uncontrolled: nobody is holding the value, so the control holds it.
    const uncontrolled = mount(Editable, {
      props: { ariaLabel: "Title" },
      attachTo: document.body,
    });
    fireMouse(uncontrolled.get("button").element, "click", 1);
    await settle();
    await uncontrolled.get("input").setValue("Annual report");
    await uncontrolled.get("input").trigger("keydown", { key: "Enter" });
    await settle();
    expect(uncontrolled.get("button").text()).toContain("Annual report");
  });

  it("refuses an empty submit, restores the value, and says so out loud", async () => {
    // The ambiguous case, decided: an empty submit restores. A value wrongly
    // kept is on screen and can be edited again; a title wrongly emptied is
    // gone — and under `submitMode: "blur"` it can be emptied by accident.
    const wrapper = mountEditable();
    fireMouse(wrapper.get("button").element, "click", 1);
    await settle();

    await wrapper.get("input").setValue("");
    await wrapper.get("input").trigger("keydown", { key: "Enter" });
    await settle();

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("submit")).toBeUndefined();
    expect(wrapper.emitted("cancel")).toHaveLength(1);
    expect(wrapper.get("button").text()).toContain("Quarterly report");
    expect(wrapper.get('[role="status"]').text()).toContain("Quarterly report");
  });

  it("re-opens on the restored value rather than on the emptied box", async () => {
    // The refusal has to reach the editor's own draft, not only the preview:
    // an editor that re-opened still empty would refuse the same submit
    // forever and look broken doing it.
    const wrapper = mountEditable();
    fireMouse(wrapper.get("button").element, "click", 1);
    await settle();
    await wrapper.get("input").setValue("");
    await wrapper.get("input").trigger("keydown", { key: "Enter" });
    await settle();

    fireMouse(wrapper.get("button").element, "click", 1);
    await settle();
    expect((wrapper.get("input").element as HTMLInputElement).value).toBe("Quarterly report");
  });

  it("keeps both states mounted and stacked under autoResize, so neither can be measured away", async () => {
    // The other half of the no-jump answer: Reka stacks the preview and the
    // editor in one grid cell and swaps visibility, so the box is the size of
    // the larger of the two in both states rather than of whichever is showing.
    const wrapper = mountEditable({ autoResize: true });
    const area = wrapper.get("button").element.parentElement;
    expect(area?.style.display).toBe("inline-grid");
    expect(wrapper.get("input").attributes("hidden")).toBeUndefined();

    fireMouse(wrapper.get("button").element, "click", 1);
    await settle();
    expect(wrapper.get("button").attributes("hidden")).toBeUndefined();
    expect(wrapper.get("button").element.style.visibility).toBe("hidden");
  });

  it("lets an empty value through when the field says it may be emptied", async () => {
    const wrapper = mountEditable({ allowEmpty: true });
    fireMouse(wrapper.get("button").element, "click", 1);
    await settle();

    await wrapper.get("input").setValue("");
    await wrapper.get("input").trigger("keydown", { key: "Enter" });
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([[""]]);
    expect(wrapper.get('[role="status"]').text()).toBe("");
  });

  it("commits from the submit button and abandons from the cancel button", async () => {
    // The two are not decoration: Enter commits and Escape abandons is an
    // invisible contract, and a pointer reader has no way to learn it.
    const committed = mountEditable();
    fireMouse(committed.get("button").element, "click", 1);
    await settle();
    await committed.get("input").setValue("Annual report");
    await committed.get('[aria-label="Save"]').trigger("click");
    await settle();
    expect(committed.emitted("submit")).toEqual([["Annual report"]]);

    const abandoned = mountEditable();
    fireMouse(abandoned.get("button").element, "click", 1);
    await settle();
    await abandoned.get("input").setValue("Annual report");
    await abandoned.get('[aria-label="Cancel"]').trigger("click");
    await settle();
    expect(abandoned.emitted("update:modelValue")).toBeUndefined();
    expect(abandoned.emitted("cancel")).toHaveLength(1);
    expect(document.activeElement).toBe(abandoned.get("button").element);
  });

  it("names every part in Loom's words rather than falling back to Reka's English", () => {
    // None of these strings is decoration: Reka writes `aria-label="editable
    // input"` on the editor and `submit`/`cancel` on its triggers, inside its
    // own render function and with no prop to reach them by. Deleting a binding
    // does not fall back to nothing — it falls back to English, which no test
    // of Loom's own strings would catch, so each one is read back off the DOM.
    const wrapper = mountEditable();
    expect(wrapper.get("input").attributes("aria-label")).toBe("Editable text");
    expect(wrapper.get('[aria-label="Save"]').text()).not.toContain("Submit");
    expect(wrapper.get('[aria-label="Cancel"]').text()).not.toContain("Cancel");
    expect(wrapper.find('[aria-label="submit"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="cancel"]').exists()).toBe(false);

    const localised = mountEditable({
      labels: { edit: "Rename", input: "Report title", submit: "Keep", cancel: "Discard" },
    });
    expect(localised.get("button").text()).toContain("Rename");
    expect(localised.get("input").attributes("aria-label")).toBe("Report title");
    expect(localised.find('[aria-label="Keep"]').exists()).toBe(true);
    expect(localised.find('[aria-label="Discard"]').exists()).toBe(true);

    // A caller who has already named the editor by reference outranks the
    // fallback, which would otherwise beat their name in the accname order.
    const referenced = mountEditable({}, { "aria-labelledby": "title-heading" });
    expect(referenced.get("input").attributes("aria-label")).toBeUndefined();
    expect(referenced.get("input").attributes("aria-labelledby")).toBe("title-heading");
  });

  it("never shows Reka's English placeholder in place of one nobody set", () => {
    const wrapper = mountEditable({ modelValue: "" });
    expect(wrapper.get("input").attributes("placeholder")).toBe("");
    expect(wrapper.text()).not.toContain("Enter text");
  });

  it("takes its id, description, name, required and invalid state from the row it sits in", () => {
    const row = mount(ProbeRow, {
      props: {
        controlId: "title",
        describedBy: "title-description",
        required: true,
        invalid: true,
      },
      slots: { default: h(Editable, { modelValue: "Quarterly report" }) },
      attachTo: document.body,
    });
    const input = row.get("input");

    expect(input.attributes("id")).toBe("title");
    expect(input.attributes("aria-describedby")).toBe("title-description");
    expect(input.attributes("aria-required")).toBe("true");
    expect(input.attributes("aria-invalid")).toBe("true");
    // The row names the editor through its own `<label for>`, and an
    // `aria-label` here would outrank it and replace that name with a generic
    // one — so the fallback stands down as soon as the row claims the id.
    expect(input.attributes("aria-label")).toBeUndefined();

    // The preview carries what a button may carry and no more: `aria-required`
    // is not allowed on `role="button"`, and inventing it there would be an
    // `aria-allowed-attr` failure rather than a courtesy.
    const preview = row.get("button");
    expect(preview.attributes("aria-describedby")).toBe("title-description");
    expect(preview.attributes("aria-invalid")).toBe("true");
    expect(preview.attributes("aria-required")).toBeUndefined();
  });

  it("lets an explicit prop overrule the row in both directions", () => {
    const optedOut = mount(ProbeRow, {
      props: { invalid: true, required: true, disabled: true },
      slots: {
        default: h(Editable, {
          modelValue: "Quarterly report",
          ariaLabel: "Title",
          invalid: false,
          required: false,
          disabled: false,
        }),
      },
      attachTo: document.body,
    });
    expect(optedOut.get("input").attributes("aria-invalid")).toBeUndefined();
    expect(optedOut.get("input").attributes("aria-required")).toBeUndefined();
    expect((optedOut.get("button").element as HTMLButtonElement).disabled).toBe(false);

    const optedIn = mount(ProbeRow, {
      slots: {
        default: h(Editable, { modelValue: "Quarterly report", ariaLabel: "Title", invalid: true }),
      },
      attachTo: document.body,
    });
    expect(optedIn.get("input").attributes("aria-invalid")).toBe("true");
  });

  it("adds the row's description to one the caller already set rather than replacing it", () => {
    const row = mount(ProbeRow, {
      props: { describedBy: "title-description" },
      slots: {
        default: h(Editable, {
          modelValue: "Quarterly report",
          ariaLabel: "Title",
          "aria-describedby": "title-rules",
        }),
      },
      attachTo: document.body,
    });
    expect(row.get("input").attributes("aria-describedby")).toBe("title-rules title-description");
  });

  it("submits under the row's name exactly once, through the hidden mirror rather than the editor", () => {
    // The editor is a real `<input>`, and a `hidden` input still posts. Carrying
    // the name on it as well as on the mirror Reka renders would post the field
    // twice — once with the committed value and once with whatever the box
    // happened to hold.
    const Form = defineComponent({
      setup: () => () =>
        h("form", [h(Editable, { modelValue: "Quarterly report", name: "title" })]),
    });
    const wrapper = mount(Form, { attachTo: document.body });

    const named = wrapper.findAll('input[name="title"]');
    expect(named).toHaveLength(1);
    expect((named[0]!.element as HTMLInputElement).value).toBe("Quarterly report");
  });

  it("drops a disabled control out of the tab order and refuses to open it", async () => {
    const wrapper = mountEditable({ disabled: true });
    const preview = wrapper.get("button");

    expect((preview.element as HTMLButtonElement).disabled).toBe(true);
    preview.element.focus();
    expect(document.activeElement).not.toBe(preview.element);

    fireMouse(preview.element, "click", 1);
    await settle();
    expect(wrapper.get("input").attributes("hidden")).toBe("");
  });

  it("keeps a read-only value reachable and readable while refusing to edit it", async () => {
    // Read-only and disabled are different states, not two dials on one: a
    // read-only value is one a reader may reach and copy. It is not rendered as
    // a button, because a button that refuses to act is worse than plain text.
    const wrapper = mountEditable({ readonly: true });

    const preview = wrapper.get('[tabindex="0"]');
    expect(preview.element.tagName).toBe("SPAN");
    expect(preview.text()).toContain("Quarterly report");
    expect(preview.text()).not.toContain("Edit");

    preview.element.dispatchEvent(new FocusEvent("focus"));
    fireMouse(preview.element, "click", 0);
    await settle();
    expect(wrapper.get("input").attributes("hidden")).toBe("");
  });

  // The three resting appearances, pinned as a set rather than one by one:
  // read-only and disabled used to share `bg-muted` and part on the text colour
  // alone, which is a distinction carried in hue and nothing else. Each state
  // now moves the fill, and both non-available ones move the border weight too,
  // so the progression survives a reader who cannot separate two greys.
  it("tells available, read-only and disabled apart on the fill and the border, not on hue alone", () => {
    // The padded box both states live in — `EditableArea`, which is what the
    // three appearances are painted on.
    const paint = (props: Record<string, unknown>): string[] => {
      const wrapper = mountEditable(props);
      const area = wrapper.get("input").element.parentElement;
      if (area === null) throw new Error("no editable area rendered");
      return [...area.classList];
    };

    const available = paint({});
    const readonly = paint({ readonly: true });
    const disabled = paint({ disabled: true });

    // At rest this control is deliberately just text: no fill, and a border
    // that reserves its width without spending its colour.
    expect(available).toContain("border-transparent");
    expect(available).not.toContain("bg-subtle");
    expect(available).not.toContain("bg-muted");

    // Lifted, and the value stays at full strength — 13.45:1 over this fill,
    // because being read is the whole purpose of the state.
    expect(readonly).toContain("bg-subtle");
    expect(readonly).toContain("border-input");
    expect(readonly).not.toContain("text-muted-foreground");

    // Drained one step further, on all three channels at once.
    expect(disabled).toContain("bg-muted");
    expect(disabled).toContain("text-muted-foreground");
    expect(disabled).toContain("border-border");

    // No fill is shared between the two, which is what the old treatment got
    // wrong, and no alpha has come back over the box that holds the value.
    expect(readonly).not.toContain("bg-muted");
    for (const state of [available, readonly, disabled]) {
      expect(state.some((name) => /(^|:)opacity-/.test(name))).toBe(false);
    }
  });

  // `cn()` resolves a border colour by whichever class it saw last, so this is
  // a claim about the order of the class list and it fails silently if that
  // order is ever tidied.
  it("keeps the destructive border on a control that is unavailable as well as invalid", () => {
    const wrapper = mountEditable({ invalid: true, disabled: true });
    const area = wrapper.get("input").element.parentElement;

    expect([...(area?.classList ?? [])]).toContain("border-destructive");
  });

  it("holds the preview and the editor in one box, so the swap cannot move the row", () => {
    // The layout answer is structural rather than a pair of matched heights:
    // both states are children of the same padded, bordered element, both are
    // single-line, and both inherit that element's type.
    const wrapper = mountEditable();
    expect(wrapper.get("button").element.parentElement).toBe(
      wrapper.get("input").element.parentElement,
    );
  });

  it("routes the fallthrough class onto the root and everything else onto the editor", () => {
    const wrapper = mountEditable(
      { ariaLabel: "Title" },
      { class: "w-64", "data-testid": "title", maxlength: undefined },
    );
    expect(wrapper.classes()).toContain("w-64");
    expect(wrapper.get("input").attributes("data-testid")).toBe("title");
    expect(wrapper.get("input").classes()).not.toContain("w-64");
  });

  it("caps the editor at the length it was given", () => {
    const wrapper = mountEditable({ maxLength: 8 });
    expect(wrapper.get("input").attributes("maxlength")).toBe("8");
  });
});
