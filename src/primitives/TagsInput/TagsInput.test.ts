import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import TagsInput, { type TagsInputRejection } from "./TagsInput.vue";
import Field from "../Field/Field.vue";

// Several tests read `document.activeElement`, which only means anything for a
// tree that is actually in the document — and a mount left attached is a tree
// the next test's queries can still see.
enableAutoUnmount(afterEach);

/**
 * Reka's input commits on a `nextTick` of its own, Loom's model handler runs on
 * the watcher flush after that, and the handler restoring a refused draft waits
 * one more. Three flushes covers the chain; a test awaiting fewer passes
 * intermittently, which is worse than failing.
 */
async function settle(): Promise<void> {
  await nextTick();
  await nextTick();
  await nextTick();
}

/**
 * A mounted wrapper's `element` is `any` to this file — ESLint's TypeScript
 * program resolves an SFC's type only from another `.vue`, which is the same
 * caveat `src/lib/labels.ts` documents from the other side. Narrowing once here
 * is what keeps every helper below honestly typed.
 */
function root(value: unknown): Element {
  if (!(value instanceof Element)) throw new Error("expected a mounted element");
  return value;
}

function all(within: unknown, selector: string): Element[] {
  return [...root(within).querySelectorAll(selector)];
}

function box(within: unknown): HTMLInputElement {
  const input = root(within).querySelector("input[type='text']");
  if (!(input instanceof HTMLInputElement)) throw new Error("no text box rendered");
  return input;
}

/** The bordered box, which is the node the field's own state is painted and marked on. */
function fieldBox(within: unknown): Element {
  const first = root(within).firstElementChild;
  if (first === null) throw new Error("no field box rendered");
  return first;
}

function named(within: unknown, name: string): Element {
  const found = root(within).querySelector(`[aria-label='${name}']`);
  if (found === null) throw new Error(`no element named ${name}`);
  return found;
}

/** The text of every rendered token, in order. */
function tokens(within: unknown): string[] {
  return all(within, "li").map((item) => item.textContent.trim());
}

/** What a screen reader would read off `aria-describedby`, in the order it names the ids. */
function describedText(within: unknown, element: Element): string {
  return (element.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter((id) => id.length > 0)
    .map((id) => root(within).querySelector(`[id='${id}']`)?.textContent.trim() ?? "")
    .join(" ");
}

/** The live region's text, which is empty until something is refused. */
function announced(within: unknown): string {
  return root(within).querySelector("[aria-live='polite']")?.textContent.trim() ?? "";
}

function press(target: Element, key: string): void {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

function click(target: Element): void {
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
}

/** Types `value` into the box and presses Enter, the shortest path to a committed token. */
async function commit(within: unknown, value: string): Promise<void> {
  const input = box(within);
  input.value = value;
  input.dispatchEvent(new InputEvent("input", { bubbles: true, data: value }));
  press(input, "Enter");
  await settle();
}

/** A paste, as the browser delivers one: the clipboard text and nothing in the box yet. */
function paste(input: HTMLInputElement, clipboard: string): void {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: { getData: () => clipboard } });
  input.dispatchEvent(event);
}

describe("TagsInput", () => {
  it("commits a token on Enter and emits the whole list, trimmed", async () => {
    const wrapper = mount(TagsInput, { props: { ariaLabel: "Keywords" } });

    await commit(wrapper.element, "  design  ");

    expect(wrapper.emitted("update:modelValue")).toEqual([[["design"]]]);
    expect(tokens(wrapper.element)).toEqual(["design"]);
    expect(box(wrapper.element).value).toBe("");
  });

  it("commits on the delimiter as well as on Enter", async () => {
    const wrapper = mount(TagsInput, { props: { ariaLabel: "Keywords" } });
    const input = box(wrapper.element);

    // What the browser produces when the reader types the comma: the character
    // is already in the box, and `data` says which one arrived.
    input.value = "design,";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "," }));
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([[["design"]]]);
    expect(box(wrapper.element).value).toBe("");
  });

  it("splits a pasted list into one token per value, with no blank left by the trailing delimiter", async () => {
    const wrapper = mount(TagsInput, { props: { ariaLabel: "Keywords" } });

    paste(box(wrapper.element), "design, research, ux,");
    await settle();

    expect(tokens(wrapper.element)).toEqual(["design", "research", "ux"]);
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([["design", "research", "ux"]]);
  });

  // The behaviour this control is most likely to get wrong. Reka's own handler
  // marks the last token on the first Backspace and destroys it on the second,
  // with no focus move and no `aria-activedescendant` in between — a value
  // deleted after a selection the reader was never told about.
  it("lifts the last token back into the box on Backspace rather than deleting it", async () => {
    const wrapper = mount(TagsInput, {
      props: { modelValue: ["design", "research"], ariaLabel: "Keywords" },
    });

    press(box(wrapper.element), "Backspace");
    await settle();

    expect(wrapper.emitted("update:modelValue")).toEqual([[["design"]]]);
    expect(box(wrapper.element).value).toBe("research");
    expect(box(wrapper.element).selectionStart).toBe("research".length);
  });

  it("leaves Reka's virtual token selection unreachable, so no token is ever marked without being announced", async () => {
    const wrapper = mount(TagsInput, {
      props: { modelValue: ["design", "research"], ariaLabel: "Keywords" },
    });

    // The keys Reka answers by marking a token in place rather than by moving
    // focus to it.
    press(box(wrapper.element), "ArrowLeft");
    press(box(wrapper.element), "Delete");
    await settle();

    expect(all(wrapper.element, "[data-state='active']")).toHaveLength(0);
    expect(all(wrapper.element, "[aria-current='true']")).toHaveLength(0);
    expect(tokens(wrapper.element)).toEqual(["design", "research"]);
  });

  it("leaves the tokens alone when Backspace lands on a box that still holds text", async () => {
    const wrapper = mount(TagsInput, {
      props: { modelValue: ["design"], ariaLabel: "Keywords" },
    });
    const input = box(wrapper.element);
    input.value = "res";
    input.setSelectionRange(0, 0);

    press(input, "Backspace");
    await settle();

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(tokens(wrapper.element)).toEqual(["design"]);
  });

  it("names each remove control with the token it removes, never six buttons called Remove", async () => {
    const wrapper = mount(TagsInput, {
      props: { modelValue: ["design", "research"], ariaLabel: "Keywords" },
    });

    expect(
      all(wrapper.element, "li button").map((button) => button.getAttribute("aria-label")),
    ).toEqual(["Remove design", "Remove research"]);

    click(named(wrapper.element, "Remove design"));
    await settle();
    expect(wrapper.emitted("update:modelValue")).toEqual([[["research"]]]);
  });

  it("hands focus to the text box after a removal, which is the only node here that never leaves", async () => {
    const wrapper = mount(TagsInput, {
      props: { modelValue: ["design"], ariaLabel: "Keywords" },
      attachTo: document.body,
    });

    click(named(wrapper.element, "Remove design"));
    await settle();

    expect(document.activeElement).toBe(box(wrapper.element));
  });

  it("publishes the token count through aria-describedby, since the field announces no total of its own", async () => {
    const wrapper = mount(TagsInput, {
      props: { modelValue: ["design"], ariaLabel: "Keywords" },
    });

    expect(describedText(wrapper.element, box(wrapper.element))).toBe("1 tag");

    await wrapper.setProps({ modelValue: ["design", "research"] });
    expect(describedText(wrapper.element, box(wrapper.element))).toBe("2 tags");

    await wrapper.setProps({ max: 5 });
    expect(describedText(wrapper.element, box(wrapper.element))).toBe("2 of 5 tags");
  });

  it("refuses a repeated value, says so in a live region, and reports it", async () => {
    const wrapper = mount(TagsInput, {
      props: { modelValue: ["design"], ariaLabel: "Keywords" },
    });

    await commit(wrapper.element, "design");

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("reject")?.[0]).toEqual([
      [{ value: "design", reason: "duplicate" }] satisfies TagsInputRejection[],
    ]);
    expect(announced(wrapper.element)).toBe("design has already been added.");
    expect(describedText(wrapper.element, box(wrapper.element))).toContain(
      "design has already been added.",
    );
  });

  it("keeps a repeated value when duplicates are allowed", async () => {
    const wrapper = mount(TagsInput, {
      props: { modelValue: ["design"], duplicates: true, ariaLabel: "Keywords" },
    });

    await commit(wrapper.element, "design");

    expect(wrapper.emitted("update:modelValue")).toEqual([[["design", "design"]]]);
    expect(tokens(wrapper.element)).toEqual(["design", "design"]);
  });

  it("refuses anything past max and names the limit in the message", async () => {
    const wrapper = mount(TagsInput, {
      props: { modelValue: ["design", "research"], max: 2, ariaLabel: "Keywords" },
    });

    await commit(wrapper.element, "ux");

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("reject")?.[0]).toEqual([
      [{ value: "ux", reason: "max" }] satisfies TagsInputRejection[],
    ]);
    expect(announced(wrapper.element)).toBe("ux was not added — the field is full.");
  });

  // The rules apply to the whole list, so what is on screen can never be
  // something the box would have refused — but only what the reader just did is
  // reported. A message about a token that was there when the page loaded
  // describes nothing they did.
  it("normalises a seeded list quietly while still reporting what the reader was refused", async () => {
    const wrapper = mount(TagsInput, {
      props: { modelValue: ["ux", "ux"], ariaLabel: "Aliases" },
    });

    await commit(wrapper.element, "design");

    expect(wrapper.emitted("update:modelValue")).toEqual([[["ux", "design"]]]);
    expect(wrapper.emitted("reject")).toBeUndefined();
    expect(announced(wrapper.element)).toBe("");
  });

  // A refused value has already been cleared out of the box by Reka. Leaving it
  // gone is the same failure as deleting a token silently: the reader is left
  // retyping something they can no longer see.
  it("puts a single refused draft back in the box instead of eating it", async () => {
    const wrapper = mount(TagsInput, {
      props: { modelValue: ["design"], ariaLabel: "Keywords" },
    });

    await commit(wrapper.element, "design");

    expect(box(wrapper.element).value).toBe("design");
  });

  // Reka writes every proposal into its own model before Loom sees it, and the
  // hidden inputs it renders for `name` post from that model. A refusal that
  // was not written back would be invisible on screen and still submitted.
  it("puts a refused value back out of the model underneath, not only out of the view", async () => {
    const wrapper = mount(TagsInput, {
      props: { modelValue: ["design"], ariaLabel: "Keywords" },
    });

    await commit(wrapper.element, "design");
    await commit(wrapper.element, "research");

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([["design", "research"]]);
    expect(tokens(wrapper.element)).toEqual(["design", "research"]);
  });

  it("clears the refusal message as soon as the reader edits the list past it", async () => {
    const wrapper = mount(TagsInput, {
      props: { modelValue: ["design"], ariaLabel: "Keywords" },
    });

    await commit(wrapper.element, "design");
    expect(announced(wrapper.element)).not.toBe("");

    click(named(wrapper.element, "Remove design"));
    await settle();
    expect(announced(wrapper.element)).toBe("");
  });

  it("shows read-only tokens with no way to remove them, and takes nothing new", async () => {
    const wrapper = mount(TagsInput, {
      props: { modelValue: ["design"], readonly: true, ariaLabel: "Keywords" },
    });

    expect(tokens(wrapper.element)).toEqual(["design"]);
    expect(all(wrapper.element, "li button")).toHaveLength(0);
    expect(box(wrapper.element).readOnly).toBe(true);
    expect(box(wrapper.element).disabled).toBe(false);

    // Reka's paste handler reads the clipboard directly and never consults the
    // input's own `readonly`, so this is the one refusal the attribute cannot
    // make by itself.
    paste(box(wrapper.element), "research");
    await settle();

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(tokens(wrapper.element)).toEqual(["design"]);
  });

  // Disabled and read-only are not two dials on one, and the remove controls
  // are where they part: a read-only field has none at all, while a disabled
  // one keeps them, inert — the row does not reflow on its way to unavailable.
  it("takes a disabled field out of the tab order entirely and leaves its remove controls inert", () => {
    const wrapper = mount(TagsInput, {
      props: { modelValue: ["design"], disabled: true, ariaLabel: "Keywords" },
    });

    expect(box(wrapper.element).disabled).toBe(true);
    const remove = all(wrapper.element, "li button");
    expect(remove).toHaveLength(1);
    expect(remove.every((button) => button.hasAttribute("disabled"))).toBe(true);
    expect(fieldBox(wrapper.element).getAttribute("data-disabled")).toBe("true");
    expect(fieldBox(wrapper.element).getAttribute("data-readonly")).toBeNull();
  });

  // Reka's clear control refuses to fire while the root is disabled, but it
  // stays a `<button>` — and a control that is a tab stop and does nothing is
  // exactly what "disabled" is supposed to stop being.
  it("leaves no tab stop behind on a disabled field, the clear control included", () => {
    const wrapper = mount(TagsInput, {
      props: { modelValue: ["design"], clearable: true, disabled: true, ariaLabel: "Keywords" },
    });

    const controls = all(wrapper.element, "button, input:not([type='hidden'])");
    expect(controls.length).toBeGreaterThan(1);
    expect(controls.every((control) => control.hasAttribute("disabled"))).toBe(true);
  });

  it("marks the invalid state in ARIA as well as in the border", () => {
    const wrapper = mount(TagsInput, { props: { invalid: true, ariaLabel: "Keywords" } });

    expect(box(wrapper.element).getAttribute("aria-invalid")).toBe("true");
    expect(fieldBox(wrapper.element).getAttribute("data-invalid")).toBe("true");
  });

  it("empties the field from the clear control and returns focus to the box", async () => {
    const wrapper = mount(TagsInput, {
      props: { modelValue: ["design", "research"], clearable: true, ariaLabel: "Keywords" },
      attachTo: document.body,
    });

    click(named(wrapper.element, "Clear all tags"));
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([[]]);
    expect(tokens(wrapper.element)).toEqual([]);
    expect(document.activeElement).toBe(box(wrapper.element));
  });

  it("hides the placeholder once a token exists, where it would claim the field is empty", async () => {
    const wrapper = mount(TagsInput, {
      props: { placeholder: "Add a keyword", ariaLabel: "Keywords" },
    });
    expect(box(wrapper.element).placeholder).toBe("Add a keyword");

    await wrapper.setProps({ modelValue: ["design"] });
    expect(box(wrapper.element).getAttribute("placeholder")).toBeNull();
  });

  it("takes every name it says from the labels bag, and keeps Loom's English for the keys left out", async () => {
    const wrapper = mount(TagsInput, {
      props: {
        modelValue: ["ana@ecoma.io"],
        clearable: true,
        ariaLabel: "Recipients",
        labels: {
          remove: ({ value }: { value: string }) => `Bỏ ${value}`,
          count: ({ count }: { count: number }) => `${String(count)} người nhận`,
          clear: "Xoá tất cả",
        },
      },
    });

    expect(named(wrapper.element, "Bỏ ana@ecoma.io")).toBeTruthy();
    expect(describedText(wrapper.element, box(wrapper.element))).toBe("1 người nhận");
    expect(named(wrapper.element, "Xoá tất cả")).toBeTruthy();

    // A partial bag is the shape a host actually writes, and the key it left
    // out has to stay a sentence rather than becoming nothing.
    await commit(wrapper.element, "ana@ecoma.io");
    expect(announced(wrapper.element)).toBe("ana@ecoma.io has already been added.");
  });

  it("posts each token under the row's name, and never the half-typed draft", async () => {
    const form = mount(
      defineComponent({
        setup: () => () =>
          h("form", [
            h(TagsInput, { modelValue: ["design"], name: "keywords", ariaLabel: "Keywords" }),
          ]),
      }),
      { attachTo: document.body },
    );
    await settle();

    const posted = all(form.element, "input[name]").map((input) => ({
      name: input.getAttribute("name"),
      value: input instanceof HTMLInputElement ? input.value : "",
    }));
    expect(posted).toEqual([{ name: "keywords[0]", value: "design" }]);
  });

  describe("inside a Field", () => {
    it("adopts the row's id, description, name and states without a word at the call site", () => {
      const row = mount(
        defineComponent({
          setup: () => () =>
            h(
              Field,
              { label: "Keywords", error: "Pick at least one", name: "keywords", required: true },
              { default: () => h(TagsInput) },
            ),
        }),
        { attachTo: document.body },
      );

      const input = box(row.element);
      const label = root(row.element).querySelector("label");

      expect(label?.getAttribute("for")).toBe(input.id);
      expect(input.getAttribute("aria-required")).toBe("true");
      expect(input.getAttribute("aria-invalid")).toBe("true");
      // The row's error is *added* to what the field already says about itself
      // rather than swapped for it, so the count is still there to be heard.
      expect(describedText(row.element, input)).toContain("0 tags");
      expect(describedText(row.element, input)).toContain("Pick at least one");
      // The name belongs to the hidden inputs the tokens post through, never to
      // the text box, which holds a draft rather than the value.
      expect(input.getAttribute("name")).toBeNull();
    });

    it("lets the control's own false beat a row that disabled everything in it", () => {
      const row = mount(
        defineComponent({
          setup: () => () =>
            h(
              Field,
              { label: "Keywords", disabled: true },
              { default: () => h(TagsInput, { disabled: false }) },
            ),
        }),
      );

      expect(box(row.element).disabled).toBe(false);
    });
  });

  it("routes a caller's class onto the control and everything else onto the box", () => {
    const wrapper = mount(TagsInput, {
      props: { ariaLabel: "Keywords" },
      attrs: { class: "w-64", "data-testid": "keywords", autocomplete: "off" },
    });

    expect(wrapper.classes()).toContain("w-64");
    expect(wrapper.attributes("data-testid")).toBeUndefined();
    expect(box(wrapper.element).getAttribute("data-testid")).toBe("keywords");
    expect(box(wrapper.element).getAttribute("autocomplete")).toBe("off");
  });
});
