import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import OtpInput from "./OtpInput.vue";
import { attachToBody } from "../../testing/attach-to-body";

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
