import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import Collapse from "../src/Collapse.vue";

enableAutoUnmount(afterEach);

function mountCollapse(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(Collapse, {
    props,
    slots: { trigger: slots.trigger ?? "Details", default: slots.default ?? "<p>Hidden body</p>" },
  });
}

const trigger = (w: ReturnType<typeof mountCollapse>) => w.find("button");
const regionBox = (w: ReturnType<typeof mountCollapse>) => w.find("[data-loom-collapse]");

describe("Collapse", () => {
  it("renders a real button trigger wired to its region by aria-expanded and aria-controls", async () => {
    const wrapper = mountCollapse();
    const button = trigger(wrapper);
    expect(button.attributes("aria-expanded")).toBe("false");

    await button.trigger("click");
    expect(button.attributes("aria-expanded")).toBe("true");
    // The wrapper is detached from the document in test-utils, so resolve
    // the referenced region inside it rather than via getElementById.
    const controls = button.attributes("aria-controls");
    if (!controls) throw new Error("trigger carries no aria-controls");
    expect(wrapper.find(`[id="${controls}"]`).exists()).toBe(true);
  });

  // aria-controls must resolve before the first expansion, so the region
  // stays mounted while closed — concealed by Reka's hidden attribute
  // rather than removed, which is also what lets the collapse animation
  // play out on close instead of being unmounted mid-frame.
  it("keeps a closed region in the document, concealed under a hidden attribute", () => {
    const box = mountCollapse().get("[data-loom-collapse]");
    expect(box.attributes("data-state")).toBe("closed");
    expect(box.attributes("hidden")).toBeDefined();
    expect(box.text()).toContain("Hidden body");
  });

  it("opens and closes under its own state when uncontrolled", async () => {
    const wrapper = mountCollapse({ defaultOpen: true });
    expect(trigger(wrapper).attributes("aria-expanded")).toBe("true");
    // Concealment, not an internal attribute: open removes the hidden state,
    // closed restores it (pinned fully in the concealment test below).
    expect(regionBox(wrapper).attributes("hidden")).toBeUndefined();

    await trigger(wrapper).trigger("click");
    expect(trigger(wrapper).attributes("aria-expanded")).toBe("false");
  });

  it("reports toggles through update:open while a controlling host keeps the state", async () => {
    const wrapper = mountCollapse({ open: false });
    await trigger(wrapper).trigger("click");
    expect(wrapper.emitted("update:open")).toEqual([[true]]);
    // Controlled: the host decides; nothing opens on its own.
    expect(trigger(wrapper).attributes("aria-expanded")).toBe("false");
  });

  // Scoped, never unconditional: an unconditional height animation would
  // strand invisible boxes over the page — the failure Accordion's docblock
  // records for mount-only entrance classes.
  it("animates on the shared height pair, scoped to state", () => {
    const classes = mountCollapse({ defaultOpen: true }).get("[data-loom-collapse]").classes();
    expect(classes).toContain("data-[state=open]:animate-expand");
    expect(classes).toContain("data-[state=closed]:animate-collapse");
    expect(classes).not.toContain("animate-expand");
  });

  it("carries no padding on the animated box — the inner wrapper owns it, so neither end of the film pops", () => {
    const animated = mountCollapse({ defaultOpen: true }).get("[data-loom-collapse]");
    expect(animated.classes()).toContain("overflow-hidden");
    expect(animated.classes().join(" ")).not.toMatch(/p[xytb]?-\d/);
    expect(animated.find("div").classes()).toContain("pb-4");
  });

  it("disables rather than hides: a disabled trigger stays in place and refuses to open", async () => {
    const wrapper = mountCollapse({ disabled: true });
    const button = trigger(wrapper);
    expect(button.attributes("disabled")).toBeDefined();
    await button.trigger("click");
    expect(button.attributes("aria-expanded")).toBe("false");
  });

  it("hands the trigger's face and the live state to the host's slot content", () => {
    const wrapper = mount(Collapse, {
      props: { defaultOpen: true },
      slots: {
        trigger: `<template #trigger="{ open }"><span data-testid="face">{{ open }}</span></template>`,
        default: "body",
      },
    });
    expect(wrapper.get('[data-testid="face"]').text()).toBe("true");
  });

  it("nests: an inner collapse lives inside the outer's region without stealing its state", async () => {
    const wrapper = mount(Collapse, {
      props: {},
      slots: {
        trigger: "Outer",
        default: `
          <Collapse>
            <template #trigger><span>Inner</span></template>
            <p>Deep</p>
          </Collapse>
        `,
      },
      global: { components: { Collapse } },
    });
    const triggers = wrapper.findAll("button");
    expect(triggers.length).toBe(2);

    await triggers[1]!.trigger("click");
    expect(triggers[0]!.attributes("aria-expanded")).toBe("false");
    expect(triggers[1]!.attributes("aria-expanded")).toBe("true");
  });
});
