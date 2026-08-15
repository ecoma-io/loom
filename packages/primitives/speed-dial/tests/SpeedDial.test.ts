import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { Pencil, Share2 } from "@lucide/vue";
import SpeedDial, { type SpeedDialAction } from "../src/SpeedDial.vue";

// jsdom ships no ResizeObserver, and Reka's popper measures with one. Stubbing
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

const ACTIONS: SpeedDialAction[] = [
  { label: "Share", icon: Share2 },
  { label: "Rename", icon: Pencil },
  { label: "Archive", disabled: true },
];

let mounted: VueWrapper | undefined;

async function mountDial(props: Record<string, unknown> = {}) {
  mounted = mount(SpeedDial, {
    props: { actions: ACTIONS, label: "Create", open: true, ...props },
    attachTo: document.body,
  });
  await nextTick();
  await nextTick();
  return mounted;
}

/** The fan is portalled out of the wrapper — query the document, never the wrapper. */
const fan = () => document.querySelector<HTMLElement>('[role="menu"]');
const actions = () => [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];

/**
 * Let Reka's focus and dismiss machinery settle. The macrotask is not padding:
 * the close path hands focus back to the trigger from a `setTimeout`, so an
 * assertion made after ticks alone would read the state one turn too early.
 */
async function settle() {
  for (let i = 0; i < 4; i++) await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

function reset() {
  mounted?.unmount();
  mounted = undefined;
  document.body.innerHTML = "";
}

afterEach(reset);

describe("SpeedDial", () => {
  it("names the trigger from `label`, since its glyph is hidden from assistive technology", async () => {
    const wrapper = await mountDial({ open: undefined });
    const trigger = wrapper.get("button");
    expect(trigger.attributes("aria-label")).toBe("Create");
    expect(trigger.text()).toBe(""); // no text of its own to name it
    // Every glyph sits under the hidden wrapper, so `label` is the only name
    // in play and a second reading of "plus" cannot compete with it.
    const hidden = trigger.element.querySelector("[aria-hidden='true']");
    expect(trigger.element.querySelectorAll("svg")).toHaveLength(2);
    expect(hidden?.querySelectorAll("svg")).toHaveLength(2);
  });

  it("announces the trigger as the control that opens a menu, and tracks its expanded state", async () => {
    const wrapper = await mountDial({ open: undefined });
    const trigger = wrapper.get("button");
    expect(trigger.attributes("aria-haspopup")).toBe("menu");
    expect(trigger.attributes("aria-expanded")).toBe("false");

    trigger.element.click();
    await settle();
    expect(trigger.attributes("aria-expanded")).toBe("true");
    expect(trigger.attributes("aria-controls")).toBe(fan()!.id);
  });

  it("gives every action visible text rather than a title attribute, so an unlabelled circle is impossible", async () => {
    await mountDial();
    expect(actions().map((el) => el.textContent.trim())).toEqual(["Share", "Rename", "Archive"]);
    expect(actions().some((el) => el.hasAttribute("title"))).toBe(false);
  });

  it("renders an action's glyph as decoration beside its label, and omits it where none is given", async () => {
    await mountDial();
    expect(actions()[0]!.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
    expect(actions()[2]!.querySelector("svg")).toBeNull();
  });

  it("emits the chosen action with its index, so a host identifies it without matching on display text", async () => {
    const wrapper = await mountDial();
    actions()[1]!.click();
    await nextTick();
    expect(wrapper.emitted("select")).toEqual([[ACTIONS[1], 1]]);
  });

  it("selects on Enter as well as on click, because a fan of commands is a keyboard surface first", async () => {
    const wrapper = await mountDial();
    actions()[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await nextTick();
    expect(wrapper.emitted("select")).toEqual([[ACTIONS[0], 0]]);
  });

  it("keeps a disabled action inert — marked disabled for assistive tech, and selecting it emits nothing", async () => {
    const wrapper = await mountDial();
    const archive = actions()[2]!;
    expect(archive.getAttribute("aria-disabled")).toBe("true");
    archive.click();
    archive.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await nextTick();
    expect(wrapper.emitted("select")).toBeUndefined();
  });

  // The defect this pins. Each action is a floating label with no panel behind
  // it, so `data-[disabled]:opacity-50` faded the words against whatever page
  // showed through — 3.21:1. The pill drains to the neutral well instead and
  // the label lands on the measured muted colour, 4.67:1 over it.
  it("drains a disabled action's pill instead of fading the label on it", async () => {
    await mountDial();
    const archive = actions()[2]!;

    expect(archive.className).not.toContain("opacity");
    expect(archive.className).toContain("data-[disabled]:bg-muted");
    expect(archive.className).toContain("data-[disabled]:text-muted-foreground");
  });

  it("keeps the fan unmounted while closed, so a set of actions never sits in the DOM catching clicks", async () => {
    await mountDial({ open: false });
    expect(fan()).toBeNull();
  });

  it("reports open changes upward instead of closing itself, so the host can drive the fan", async () => {
    const wrapper = await mountDial({ open: undefined });
    wrapper.get("button").element.click();
    await nextTick();
    expect(wrapper.emitted("update:open")).toEqual([[true]]);
  });

  it("moves focus into the fan on open, so the arrow keys have somewhere to act", async () => {
    const wrapper = await mountDial({ open: undefined });
    wrapper.get("button").element.click();
    await settle();
    expect(fan()!.contains(document.activeElement)).toBe(true);
  });

  it("closes on Escape and hands focus back to the trigger, so the keyboard never ends up nowhere", async () => {
    const wrapper = await mountDial({ open: undefined });
    const trigger = wrapper.get("button").element;
    // Focused first, because "returns focus" means returns it to whatever held
    // it — jsdom fires no focus of its own on `.click()`, so a test that skipped
    // this would be asserting against `document.body`.
    trigger.focus();
    trigger.click();
    await settle();
    expect(fan()).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle();
    expect(fan()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("walks the actions with Arrow Down in a vertical fan, one Tab stop with roving focus", async () => {
    await mountDial({ direction: "up" });
    fan()!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await nextTick();
    expect(document.activeElement).toBe(actions()[0]);

    actions()[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await nextTick();
    expect(document.activeElement).toBe(actions()[1]);
  });

  it("walks a horizontal fan with Arrow Right and Arrow Left, the axis the reader can actually see", async () => {
    await mountDial({ direction: "right" });
    fan()!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await nextTick();
    expect(document.activeElement).toBe(actions()[0]);

    actions()[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await nextTick();
    expect(document.activeElement).toBe(actions()[1]);

    actions()[1]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    await nextTick();
    expect(document.activeElement).toBe(actions()[0]);
  });

  it("leaves the horizontal keys alone in a vertical fan, where Reka's own navigation already owns them", async () => {
    await mountDial({ direction: "up" });
    fan()!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await nextTick();
    const first = actions()[0]!;
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await nextTick();
    expect(document.activeElement).toBe(first);
  });

  it("announces the fan's orientation as the one it is laid out on, not Reka's hard-coded vertical", async () => {
    await mountDial({ direction: "right" });
    expect(fan()!.getAttribute("aria-orientation")).toBe("horizontal");
    reset();
    await mountDial({ direction: "down" });
    expect(fan()!.getAttribute("aria-orientation")).toBe("vertical");
  });

  it("stacks the fan along the axis its direction names", async () => {
    await mountDial({ direction: "left" });
    expect([...fan()!.classList]).toContain("flex-row");
    reset();
    await mountDial({ direction: "up" });
    expect([...fan()!.classList]).toContain("flex-col");
  });

  it("staggers the actions out one after another, capped so a long fan does not trail in indefinitely", async () => {
    await mountDial();
    expect(actions().map((el) => el.style.animationDelay)).toEqual(["0ms", "24ms", "48ms"]);
    expect(actions().every((el) => [...el.classList].includes("animate-scale-in"))).toBe(true);

    const many = Array.from({ length: 9 }, (_, i) => ({ label: `Action ${String(i)}` }));
    reset();
    await mountDial({ actions: many });
    expect(actions().at(-1)!.style.animationDelay).toBe("120ms"); // capped at index 5
  });

  it("pins itself to nothing and routes a caller's class onto the trigger, so placement stays the caller's", async () => {
    const wrapper = await mountDial({ open: undefined, class: "fixed bottom-6 right-6" });
    const trigger = wrapper.get("button").element;
    expect([...trigger.classList]).toEqual(
      expect.arrayContaining(["fixed", "bottom-6", "right-6"]),
    );
    expect([...trigger.classList]).toContain("rounded-full"); // the caller's class merges, it does not replace
  });

  it("lands other fallthrough attributes on the trigger too, since the root renders no element of its own", async () => {
    const wrapper = await mountDial({ open: undefined, "data-testid": "compose" });
    expect(wrapper.get("button").attributes("data-testid")).toBe("compose");
  });

  it("leaves the page scrollable while open — a viewport-pinned trigger cannot be allowed to shift", async () => {
    const wrapper = await mountDial({ open: undefined });
    wrapper.get("button").element.click();
    await settle();
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(document.body.style.paddingRight).toBe("");
  });
});
