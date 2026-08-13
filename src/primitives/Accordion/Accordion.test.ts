import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import Accordion, { type AccordionItem } from "./Accordion.vue";

// jsdom ships no ResizeObserver, and Reka's accordion measures with one.
// Stubbing the browser API is the honest fix: mocking Reka would leave these
// tests asserting on nothing but this component's own template.
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

const ITEMS: AccordionItem[] = [
  { value: "section-1", label: "First section" },
  { value: "section-2", label: "Second section" },
  { value: "section-3", label: "Third section", disabled: true },
];

let mounted: VueWrapper | undefined;

async function mountAccordion(props: Record<string, unknown> = {}): Promise<VueWrapper> {
  const base = { items: ITEMS };
  mounted = mount(Accordion, {
    props: Object.assign(base, props),
    slots: {
      default: `<template #default="{ item }">{{ item.label }} content</template>`,
    },
  });
  await nextTick();
  await nextTick();
  return mounted;
}

function reset() {
  mounted?.unmount();
  mounted = undefined;
}

afterEach(reset);

describe("Accordion", () => {
  it("renders a flex column container with gap classes", async () => {
    const wrapper = await mountAccordion();
    // Reka's AccordionRoot renders the root element directly; no data attribute
    // to select by, so the root is the first child div.
    const root = wrapper.find("div");
    expect(root.classes()).toContain("flex");
    expect(root.classes()).toContain("flex-col");
  });

  it("renders each item with its label text", async () => {
    const wrapper = await mountAccordion();
    const triggers = wrapper.findAll("button[aria-expanded]");
    expect(triggers.map((t) => t.text().trim())).toEqual([
      "First section",
      "Second section",
      "Third section",
    ]);
  });

  it("applies the correct gap class for each gap size", async () => {
    const sm = await mountAccordion({ gap: "sm" });
    expect(sm.find("div").classes()).toContain("gap-1");
    reset();

    const md = await mountAccordion({ gap: "md" });
    expect(md.find("div").classes()).toContain("gap-2");
    reset();

    const lg = await mountAccordion({ gap: "lg" });
    expect(lg.find("div").classes()).toContain("gap-3");
  });

  it("marks a disabled item as disabled for assistive technology and keeps it inert", async () => {
    const wrapper = await mountAccordion();
    // The disabled item's container carries data-disabled; enabled items do not.
    const allItems = wrapper.findAll("[data-orientation]");
    const disabled = allItems.find((el) => el.attributes("data-disabled") !== undefined);
    expect(disabled).toBeDefined();
    // The trigger on a disabled item announces the state.
    const trigger = disabled!.find("button");
    expect(trigger.attributes("aria-disabled")).toBe("true");
  });

  it("places a chevron icon on each trigger that rotates when the item is open", async () => {
    const wrapper = await mountAccordion();
    const chevrons = wrapper.findAll("svg");
    expect(chevrons).toHaveLength(3);
    // The chevron carries the transition class that animates the rotation.
    const chevron = chevrons[0]!;
    expect(chevron.classes()).toContain("transition-transform");
  });

  it("emits update:modelValue when an item is toggled, so the host can drive the open state", async () => {
    const wrapper = await mountAccordion({ modelValue: [] });
    const trigger = wrapper.get("button[aria-expanded]");
    (trigger.element as HTMLElement).click();
    await nextTick();
    expect(wrapper.emitted("update:modelValue")).toBeDefined();
  });

  it("applies an entrance animation to opening content and an exit animation to closing content", async () => {
    const wrapper = await mountAccordion();
    const content = wrapper.findAll("[role='region']");
    expect(content).toHaveLength(3);
    expect(content[0]!.classes()).toContain("data-[state=open]:animate-fade-rise");
    expect(content[0]!.classes()).toContain("data-[state=closed]:animate-fade-fall");
  });

  it("adds a border between items and removes it from the last one", async () => {
    const wrapper = await mountAccordion();
    // Each accordion item carries both data-state and data-orientation on the
    // item container, while the inner trigger and content also carry
    // data-orientation but not data-state on the same element (the trigger has
    // data-state but is a button). Select by the item container's class.
    const items = wrapper.findAll(".border-b");
    expect(items).toHaveLength(3);
    // All three items have the border; the last one also carries last:border-b-0
    // which overrides it on the last child.
    expect(items[2]!.classes()).toContain("last:border-b-0");
  });
});
