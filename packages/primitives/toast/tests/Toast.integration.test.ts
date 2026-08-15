import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { provideLoomLabels, type LoomLabelOverrides } from "@ecoma-io/loom-labels";
import Toast from "../src/Toast.vue";

/** A host declaring an application-wide vocabulary above the toast. */
function hostWith(vocabulary: () => LoomLabelOverrides) {
  return defineComponent({
    setup(_props, { slots }) {
      provideLoomLabels(vocabulary);
      return () => h("div", slots.default?.());
    },
  });
}

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
    // The name itself, not merely that one is present: `toBeTruthy()` here
    // passed for any string at all, a literal "undefined" included. The hotkey
    // is the only way a keyboard user reaches a toast that has already been
    // announced, and it is announced with the region — a name that lost it is
    // a region nobody can get back to. Loom's own English is deliberately the
    // same words as Reka's default here; what makes it Loom's is that it is
    // replaceable, which `Toast labels` below is what proves.
    expect(region.getAttribute("aria-label")).toBe("Notifications (F8)");
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

  it("picks the variant's accent — the accent variant adds the border highlight the plain variants must not carry", async () => {
    await mountToast({ variant: "info" });
    expect(viewport().querySelector(".border-primary\\/40")).toBeNull();
    mounted!.unmount();
    document.body.innerHTML = "";

    await mountToast({ variant: "accent" });
    expect(viewport().querySelector(".border-primary\\/40")).not.toBeNull();
  });

  // The case above pins that the accent renders, not that it stays silent —
  // measured: deleting both `aria-hidden`s from ToastItem left this file green.
  // A toast is announced through a live region the moment it appears, so a
  // glyph or a pulse overlay that reaches the accessibility tree is read out
  // ahead of the message, on every toast the app shows.
  it("keeps the accent glyph out of the announcement, so only the message is read", async () => {
    await mountToast({ variant: "accent" });
    const card = viewport().querySelector("li")!;
    expect(card.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
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

describe("Toast labels", () => {
  /**
   * The hidden region Reka reads out ahead of the card's own text. It renders
   * two animation frames after the toast, deliberately, so that a screen
   * reader is handed the whole message at once rather than mid-assembly.
   */
  async function announcement(): Promise<string> {
    for (let i = 0; i < 4; i++) {
      await nextTick();
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          resolve(null);
        });
      });
    }
    return document.querySelector('[role="alert"]')!.textContent;
  }

  it("names the close control, the region and the announcement in English by default", async () => {
    await mountToast();
    expect(document.querySelector("[aria-label='Close']")).not.toBeNull();
    expect(document.querySelector('[role="region"]')!.getAttribute("aria-label")).toBe(
      "Notifications (F8)",
    );
  });

  it("replaces the word Reka reads out ahead of every toast, which no attribute on the card can reach", async () => {
    // `ToastProvider`'s `label` is prefixed to the announcement of every toast
    // in the application. Left unset it is "Notification", in English, spoken
    // from a hidden live region nothing else on the page can reach.
    await mountToast({ labels: { announce: "Thông báo" } });
    expect(await announcement()).toBe("Thông báo Saved");
  });

  it("hands the region label the hotkey raw, so a language decides where the key sits in the phrase", async () => {
    await mountToast({
      labels: { region: ({ hotkey }: { hotkey: string }) => `Thông báo — ${hotkey}` },
    });
    expect(document.querySelector('[role="region"]')!.getAttribute("aria-label")).toBe(
      "Thông báo — F8",
    );
  });

  it("takes its names from a host's vocabulary, and lets the instance's own prop beat it", async () => {
    mounted = mount(
      hostWith(() => ({ toast: { close: "Đóng", announce: "Thông báo" } })),
      {
        attachTo: document.body,
        slots: {
          default: () => h(Toast, { open: true, title: "Saved", labels: { close: "Bỏ qua" } }),
        },
      },
    );
    await nextTick();
    await nextTick();

    expect(document.querySelector("[aria-label='Bỏ qua']")).not.toBeNull();
    expect(document.querySelector("[aria-label='Close']")).toBeNull();
  });

  it("repaints its names when the host switches language under an open toast", async () => {
    const locale = ref("en");
    mounted = mount(
      hostWith(() =>
        locale.value === "en"
          ? {}
          : {
              toast: {
                close: "Đóng",
                region: ({ hotkey }: { hotkey: string }) => `Thông báo (${hotkey})`,
              },
            },
      ),
      {
        attachTo: document.body,
        slots: { default: () => h(Toast, { open: true, title: "Saved" }) },
      },
    );
    await nextTick();
    await nextTick();
    expect(document.querySelector("[aria-label='Close']")).not.toBeNull();

    // The assertion that fails the moment a label is resolved once in `setup`
    // rather than inside the render effect: every other test here still passes
    // and every language switch silently stops working. The region's name goes
    // through Reka's own `label` prop, so this pins the function handed to it
    // being re-read as well as the card's own binding.
    locale.value = "vi";
    await nextTick();
    await nextTick();
    expect(document.querySelector("[aria-label='Đóng']")).not.toBeNull();
    expect(document.querySelector('[role="region"]')!.getAttribute("aria-label")).toBe(
      "Thông báo (F8)",
    );
  });
});
