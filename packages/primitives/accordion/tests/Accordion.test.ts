import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import Accordion, { type AccordionItem } from "../src/Accordion.vue";

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
    // Attached, not detached: Reka's roving focus only works for a tree that
    // is actually in the document (the same reason Drawer.test.ts attaches).
    attachTo: document.body,
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

function triggers(wrapper: VueWrapper) {
  return wrapper.findAll<HTMLButtonElement>("button[aria-expanded]");
}

function regions(wrapper: VueWrapper) {
  return wrapper.findAll("[role='region']");
}

describe("Accordion", () => {
  // The gap scale is a public contract of the `gap` prop — the one styling
  // pin this file keeps, because a consumer picking sm/md/lg is choosing
  // these values, and Drawer-style justification applies: it pins the
  // mapping, not an implementation detail.
  it("applies the documented gap step per size, tightening below sm", async () => {
    const sm = await mountAccordion({ gap: "sm" });
    expect(sm.find("div").classes()).toContain("gap-1");
    expect(sm.find("div").classes()).toContain("sm:gap-2");

    const md = await mountAccordion({ gap: "md" });
    expect(md.find("div").classes()).toContain("gap-2");
    expect(md.find("div").classes()).toContain("sm:gap-3");

    const lg = await mountAccordion({ gap: "lg" });
    expect(lg.find("div").classes()).toContain("gap-3");
    expect(lg.find("div").classes()).toContain("sm:gap-4");
  });

  it("renders one named trigger per item", async () => {
    const wrapper = await mountAccordion();
    expect(triggers(wrapper).map((t) => t.text().trim())).toEqual([
      "First section",
      "Second section",
      "Third section",
    ]);
  });

  it("hands each panel its item through the scoped slot", async () => {
    const wrapper = await mountAccordion({ modelValue: "section-1" });
    expect(regions(wrapper)[0]!.text()).toContain("First section content");
  });

  it("opens on click and reports the value to the host", async () => {
    const wrapper = await mountAccordion();
    await triggers(wrapper)[0]!.trigger("click");

    expect(triggers(wrapper)[0]!.attributes("aria-expanded")).toBe("true");
    expect(wrapper.emitted("update:modelValue")).toEqual([["section-1"]]);
  });

  it("single mode collapses the previously open section, so exactly one shows at a time", async () => {
    const wrapper = await mountAccordion();
    await triggers(wrapper)[0]!.trigger("click");
    await triggers(wrapper)[1]!.trigger("click");

    expect(triggers(wrapper)[0]!.attributes("aria-expanded")).toBe("false");
    expect(triggers(wrapper)[1]!.attributes("aria-expanded")).toBe("true");
    expect(wrapper.emitted("update:modelValue")).toEqual([["section-1"], ["section-2"]]);
  });

  it("multiple mode lets sections stand open together and reports the whole set", async () => {
    const wrapper = await mountAccordion({ type: "multiple" });
    await triggers(wrapper)[0]!.trigger("click");
    await triggers(wrapper)[1]!.trigger("click");

    expect(triggers(wrapper)[0]!.attributes("aria-expanded")).toBe("true");
    expect(triggers(wrapper)[1]!.attributes("aria-expanded")).toBe("true");
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([["section-1", "section-2"]]);
  });

  it("collapsible single mode closes the open section again; a non-collapsible one never drops to zero", async () => {
    const closable = await mountAccordion();
    await triggers(closable)[0]!.trigger("click");
    expect(triggers(closable)[0]!.attributes("aria-expanded")).toBe("true");
    await triggers(closable)[0]!.trigger("click");
    expect(triggers(closable)[0]!.attributes("aria-expanded")).toBe("false");

    const sealed = await mountAccordion({ collapsible: false });
    await triggers(sealed)[0]!.trigger("click");
    expect(triggers(sealed)[0]!.attributes("aria-expanded")).toBe("true");
    await triggers(sealed)[0]!.trigger("click");
    // The open section stays put — exactly one panel showing is the contract,
    // and the refused close emits nothing for the host to act on.
    expect(triggers(sealed)[0]!.attributes("aria-expanded")).toBe("true");
    expect(sealed.emitted("update:modelValue")).toEqual([["section-1"]]);
  });

  it("follows the host's modelValue in both directions", async () => {
    const wrapper = await mountAccordion();
    expect(triggers(wrapper)[1]!.attributes("aria-expanded")).toBe("false");

    await wrapper.setProps({ modelValue: "section-2" });
    expect(triggers(wrapper)[1]!.attributes("aria-expanded")).toBe("true");
  });

  it("moves focus between triggers with the arrow keys — the list is one Tab stop with roving focus", async () => {
    const wrapper = await mountAccordion();
    const [first, second] = triggers(wrapper);
    first!.element.focus();
    await first!.trigger("keydown", { key: "ArrowDown" });

    expect(document.activeElement).toBe(second!.element);

    await second!.trigger("keydown", { key: "ArrowUp" });
    expect(document.activeElement).toBe(first!.element);
  });

  it("skips a disabled trigger during arrow-key navigation instead of parking focus there", async () => {
    const wrapper = await mountAccordion();
    const [, second] = triggers(wrapper);
    second!.element.focus();
    // The next trigger down is the disabled third; roving focus wraps past it.
    await second!.trigger("keydown", { key: "ArrowDown" });

    expect(document.activeElement).toBe(triggers(wrapper)[0]!.element);
  });

  it("announces a disabled item and refuses to toggle it", async () => {
    const wrapper = await mountAccordion();
    const disabled = triggers(wrapper)[2]!;

    expect(disabled.attributes("aria-disabled")).toBe("true");
    await disabled.trigger("click");
    expect(disabled.attributes("aria-expanded")).toBe("false");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("conceals a closed panel from the accessibility tree, not merely paints it away", async () => {
    const wrapper = await mountAccordion();
    await triggers(wrapper)[0]!.trigger("click");
    const [open, closed] = regions(wrapper);

    // The `hidden` attribute is what removes a region from the tree; a panel
    // that were merely visually collapsed would still be read aloud.
    expect(open!.attributes("hidden")).toBeUndefined();
    expect(closed!.attributes("hidden")).toBeDefined();

    await triggers(wrapper)[0]!.trigger("click");
    // Collapsing the only open section conceals it too — nothing lingers
    // invisibly mounted, which is the failure the state-scoped animation
    // classes in the component exist to prevent.
    expect(regions(wrapper).every((r) => r.attributes("hidden") !== undefined)).toBe(true);
  });

  it("drives the chevron rotation from the same data-state a reader's tools see", async () => {
    // One line of styling pinned on purpose: the chevron is the sole
    // open/closed affordance inside the trigger, and keying it on the
    // attribute (rather than local JS state) is the guarantee it can never
    // disagree with what assistive tech announces.
    const wrapper = await mountAccordion({ modelValue: "section-1" });
    const openTrigger = triggers(wrapper)[0]!;
    expect(openTrigger.attributes("data-state")).toBe("open");
    const chevron = openTrigger.find("svg");
    expect(chevron.classes()).toContain("data-[state=open]:rotate-180");
  });
});
