import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import Toast from "./Toast.vue";

// Integration tier, deliberately: every case here proves the rendered card —
// its description line, variant accent, action button, close button,
// auto-dismiss, and the region/viewport structure Reka teleports it into.
// Mocking `ToastItem` would remove exactly that content and leave these
// assertions pinning nothing; `Toast.test.ts` covers what `Toast.vue` itself
// decides (bundling, prop forwarding) against a mocked `ToastItem`.

let mounted: VueWrapper | undefined;

/** Mount attached to the DOM (Reka teleports the card into the bundled viewport) and let the teleport settle. */
async function mountToast(props: Record<string, unknown> = {}) {
  mounted = mount(Toast, {
    props: { open: true, title: "Saved", ...props },
    attachTo: document.body,
  });
  await nextTick();
  await nextTick();
  return mounted;
}

/** The viewport Reka renders the card into — queried off the document, never the wrapper. */
const viewport = () => document.querySelector("ol")!;

/**
 * The description line, by its own paint — Reka renders it as a plain `div`, so
 * the element itself is what proves absence: whitespace-only text content is
 * condensed away, which would let an empty second line pass a text assertion.
 */
const description = () => viewport().querySelector(".text-xs.text-muted-foreground");

afterEach(() => {
  mounted?.unmount();
  mounted = undefined;
  document.body.innerHTML = "";
});

describe("Toast", () => {
  it("ships its own provider and viewport so a lone toast works standalone, with the card rendered into that viewport", async () => {
    await mountToast();
    expect(document.querySelectorAll("ol")).toHaveLength(1);
    expect(viewport().textContent).toContain("Saved");
  });

  it("hosts the card inside the labelled notifications region so assistive tech can reach it, instead of dropping loose text into the page", async () => {
    await mountToast();
    const region = document.querySelector<HTMLElement>('[role="region"]')!;
    expect(region.getAttribute("aria-label")).toBeTruthy();
    expect(region.contains(viewport())).toBe(true);
    expect(viewport().querySelector("li")!.getAttribute("data-state")).toBe("open");
  });

  it("renders the description only when one is given, so a bare title toast carries no empty second line", async () => {
    await mountToast();
    expect(description()).toBeNull();
    expect(viewport().textContent).toBe("Saved");
    mounted!.unmount();
    document.body.innerHTML = "";

    await mountToast({ description: "Draft written to disk." });
    expect(description()?.textContent.trim()).toBe("Draft written to disk.");
  });

  it("picks the variant's accent — the ai variant adds the conduct pulse the plain variants must not carry", async () => {
    await mountToast({ variant: "info" });
    expect(viewport().querySelector(".animate-conduct")).toBeNull();
    mounted!.unmount();
    document.body.innerHTML = "";

    await mountToast({ variant: "ai" });
    expect(viewport().querySelector(".animate-conduct")).not.toBeNull();
  });

  it("renders the inline action only when a label is supplied and reports the press instead of acting", async () => {
    await mountToast();
    expect(viewport().textContent).not.toContain("Undo");
    mounted!.unmount();
    document.body.innerHTML = "";

    const wrapper = await mountToast({ actionLabel: "Undo" });
    const action = [...viewport().querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "Undo",
    )!;
    action.click();
    await nextTick();
    expect(wrapper.emitted("action")).toEqual([[]]);
  });

  it("funnels a manual close through update:open — the host owns when a toast is open, this primitive only renders one", async () => {
    const wrapper = await mountToast();
    document.querySelector<HTMLButtonElement>("[aria-label='Close']")!.click();
    await nextTick();
    expect(wrapper.emitted("update:open")).toEqual([[false]]);
  });

  it("drops the close affordance when closable is false, leaving auto-dismiss and swipe as the exits", async () => {
    await mountToast({ closable: false });
    expect(document.querySelector("[aria-label='Close']")).toBeNull();
  });

  it("self-dismisses once the duration elapses — a transient notification the user need not act on must not linger", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = await mountToast({ duration: 2000 });
      vi.advanceTimersByTime(1900);
      await nextTick();
      expect(wrapper.emitted("update:open")).toBeUndefined();

      vi.advanceTimersByTime(200);
      await nextTick();
      expect(wrapper.emitted("update:open")).toEqual([[false]]);
    } finally {
      vi.useRealTimers();
    }
  });

  // `mountToast` passes `open: true`, which is why every case above stayed
  // green while the plainest possible call rendered nothing: an `open` coerced
  // to `false` on its way down reads as "the host says closed" and Reka mounts
  // no card. This is the one case that mounts the component the way a first
  // reader of the docs would write it.
  it("shows the card with no open prop at all, so the shortest possible call still renders", async () => {
    mounted = mount(Toast, { props: { title: "Saved" }, attachTo: document.body });
    await nextTick();
    await nextTick();
    expect(viewport().textContent).toContain("Saved");
  });
});
