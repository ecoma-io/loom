import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import Popover from "../src/Popover.vue";

// jsdom ships no ResizeObserver, and Reka's popper measures the panel and its
// arrow with one even while closed. Stubbing the browser API is the honest fix:
// mocking Reka instead would leave these tests asserting on nothing but this
// component's own template.
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

let mounted: VueWrapper | undefined;

/** The trigger is rendered `as-child`, so the caller's own button IS the trigger. */
const TRIGGER = '<button type="button">Filters</button>';

async function mountPopover(props: Record<string, unknown> = {}) {
  mounted = mount(Popover, {
    props,
    slots: { trigger: TRIGGER, default: "<p>Panel body</p>" },
    attachTo: document.body,
  });
  await nextTick();
  await nextTick();
  return mounted;
}

/** The panel is portalled out of the wrapper — query the document, never the wrapper. */
const panel = () => document.querySelector<HTMLElement>('[role="dialog"]');

/** Let Reka's focus and dismiss machinery settle after an open or a close. */
async function settle() {
  for (let i = 0; i < 3; i++) await nextTick();
}

afterEach(() => {
  mounted?.unmount();
  mounted = undefined;
  document.body.innerHTML = "";
});

describe("Popover", () => {
  it("keeps the panel unmounted while closed, so secondary content is opt-in rather than always in the page", async () => {
    await mountPopover();
    expect(panel()).toBeNull();
    expect(document.body.textContent).not.toContain("Panel body");
  });

  it("opens on a trigger click and portals the panel out of the caller's tree, past any clipping ancestor", async () => {
    const wrapper = await mountPopover();
    await wrapper.get("button").trigger("click");
    await nextTick();
    expect(panel()!.textContent).toContain("Panel body");
    expect((wrapper.element as HTMLElement).contains(panel())).toBe(false);
  });

  it("wires the trigger's expanded state so assistive tech knows the panel is open, and reports the change upward", async () => {
    const wrapper = await mountPopover();
    const trigger = wrapper.get("button");
    expect(trigger.attributes("aria-expanded")).toBe("false");

    await trigger.trigger("click");
    await nextTick();
    expect(trigger.attributes("aria-expanded")).toBe("true");
    expect(trigger.attributes("aria-controls")).toBe(panel()!.id);
    expect(wrapper.emitted("update:open")).toEqual([[true]]);
  });

  it("renders the caller's own element as the trigger — no wrapper element swallows its accessible name", async () => {
    const wrapper = await mountPopover();
    expect(document.querySelectorAll("button")).toHaveLength(1);
    expect(wrapper.get("button").attributes("data-state")).toBe("closed");
  });

  it("places the panel below the trigger by default, the side a filter or details card is expected on", async () => {
    await mountPopover({ open: true });
    expect(panel()!.getAttribute("data-side")).toBe("bottom");
  });

  it("honours an explicit side so a panel near the viewport edge can be anchored deliberately", async () => {
    await mountPopover({ open: true, side: "right" });
    expect(panel()!.getAttribute("data-side")).toBe("right");
  });

  it("centres the panel on the trigger by default and honours an explicit alignment", async () => {
    await mountPopover({ open: true });
    expect(panel()!.getAttribute("data-align")).toBe("center");
    mounted!.unmount();
    document.body.innerHTML = "";

    await mountPopover({ open: true, align: "start" });
    expect(panel()!.getAttribute("data-align")).toBe("start");
  });

  it("shows the pointer notch by default and drops it when the panel reads better flush", async () => {
    await mountPopover({ open: true });
    expect(panel()!.querySelector("svg")).not.toBeNull();
    mounted!.unmount();
    document.body.innerHTML = "";

    await mountPopover({ open: true, arrow: false });
    expect(panel()!.querySelector("svg")).toBeNull();
  });

  it("moves focus onto the first control inside the panel on open, so the keyboard lands where the new content is", async () => {
    mounted = mount(Popover, {
      slots: { trigger: TRIGGER, default: '<button type="button" id="apply">Apply</button>' },
      attachTo: document.body,
    });
    await nextTick();
    await mounted.get("button").trigger("click");
    await settle();
    expect(document.activeElement).toBe(document.getElementById("apply"));
  });

  it("closes on Escape and hands focus back to the trigger, so the keyboard never ends up nowhere", async () => {
    const wrapper = await mountPopover();
    const trigger = wrapper.get("button").element;
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await settle();
    expect(panel()).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("leaves the page behind scrollable — a popover is secondary content, not a modal that locks the document", async () => {
    const wrapper = await mountPopover();
    await wrapper.get("button").trigger("click");
    await settle();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
