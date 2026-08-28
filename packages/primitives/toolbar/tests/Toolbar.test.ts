import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Toolbar from "../src/Toolbar.vue";
import ToolbarSeparator from "../src/ToolbarSeparator.vue";

/**
 * jsdom resolves tab order for nothing, so these tests pin the roving
 * contract itself — tabindex ownership, the key map, and who is skipped —
 * by reading the attributes and driving focus/keydown directly. The one
 * thing only a browser can prove (that Tab really walks past the toolbar in
 * one stop) lives in the e2e spec.
 */

async function tickMutation(): Promise<void> {
  // The observer's callback and the queueMicrotask it schedules are both
  // microtasks, so two deterministic yields drain them — no timers.
  await Promise.resolve();
  await Promise.resolve();
  await flushPromises();
}

const threeButtons = {
  default: `
    <button type="button">Bold</button>
    <button type="button">Italic</button>
    <button type="button">Underline</button>
  `,
};

describe("Toolbar semantics", () => {
  it("renders role=toolbar with the accessible name from the label prop", () => {
    const wrapper = mount(Toolbar, {
      attachTo: document.body,
      props: { label: "Text formatting" },
      slots: threeButtons,
    });
    const root = wrapper.get("[role='toolbar']").element as HTMLElement;
    expect(root.getAttribute("role")).toBe("toolbar");
    expect(root.getAttribute("aria-label")).toBe("Text formatting");
    expect(root.getAttribute("aria-orientation")).toBe("horizontal");
  });
  it("announces vertical orientation and lets the consumer's aria-label win over the prop", () => {
    const wrapper = mount(Toolbar, {
      attachTo: document.body,
      props: { label: "Prop name", orientation: "vertical" },
      attrs: { "aria-label": "Consumer name" },
      slots: threeButtons,
    });
    const root = wrapper.get("[role='toolbar']").element as HTMLElement;
    expect(root.getAttribute("aria-orientation")).toBe("vertical");
    expect(root.getAttribute("aria-label")).toBe("Consumer name");
  });

  it("carries separator children with role=separator on the perpendicular axis, out of the walk", () => {
    const wrapper = mount(Toolbar, {
      attachTo: document.body,
      props: { label: "Tools" },
      slots: {
        default: `<button type="button">Bold</button>
          <ToolbarSeparator />
          <button type="button">Italic</button>`,
      },
      global: { components: { ToolbarSeparator } },
    });
    const separator = wrapper.find("[role='separator']");
    expect(separator.exists()).toBe(true);
    expect(separator.attributes("aria-orientation")).toBe("vertical");
    expect(separator.attributes("tabindex")).toBeUndefined();
  });

  it("flips the separator axis inside a vertical toolbar", () => {
    const wrapper = mount(Toolbar, {
      attachTo: document.body,
      props: { label: "Tools", orientation: "vertical" },
      slots: { default: `<button type="button">Bold</button><ToolbarSeparator />` },
      global: { components: { ToolbarSeparator } },
    });
    expect(wrapper.find("[role='separator']").attributes("aria-orientation")).toBe("horizontal");
  });
});

describe("Toolbar roving tabindex", () => {
  it("gives exactly one stop to the first control", () => {
    const wrapper = mount(Toolbar, {
      attachTo: document.body,
      props: { label: "Tools" },
      slots: threeButtons,
    });
    const buttons = wrapper.findAll("button");
    expect(buttons.map((b) => b.attributes("tabindex"))).toEqual(["0", "-1", "-1"]);
  });

  it("moves the stop and the focus with the arrows, both axes", async () => {
    const wrapper = mount(Toolbar, {
      attachTo: document.body,
      props: { label: "Tools" },
      slots: threeButtons,
    });
    const buttons = wrapper.findAll("button");
    buttons[0]!.element.focus();

    await buttons[0]!.trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement).toBe(buttons[1]!.element);
    expect(buttons.map((b) => b.attributes("tabindex"))).toEqual(["-1", "0", "-1"]);

    // The vertical pair moves too — each key maps to one direction.
    await buttons[1]!.trigger("keydown", { key: "ArrowDown" });
    expect(document.activeElement).toBe(buttons[2]!.element);
    await buttons[2]!.trigger("keydown", { key: "ArrowUp" });
    expect(document.activeElement).toBe(buttons[1]!.element);
    await buttons[1]!.trigger("keydown", { key: "ArrowLeft" });
    expect(document.activeElement).toBe(buttons[0]!.element);
  });

  it("wraps at both edges", async () => {
    const wrapper = mount(Toolbar, {
      attachTo: document.body,
      props: { label: "Tools" },
      slots: threeButtons,
    });
    const buttons = wrapper.findAll("button");
    buttons[0]!.element.focus();

    await buttons[0]!.trigger("keydown", { key: "ArrowLeft" });
    expect(document.activeElement).toBe(buttons[2]!.element);
    await buttons[2]!.trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement).toBe(buttons[0]!.element);
  });

  it("jumps to the ends with Home and End", async () => {
    const wrapper = mount(Toolbar, {
      attachTo: document.body,
      props: { label: "Tools" },
      slots: threeButtons,
    });
    const buttons = wrapper.findAll("button");
    buttons[0]!.element.focus();

    await buttons[0]!.trigger("keydown", { key: "End" });
    expect(document.activeElement).toBe(buttons[2]!.element);
    await buttons[2]!.trigger("keydown", { key: "Home" });
    expect(document.activeElement).toBe(buttons[0]!.element);
  });

  it("skips a disabled control but keeps its position", async () => {
    const wrapper = mount(Toolbar, {
      attachTo: document.body,
      props: { label: "Tools" },
      slots: {
        default: `
          <button type="button">Bold</button>
          <button type="button" disabled>Italic</button>
          <button type="button">Underline</button>
        `,
      },
    });
    const buttons = wrapper.findAll("button");
    expect(buttons).toHaveLength(3);
    // Only two stops exist: the disabled middle never gets a tabindex at all,
    // and the enabled pair walk straight past its slot.
    expect(buttons[1]!.attributes("tabindex")).toBeUndefined();
    expect(buttons[0]!.attributes("tabindex")).toBe("0");
    buttons[0]!.element.focus();
    await buttons[0]!.trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement).toBe(buttons[2]!.element);
    await buttons[2]!.trigger("keydown", { key: "ArrowLeft" });
    expect(document.activeElement).toBe(buttons[0]!.element);
  });

  it("skips a control the consumer marked aria-disabled", async () => {
    const wrapper = mount(Toolbar, {
      attachTo: document.body,
      props: { label: "Tools" },
      slots: {
        default: `
          <button type="button">Bold</button>
          <button type="button" aria-disabled="true">Italic</button>
          <button type="button">Underline</button>
        `,
      },
    });
    const buttons = wrapper.findAll("button");
    buttons[0]!.element.focus();
    await buttons[0]!.trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement).toBe(buttons[2]!.element);
  });

  it("skips hidden controls — attribute, aria-hidden subtree, and display:none", async () => {
    const wrapper = mount(Toolbar, {
      attachTo: document.body,
      props: { label: "Tools" },
      slots: {
        default: `
          <button type="button" hidden>Gone</button>
          <div aria-hidden="true"><button type="button">Hidden subtree</button></div>
          <button type="button" style="display: none">Display none</button>
          <button type="button">Bold</button>
          <button type="button">Italic</button>
        `,
      },
    });
    const buttons = wrapper.findAll("button");
    // Five buttons in the DOM, two stops: the walk starts on Bold.
    expect(buttons).toHaveLength(5);
    expect(buttons[3]!.attributes("tabindex")).toBe("0");
    buttons[3]!.element.focus();
    await buttons[3]!.trigger("keydown", { key: "ArrowLeft" });
    // Wrapping from the first real stop lands on the last real stop.
    expect(document.activeElement).toBe(buttons[4]!.element);
  });

  it("follows pointer focus onto whatever control holds it", async () => {
    const wrapper = mount(Toolbar, {
      attachTo: document.body,
      props: { label: "Tools" },
      slots: threeButtons,
    });
    const buttons = wrapper.findAll("button");
    buttons[2]!.element.focus();
    await flushPromises();
    expect(buttons.map((b) => b.attributes("tabindex"))).toEqual(["-1", "-1", "0"]);
  });

  it("leaves arrows inside an editable control to the control", async () => {
    const wrapper = mount(Toolbar, {
      attachTo: document.body,
      props: { label: "Tools" },
      slots: {
        default: `
          <button type="button">Bold</button>
          <input type="text" aria-label="Find">
        `,
      },
    });
    const input = wrapper.find("input");
    input.element.focus();
    await input.trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement).toBe(input.element);
    // The editable control is still a stop in the walk from a button.
    const buttons = wrapper.findAll("button");
    buttons[0]!.element.focus();
    await buttons[0]!.trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement).toBe(input.element);
  });

  it("picks up controls added after mount, through the mutation observer", async () => {
    const wrapper = mount(Toolbar, {
      attachTo: document.body,
      props: { label: "Tools" },
      slots: threeButtons,
    });
    const late = document.createElement("button");
    late.type = "button";
    late.textContent = "Strikethrough";
    (wrapper.get("[role='toolbar']").element as HTMLElement).appendChild(late);
    await tickMutation();

    const buttons = wrapper.findAll("button");
    expect(buttons).toHaveLength(4);
    expect(buttons[3]!.attributes("tabindex")).toBe("-1");
    buttons[3]!.element.focus();
    await buttons[3]!.trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement).toBe(buttons[0]!.element); // wrapped to the first
  });

  it("drops a control disabled after mount, through the mutation observer", async () => {
    const wrapper = mount(Toolbar, {
      attachTo: document.body,
      props: { label: "Tools" },
      slots: threeButtons,
    });
    const buttons = wrapper.findAll("button");
    buttons[0]!.element.setAttribute("disabled", "");
    await tickMutation();

    // The stop moved to the next enabled control; the disabled one is no
    // longer a stop, and the walk starts past it.
    expect(buttons[0]!.attributes("tabindex")).toBeUndefined();
    expect(buttons[1]!.attributes("tabindex")).toBe("0");
  });

  it("does not hijack Space or Enter on the controls", async () => {
    const wrapper = mount(Toolbar, {
      attachTo: document.body,
      props: { label: "Tools" },
      slots: threeButtons,
    });
    const buttons = wrapper.findAll("button");
    buttons[0]!.element.focus();
    await buttons[0]!.trigger("keydown", { key: " " });
    await buttons[0]!.trigger("keydown", { key: "Enter" });
    expect(buttons.map((b) => b.attributes("tabindex"))).toEqual(["0", "-1", "-1"]);
    expect(document.activeElement).toBe(buttons[0]!.element);
  });
});
