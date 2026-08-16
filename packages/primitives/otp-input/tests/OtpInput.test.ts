import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref, type PropType, type VNode } from "vue";
import OtpInput from "../src/OtpInput.vue";
import { provideFieldContext } from "@ecoma-io/loom-labels";
import { provideLoomLabels, type LoomLabelOverrides } from "@ecoma-io/loom-labels";
import { attachToBody } from "../../../../packages/core/src/testing/attach-to-body";

// Reka moves real focus between the cells, and focus only works for a tree
// that is actually in the document.
enableAutoUnmount(afterEach);

function mountOtp(props: Partial<InstanceType<typeof OtpInput>["$props"]> = {}, attrs = {}) {
  return mount(OtpInput, { props, attrs, attachTo: document.body });
}

// Reka's root also renders a visually hidden `<input>` carrying the joined
// value for a surrounding `<form>`. It is `aria-hidden` and out of the tab
// order, so it is not a cell and no assertion about the cells may count it.
const CELL = 'input:not([aria-hidden="true"])';

function cellsOf(wrapper: ReturnType<typeof mountOtp>) {
  return wrapper.findAll(CELL);
}

function cells(wrapper: ReturnType<typeof mountOtp>): HTMLInputElement[] {
  return cellsOf(wrapper).map((cell) => cell.element as HTMLInputElement);
}

// The one cell a screen reader and a Tab press both reach: the row is a single
// stop, so every other cell is out of the tab order.
function tabStop(wrapper: ReturnType<typeof mountOtp>): number {
  return cells(wrapper).findIndex((cell) => cell.tabIndex === 0);
}

// A real `InputEvent`, not test-utils' `trigger`: `trigger` assigns its init
// keys onto a synthetic event and `InputEvent.data` is a getter with no
// setter — and `data` is exactly what Reka reads to tell one typed character
// from a burst of them.
async function type(cell: HTMLInputElement, char: string) {
  cell.focus();
  cell.value = char;
  cell.dispatchEvent(new InputEvent("input", { bubbles: true, data: char }));
  await nextTick();
}

// jsdom implements neither `DataTransfer` nor a `ClipboardEvent` that carries
// one, so the clipboard is defined onto a plain event in the shape Reka reads.
async function paste(cell: HTMLInputElement, text: string) {
  cell.focus();
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: { getData: () => text } });
  cell.dispatchEvent(event);
  await nextTick();
}

async function press(cell: HTMLInputElement, key: string) {
  cell.focus();
  cell.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key }));
  await nextTick();
}

function updates(wrapper: ReturnType<typeof mountOtp>): string[][] {
  return wrapper.emitted("update:modelValue") ?? [];
}

describe("OtpInput accessible naming", () => {
  it("names the whole row once, on a group, rather than once per cell", () => {
    const wrapper = mountOtp({ ariaLabel: "Verification code" });
    const group = wrapper.get('[role="group"]');
    expect(group.attributes("aria-label")).toBe("Verification code");

    // The cells carry position and nothing else: the purpose of the field is
    // announced on entering the group, and repeating it six times is the
    // failure this control is known for.
    for (const cell of cells(wrapper)) {
      expect(cell.getAttribute("aria-label")).not.toContain("Verification code");
    }
  });

  it("gives every cell its own position, so a reader always knows which one they are in", () => {
    const labels = cells(mountOtp({ length: 4 })).map((cell) => cell.getAttribute("aria-label"));
    expect(labels).toEqual(["Digit 1 of 4", "Digit 2 of 4", "Digit 3 of 4", "Digit 4 of 4"]);
  });

  it("calls a cell a character rather than a digit when the code is not numeric", () => {
    const wrapper = mountOtp({ type: "text", length: 2 });
    expect(cells(wrapper)[0]?.getAttribute("aria-label")).toBe("Character 1 of 2");
  });

  it("takes the group's name from a visible element when one already labels the row", () => {
    const label = attachToBody(document.createElement("span"));
    label.id = "otp-label";
    label.textContent = "Verification code";
    const wrapper = mountOtp({ ariaLabelledby: "otp-label" });
    expect(wrapper.get('[role="group"]').attributes("aria-labelledby")).toBe("otp-label");
  });
});

describe("OtpInput mobile affordances", () => {
  it("offers the SMS code on every cell, which is the whole reason this is not a TextField", () => {
    for (const cell of cells(mountOtp())) {
      expect(cell.getAttribute("autocomplete")).toBe("one-time-code");
    }
  });

  it("raises the digit keypad for a numeric code and the alphabet for a text one", () => {
    for (const cell of cells(mountOtp())) {
      expect(cell.getAttribute("inputmode")).toBe("numeric");
      expect(cell.getAttribute("pattern")).toBe("[0-9]*");
    }
    for (const cell of cells(mountOtp({ type: "text" }))) {
      expect(cell.getAttribute("inputmode")).toBe("text");
      expect(cell.getAttribute("pattern")).toBeNull();
    }
  });
});

describe("OtpInput keyboard path", () => {
  it("is one Tab stop, not one per cell", () => {
    const wrapper = mountOtp({ length: 6 });
    const tabbable = cells(wrapper).filter((cell) => cell.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
  });

  it("puts that stop on the first empty cell, so Tab lands where the next character goes", async () => {
    const wrapper = mountOtp({ modelValue: "" });
    expect(tabStop(wrapper)).toBe(0);
    await wrapper.setProps({ modelValue: "12" });
    expect(tabStop(wrapper)).toBe(2);
  });

  it("holds the stop on the last cell once the code is full, rather than dropping it", async () => {
    const wrapper = mountOtp({ length: 4, modelValue: "1234" });
    await nextTick();
    expect(tabStop(wrapper)).toBe(3);
  });

  it("moves the stop with the code for a host that binds no modelValue at all", async () => {
    const wrapper = mountOtp({ length: 4 });
    expect(tabStop(wrapper)).toBe(0);
    await type(cells(wrapper)[0]!, "1");
    expect(tabStop(wrapper)).toBe(1);
  });

  it("hands focus back to the first empty cell, so a code cannot be entered out of order", async () => {
    const wrapper = mountOtp({ length: 4, modelValue: "1" });
    await nextTick();
    const row = cells(wrapper);
    row[3]!.focus();
    await nextTick();
    expect(document.activeElement).toBe(row[1]);
  });

  it("advances focus to the next cell as each character is typed", async () => {
    const wrapper = mountOtp({ length: 4 });
    const row = cells(wrapper);
    await type(row[0]!, "1");
    expect(document.activeElement).toBe(row[1]);
    await type(row[1]!, "2");
    expect(document.activeElement).toBe(row[2]);
  });

  it("steps Backspace back into the previous cell and clears it when the current one is empty", async () => {
    const wrapper = mountOtp({ length: 4, modelValue: "12" });
    await nextTick();
    const row = cells(wrapper);
    await press(row[2]!, "Backspace");
    expect(document.activeElement).toBe(row[1]);
    expect(updates(wrapper).at(-1)?.[0]).toBe("1");
  });

  it("clears the cell it is in when Backspace lands on a filled one, without moving", async () => {
    const wrapper = mountOtp({ length: 4, modelValue: "12" });
    await nextTick();
    const row = cells(wrapper);
    await press(row[1]!, "Backspace");
    expect(document.activeElement).toBe(row[1]);
    expect(updates(wrapper).at(-1)?.[0]).toBe("1");
  });

  it("moves between cells with the arrow keys without changing the code", async () => {
    const wrapper = mountOtp({ length: 4, modelValue: "1234" });
    await nextTick();
    const row = cells(wrapper);
    await press(row[2]!, "ArrowLeft");
    expect(document.activeElement).toBe(row[1]);
    await press(row[1]!, "ArrowRight");
    expect(document.activeElement).toBe(row[2]);
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });
});

describe("OtpInput value", () => {
  it("reports a scalar string rather than the array of cells underneath", async () => {
    const wrapper = mountOtp({ length: 4 });
    const row = cells(wrapper);
    await type(row[0]!, "1");
    await type(row[1]!, "2");
    expect(updates(wrapper).map(([value]) => value)).toEqual(["1", "12"]);
  });

  it("keeps a leading zero, which the numeric array underneath would lose", async () => {
    const wrapper = mountOtp({ length: 4 });
    const row = cells(wrapper);
    await type(row[0]!, "0");
    await type(row[1]!, "7");
    expect(updates(wrapper).at(-1)?.[0]).toBe("07");
  });

  it("fills the cells from a host-supplied code and leaves the rest empty", async () => {
    const wrapper = mountOtp({ length: 4, modelValue: "12" });
    await nextTick();
    expect(cells(wrapper).map((cell) => cell.value)).toEqual(["1", "2", "", ""]);
  });

  // A host withdrawing `modelValue` back to `undefined` keeps what is in the
  // cells, because absent is not empty — the distinction `src/lib/props.ts`
  // exists for. It has no test: `exactOptionalPropertyTypes` refuses to let
  // one pass an explicit `undefined` for an optional prop, which is the same
  // rule stated from the other side.
  it.todo("keeps what is in the cells when the host stops supplying a value");

  it("renders nothing beyond the row for a code longer than it has cells", async () => {
    const wrapper = mountOtp({ length: 4, modelValue: "123456" });
    await nextTick();
    expect(cells(wrapper).map((cell) => cell.value)).toEqual(["1", "2", "3", "4"]);
  });

  it("closes the gap when a cell in the middle is cleared, so the row and the value agree", async () => {
    const wrapper = mountOtp({ length: 4, modelValue: "123" });
    await nextTick();
    const row = cells(wrapper);
    await press(row[1]!, "Backspace");
    // A string cannot hold a hole, so clearing the middle shifts what follows
    // left — exactly what deleting a character in a text input does.
    expect(updates(wrapper).at(-1)?.[0]).toBe("13");
    await wrapper.setProps({ modelValue: "13" });
    expect(cells(wrapper).map((cell) => cell.value)).toEqual(["1", "3", "", ""]);
  });

  it("refuses a non-digit in a numeric code and keeps the value unchanged", async () => {
    const wrapper = mountOtp({ length: 4 });
    await type(cells(wrapper)[0]!, "a");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("takes any character when the code is text", async () => {
    const wrapper = mountOtp({ length: 4, type: "text" });
    await type(cells(wrapper)[0]!, "a");
    expect(updates(wrapper).at(-1)?.[0]).toBe("a");
  });

  it("fills the row from one paste rather than dropping the code into one cell", async () => {
    const wrapper = mountOtp({ length: 6 });
    await paste(cells(wrapper)[0]!, "483920");
    expect(updates(wrapper).at(-1)?.[0]).toBe("483920");
    await wrapper.setProps({ modelValue: "483920" });
    expect(cells(wrapper).map((cell) => cell.value)).toEqual(["4", "8", "3", "9", "2", "0"]);
  });

  it("strips what a numeric code cannot hold out of a pasted string", async () => {
    const wrapper = mountOtp({ length: 6 });
    await paste(cells(wrapper)[0]!, "483-920");
    expect(updates(wrapper).at(-1)?.[0]).toBe("483920");
  });
});

describe("OtpInput completion", () => {
  it("announces the finished code once, as the last cell takes its character", async () => {
    const wrapper = mountOtp({ length: 3 });
    const row = cells(wrapper);
    await type(row[0]!, "1");
    await type(row[1]!, "2");
    expect(wrapper.emitted("complete")).toBeUndefined();
    await type(row[2]!, "3");
    expect(wrapper.emitted("complete")).toEqual([["123"]]);
  });

  it("announces it once for a pasted code too, not once per cell it filled", async () => {
    const wrapper = mountOtp({ length: 4 });
    await paste(cells(wrapper)[0]!, "1234");
    expect(wrapper.emitted("complete")).toEqual([["1234"]]);
  });

  it("does not announce the same code twice when it is pasted over itself", async () => {
    const wrapper = mountOtp({ length: 4 });
    await paste(cells(wrapper)[0]!, "1234");
    await paste(cells(wrapper)[0]!, "1234");
    expect(wrapper.emitted("complete")).toEqual([["1234"]]);
    expect(updates(wrapper).map(([value]) => value)).toEqual(["1234"]);
  });

  it("stays quiet when the host writes a finished code itself, rather than reporting it back", async () => {
    const wrapper = mountOtp({ length: 3, modelValue: "12" });
    await nextTick();
    // A host rewriting the value — restoring a draft, correcting a typo — is
    // fed straight back out of Reka as an update. Reporting it would hand the
    // host its own write as news, and would call a code nobody typed complete.
    await wrapper.setProps({ modelValue: "129" });
    await nextTick();
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("complete")).toBeUndefined();
  });

  it("does not announce it again when the host echoes the finished code back", async () => {
    const wrapper = mountOtp({ length: 3 });
    const row = cells(wrapper);
    await type(row[0]!, "1");
    await type(row[1]!, "2");
    await type(row[2]!, "3");
    // The round-trip a `v-model` host performs on every emit. Reka's own
    // `complete` fires from a deep watcher and would announce it a second time.
    await wrapper.setProps({ modelValue: "123" });
    expect(wrapper.emitted("complete")).toEqual([["123"]]);
    expect(updates(wrapper).map(([value]) => value)).toEqual(["1", "12", "123"]);
  });
});

describe("OtpInput states", () => {
  it("disables every cell and marks the group, so no path into the code is left open", () => {
    const wrapper = mountOtp({ disabled: true });
    expect(wrapper.get('[role="group"]').attributes("data-disabled")).toBeDefined();
    for (const cell of cells(wrapper)) {
      expect(cell.disabled).toBe(true);
    }
  });

  // The defect this pins: `disabled:opacity-50` faded the characters, and a
  // cell holds one character or one mask dot and nothing else — so a disabled
  // code did not dim so much as vanish. `--color-foreground` is 14.09:1 on the
  // resting fill and 2.99:1 once composited at half alpha; the drained fill
  // carries the state now and the character stays at a measured 4.68:1.
  it("drains an unavailable row in colour and weight rather than fading the code out of it", () => {
    const wrapper = mountOtp({ disabled: true, modelValue: "4839" });
    for (const cell of cellsOf(wrapper)) {
      expect(cell.classes().some((name) => /(^|:)opacity-/.test(name))).toBe(false);
      expect(cell.classes()).toEqual(
        expect.arrayContaining([
          "disabled:bg-muted",
          "disabled:text-muted-foreground",
          "disabled:cursor-not-allowed",
          // The third channel: the rim slackens with the fill and the text, so
          // the state is not told in hue alone. Plain rather than a `disabled:`
          // variant, because it has to lose to `border-destructive` — see the
          // invalid-and-unavailable case below.
          "border-border",
        ]),
      );
      expect(cell.classes()).not.toContain("border-input");
    }
    // The fill and the text colour are `disabled:` variants rather than plain
    // classes: each has to outrank the resting `bg-background text-foreground`
    // on specificity rather than on where Tailwind happened to emit it.
    expect(cellsOf(wrapper)[0]!.classes()).toEqual(
      expect.arrayContaining(["bg-background", "text-foreground"]),
    );
    // The filled cue is withheld while the row is unavailable: two rules moving
    // the same rim would leave a half-filled disabled row with a heavier edge
    // than an empty one, which reads as the more available of the two.
    expect(cellsOf(wrapper)[0]!.classes()).not.toContain("data-[filled]:border-border-strong");
  });

  it("keeps the destructive rim on a row that is both invalid and unavailable", () => {
    // The disabled rule and the invalid rule both name a border colour and
    // `cn()` resolves that by order, so this pins the order: an error that
    // stops being visible the moment the row goes unavailable is an error
    // nobody can act on.
    const wrapper = mountOtp({ disabled: true, invalid: true, modelValue: "4839" });
    for (const cell of cellsOf(wrapper)) {
      expect(cell.classes()).toContain("border-destructive");
      expect(cell.classes()).not.toContain("border-border");
    }
  });

  it("sets aria-invalid on every cell and paints the destructive border", () => {
    const wrapper = mountOtp({ invalid: true });
    expect(wrapper.get('[role="group"]').attributes("data-invalid")).toBe("true");
    for (const cell of cellsOf(wrapper)) {
      expect(cell.attributes("aria-invalid")).toBe("true");
      expect(cell.classes()).toContain("border-destructive");
    }

    const quiet = mountOtp();
    for (const cell of cellsOf(quiet)) {
      expect(cell.attributes("aria-invalid")).toBeUndefined();
      expect(cell.classes()).not.toContain("border-destructive");
    }
  });

  it("marks a filled cell with an attribute, so filled reads as filled without colour", async () => {
    const wrapper = mountOtp({ length: 4, modelValue: "12" });
    await nextTick();
    const filled = cellsOf(wrapper).map((cell) => cell.attributes("data-filled"));
    expect(filled).toEqual(["true", "true", undefined, undefined]);
  });

  it("masks the characters as dots when asked, and shows them otherwise", () => {
    for (const cell of cells(mountOtp({ mask: true }))) {
      expect(cell.type).toBe("password");
    }
    for (const cell of cells(mountOtp())) {
      expect(cell.type).toBe("text");
    }
  });

  it("renders exactly as many cells as the code is long", () => {
    expect(cells(mountOtp())).toHaveLength(6);
    expect(cells(mountOtp({ length: 4 }))).toHaveLength(4);
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
  control: VNode = h(OtpInput, { length: 4, ariaLabel: "Verification code" }),
) {
  return mount(ProbeRow, {
    props: rowProps,
    slots: { default: control },
    attachTo: document.body,
  });
}

describe("OtpInput inside a Field", () => {
  it("gives the group what describes the whole code and the cells what is a state of each box", () => {
    const row = mountRow({
      controlId: "code",
      describedBy: "code-description",
      required: true,
      invalid: true,
    });
    const group = row.get('[role="group"]');

    // The description is a fact about the whole code, and repeating it on four
    // cells would have a screen reader read it four times.
    expect(group.attributes("aria-describedby")).toBe("code-description");
    expect(group.attributes("data-invalid")).toBe("true");

    // `aria-required` is not supported on `role="group"` — it is not one of
    // the global states — so putting it there would be an `aria-allowed-attr`
    // violation announcing nothing. It belongs on the textboxes the claim is
    // about.
    expect(group.attributes("aria-required")).toBeUndefined();
    for (const cell of row.findAll('input:not([aria-hidden="true"])')) {
      expect(cell.attributes("aria-required")).toBe("true");
      expect(cell.attributes("aria-invalid")).toBe("true");
    }
  });

  it("disables every cell inside a disabled row", () => {
    const row = mountRow({ disabled: true });
    for (const cell of row.findAll('input:not([aria-hidden="true"])')) {
      expect((cell.element as HTMLInputElement).disabled).toBe(true);
    }
  });

  it("lets an explicit prop overrule the row in both directions", () => {
    const optedOut = mountRow(
      { invalid: true, disabled: true },
      h(OtpInput, { length: 2, ariaLabel: "Code", invalid: false, disabled: false }),
    );
    for (const cell of optedOut.findAll('input:not([aria-hidden="true"])')) {
      expect(cell.attributes("aria-invalid")).toBeUndefined();
      expect((cell.element as HTMLInputElement).disabled).toBe(false);
    }

    const optedIn = mountRow({}, h(OtpInput, { length: 2, ariaLabel: "Code", invalid: true }));
    expect(optedIn.get('input:not([aria-hidden="true"])').attributes("aria-invalid")).toBe("true");
  });

  it("ignores the row's read-only, so no cell takes the fill that marks a value on show", () => {
    // The documented decision, pinned from both sides. There is nothing to read
    // in an uneditable code box that a line of text would not show better, so
    // the library's three resting appearances collapse to two here: the cells
    // stay editable, and the lifted `subtle` fill that marks a read-only value
    // never appears on them.
    const row = mountRow({ readonly: true });
    for (const cell of row.findAll('input:not([aria-hidden="true"])')) {
      expect((cell.element as HTMLInputElement).readOnly).toBe(false);
      expect(cell.classes()).toContain("bg-background");
      expect(cell.classes()).not.toContain("bg-subtle");
    }
  });

  it("adopts the row's id on the one node a `<label for>` can usefully reach", () => {
    // `id` is a declared prop of Reka's root, not a fallthrough attr, and Reka
    // puts it on the hidden input rather than on the group. That is the better
    // target anyway: `<label for>` associates only with a labelable element,
    // which a `role="group"` div is not, and this input hands focus to the
    // first cell when it receives it — so clicking the row's label lands the
    // caret where the code is typed.
    const row = mountRow({ controlId: "code" });
    expect(row.get('input[aria-hidden="true"]').attributes("id")).toBe("code");
    expect(row.get('[role="group"]').attributes("id")).toBeUndefined();
  });

  it("keeps a caller's own id, so the row never moves a selector they published", () => {
    const row = mountRow(
      { controlId: "code" },
      h(OtpInput, { length: 2, ariaLabel: "Code", id: "chosen-by-the-host" }),
    );
    expect(row.get('input[aria-hidden="true"]').attributes("id")).toBe("chosen-by-the-host");
  });

  it("adds the row's description to one the caller already set rather than replacing it", () => {
    const row = mountRow(
      { describedBy: "code-description" },
      h(OtpInput, { length: 2, ariaLabel: "Code", "aria-describedby": "resend-hint" }),
    );
    expect(row.get('[role="group"]').attributes("aria-describedby")).toBe(
      "resend-hint code-description",
    );
  });

  it("posts the code under the row's name, through the hidden input rather than the group", async () => {
    const row = mountRow(
      { name: "otp" },
      h(OtpInput, { length: 4, modelValue: "4839", ariaLabel: "Code" }),
    );
    await nextTick();

    // A `name` on the group would be a `name` on a `<div>`, which no form
    // reads; Reka's own hidden input is the node a submission sees.
    expect(row.get('[role="group"]').attributes("name")).toBeUndefined();
    const submitted = row.get('input[aria-hidden="true"]').element as HTMLInputElement;
    expect(submitted.name).toBe("otp");
    expect(submitted.value).toBe("4839");
  });

  it("adds nothing at all when there is no row above it", () => {
    const bare = mountOtp({ length: 2, ariaLabel: "Code" });
    const group = bare.get('[role="group"]');

    expect(bare.get('input[aria-hidden="true"]').attributes("id")).toBeUndefined();
    expect(group.attributes("aria-describedby")).toBeUndefined();
    expect(group.attributes("data-invalid")).toBeUndefined();
    for (const cell of cellsOf(bare)) {
      expect(cell.attributes("aria-required")).toBeUndefined();
      expect(cell.attributes("aria-invalid")).toBeUndefined();
    }
    // Reka renders its hidden input unconditionally and names it `""` when
    // nothing has named it, which is a control no submission includes.
    expect((bare.get('input[aria-hidden="true"]').element as HTMLInputElement).name).toBe("");
  });
});

describe("OtpInput attribute routing", () => {
  it("merges a caller's class onto the group rather than concatenating it", () => {
    const wrapper = mountOtp({}, { class: "gap-4" });
    const group = wrapper.get('[role="group"]');
    expect(group.classes()).toContain("gap-4");
    // The merge is Tailwind-aware, so the row's own gap is dropped instead of
    // left to fight the caller's in declaration order.
    expect(group.classes()).not.toContain("gap-2");
  });

  it("routes every other fallthrough attribute to the group, never onto each cell", () => {
    const wrapper = mountOtp({}, { "aria-describedby": "otp-hint", "data-testid": "otp" });
    const group = wrapper.get('[role="group"]');
    expect(group.attributes("aria-describedby")).toBe("otp-hint");
    expect(group.attributes("data-testid")).toBe("otp");
    for (const cell of cellsOf(wrapper)) {
      expect(cell.attributes("data-testid")).toBeUndefined();
    }
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

function names(wrapper: ReturnType<typeof mountOtp>): (string | undefined)[] {
  return cellsOf(wrapper).map((cell) => cell.attributes("aria-label"));
}

describe("OtpInput labels", () => {
  it("names each cell from its own English, replacing the one Reka writes", () => {
    const digits = mountOtp({ length: 3 });
    expect(names(digits)).toEqual(["Digit 1 of 3", "Digit 2 of 3", "Digit 3 of 3"]);
    // Reka's own is `pin input 1 of 3`, lower-cased and with its own noun. A
    // dropped binding falls back to that rather than to no name at all, so the
    // check is that Reka's wording is nowhere in the row.
    for (const name of names(digits)) {
      expect(name).not.toMatch(/pin input/i);
    }

    const characters = mountOtp({ length: 2, type: "text" });
    expect(names(characters)).toEqual(["Character 1 of 2", "Character 2 of 2"]);
  });

  it("hands the position, the length and the kind over in one argument object", () => {
    // One key rather than a noun, a joiner and two numbers: Vietnamese puts the
    // count after the noun and needs no preposition, which no fragment
    // assembled on Loom's side could produce.
    const wrapper = mountOtp({
      length: 2,
      labels: {
        cell: ({ index, length, type }) =>
          `${type === "numeric" ? "Số" : "Ký tự"} ${String(index)}/${String(length)}`,
      },
    });
    expect(names(wrapper)).toEqual(["Số 1/2", "Số 2/2"]);
  });

  it("takes its names from a host's vocabulary, and lets one instance correct them", () => {
    const wrapper = mount(LabelHost, {
      attachTo: document.body,
      props: {
        vocabulary: () => ({
          otpInput: { cell: ({ index }) => `Số ${String(index)}` },
        }),
      },
      slots: {
        default: () => [
          h(OtpInput, { length: 2 }),
          h(OtpInput, {
            length: 2,
            // The per-instance case: a row whose cells are neither digits nor
            // characters in the reader's terms.
            labels: { cell: ({ index }: { index: number }) => `Nhóm ${String(index)}` },
          }),
        ],
      },
    });
    const rows = wrapper.findAll('[role="group"]');
    expect(rows[0]!.findAll(CELL).map((c) => c.attributes("aria-label"))).toEqual(["Số 1", "Số 2"]);
    expect(rows[1]!.findAll(CELL).map((c) => c.attributes("aria-label"))).toEqual([
      "Nhóm 1",
      "Nhóm 2",
    ]);
  });

  it("repaints every cell's name when the host switches language under it", async () => {
    const locale = ref("en");
    const wrapper = mount(LabelHost, {
      attachTo: document.body,
      props: {
        vocabulary: () =>
          locale.value === "en" ? {} : { otpInput: { cell: ({ index }) => `Số ${String(index)}` } },
      },
      slots: { default: () => h(OtpInput, { length: 2 }) },
    });
    expect(wrapper.findAll(CELL).map((c) => c.attributes("aria-label"))).toEqual([
      "Digit 1 of 2",
      "Digit 2 of 2",
    ]);

    locale.value = "vi";
    await nextTick();

    // The assertion that fails the moment a label is read once in `setup`
    // instead of through `text.` inside the render.
    expect(wrapper.findAll(CELL).map((c) => c.attributes("aria-label"))).toEqual(["Số 1", "Số 2"]);
  });
});
