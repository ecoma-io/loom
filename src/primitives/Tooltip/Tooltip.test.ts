import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import Tooltip from "./Tooltip.vue";

// jsdom ships no ResizeObserver, and Reka measures the arrow with one. Stubbing
// the browser API is the honest fix: mocking Reka would leave these tests
// asserting on nothing but this component's own template.
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
const TRIGGER = '<button type="button" aria-label="Delete">X</button>';

async function mountTooltip(props: Record<string, unknown> = {}) {
  mounted = mount(Tooltip, {
    props: { content: "Delete permanently", ...props },
    slots: { trigger: TRIGGER },
    attachTo: document.body,
  });
  await nextTick();
  await nextTick();
  return mounted;
}

/**
 * The tip is portalled — query the document, never the mounted wrapper.
 *
 * Two nodes make up one tip and they are not interchangeable. `tip()` is the
 * node `role="tooltip"` sits on, which is what `aria-describedby` resolves to;
 * `panel()` is the visible surface carrying the placement and the styling.
 * Asserting placement on the first, or the accessible reference on the second,
 * quietly passes while measuring nothing.
 */
const tip = () => document.querySelector<HTMLElement>('[role="tooltip"]');
const panel = () =>
  document.querySelector<HTMLElement>("[data-reka-popper-content-wrapper] [data-side]");

/** Let Reka's presence and dismiss machinery settle, including its timer-driven parts. */
async function settle() {
  for (let i = 0; i < 4; i++) await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

afterEach(() => {
  mounted?.unmount();
  mounted = undefined;
  document.body.innerHTML = "";
});

describe("Tooltip", () => {
  it("keeps the tip out of the DOM until it is opened, so a hint never sits in the page as stray text", async () => {
    await mountTooltip();
    expect(tip()).toBeNull();
    expect(document.body.textContent).not.toContain("Delete permanently");
  });

  it("shows the content when opened and portals it out of the caller's tree, so no ancestor overflow can clip it", async () => {
    const wrapper = await mountTooltip({ open: true });
    expect(tip()).not.toBeNull();
    expect(tip()!.textContent).toContain("Delete permanently");
    expect((wrapper.element as HTMLElement).contains(tip())).toBe(false);
  });

  it("describes the trigger rather than naming it — a tip supplements an accessible name, it must never be the only source of one", async () => {
    await mountTooltip({ open: true });
    const trigger = document.querySelector<HTMLElement>("button[aria-label='Delete']")!;
    const describedBy = trigger.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(trigger.getAttribute("aria-labelledby")).toBeNull();
    expect(trigger.getAttribute("aria-label")).toBe("Delete"); // the caller's own name survives as-child

    // The reference has to resolve to something. A dangling `aria-describedby`
    // announces nothing, and is invisible to any test that only checks the
    // attribute is present.
    expect(document.getElementById(describedBy!)?.textContent).toContain("Delete permanently");
  });

  it("renders the caller's own element as the trigger instead of wrapping it, so no wrapper swallows its accessible name", async () => {
    const wrapper = await mountTooltip();
    const trigger = wrapper.get("button");
    expect(document.querySelectorAll("button")).toHaveLength(1); // no wrapper button was added
    expect(trigger.attributes("data-state")).toBe("closed"); // Reka's trigger props land on the caller's own element
    expect(trigger.attributes("aria-label")).toBe("Delete");
  });

  it("prefers the default slot over the content prop, so rich hint markup is not silently dropped", async () => {
    mounted = mount(Tooltip, {
      props: { content: "prop text", open: true },
      slots: { trigger: TRIGGER, default: "<em>slot text</em>" },
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();
    expect(tip()!.textContent).toContain("slot text");
    expect(tip()!.textContent).not.toContain("prop text");
  });

  it("opens on keyboard focus, so a hint reachable only by pointer is not the contract", async () => {
    const wrapper = await mountTooltip();
    await wrapper.get("button").trigger("focus");
    await nextTick();
    expect(wrapper.emitted("update:open")).toEqual([[true]]);
  });

  it("never takes focus — focus stays on the trigger the whole time the tip is shown", async () => {
    const wrapper = await mountTooltip();
    const trigger = wrapper.get("button").element;
    trigger.focus();
    await settle();
    expect(tip()).not.toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(panel()!.contains(document.activeElement)).toBe(false);
  });

  it("closes on Escape while the trigger keeps focus, so the keyboard is never left holding a hint it cannot dismiss", async () => {
    const wrapper = await mountTooltip();
    const trigger = wrapper.get("button").element;
    trigger.focus();
    await settle();
    expect(tip()).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle();
    expect(tip()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("leaves the page behind scrolling — a hint is not modal and blocks nothing", async () => {
    await mountTooltip({ open: true });
    await settle();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("anchors above the trigger by default, where a hint does not cover the row below it", async () => {
    await mountTooltip({ open: true });
    expect(panel()!.getAttribute("data-side")).toBe("top");

    mounted!.unmount();
    document.body.innerHTML = "";
    await mountTooltip({ open: true, side: "right" });
    expect(panel()!.getAttribute("data-side")).toBe("right");
  });
});
