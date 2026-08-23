import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import ScrollReel from "../src/ScrollReel.vue";
import { provideLoomLabels } from "@ecoma-io/loom-labels";

function reelOf(props: Record<string, unknown> = {}) {
  return mount(ScrollReel, {
    props,
    slots: { default: "<div>item</div>" },
  });
}

/**
 * A stand-in for the media queries jsdom answers with a flat `false`: the
 * reduced-motion query is the one whose answer decides how the reel scrolls,
 * so the tests need to be able to flip it. This jsdom ships no `matchMedia`
 * at all, so the stub is assigned rather than spied; the returned function
 * puts the original back.
 */
function stubMatchMedia(reducedMotion: boolean) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: reducedMotion && query.includes("prefers-reduced-motion"),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

/** Mounts a reel with its scrolling methods replaced by spies jsdom lacks. */
function reelWithScrollSpies(props: Record<string, unknown> = {}) {
  const wrapper = reelOf(props);
  // The template's comments make the component a fragment, so the wrapper's
  // own element is not the reel — the reel is the div found beneath it, and
  // it is that element the keydown listener sits on.
  const root = wrapper.get("div");
  const scrollTo = vi.fn();
  (root.element as HTMLElement).scrollTo = scrollTo;
  const firstItem = root.element.firstElementChild;
  if (firstItem instanceof HTMLElement) firstItem.scrollIntoView = vi.fn();
  return { root, scrollTo };
}

describe("ScrollReel", () => {
  it("lays its children out in a horizontal row that scrolls when content overflows", () => {
    const root = reelOf().get("div");
    expect(root.classes()).toContain("flex");
    expect(root.classes()).toContain("flex-row");
    expect(root.classes()).toContain("overflow-x-auto");
  });

  it("applies scroll-snap alignment by default", () => {
    const classes = reelOf().get("div").classes();
    expect(classes).toContain("snap-x");
    expect(classes).toContain("snap-mandatory");
    expect(classes).toContain("snap-start");
  });

  it("applies center snap alignment when snap is 'center'", () => {
    const classes = reelOf({ snap: "center" }).get("div").classes();
    expect(classes).toContain("snap-center");
  });

  it("removes snap classes when snap is 'none'", () => {
    const classes = reelOf({ snap: "none" }).get("div").classes();
    expect(classes).not.toContain("snap-x");
    expect(classes).not.toContain("snap-mandatory");
  });

  it("tightens the gutter one step below the sm breakpoint", () => {
    expect(reelOf({ gap: "lg" }).get("div").classes()).toEqual(
      expect.arrayContaining(["gap-4", "sm:gap-6"]),
    );
    expect(reelOf({ gap: "sm" }).get("div").classes()).toEqual(
      expect.arrayContaining(["gap-2", "sm:gap-3"]),
    );
  });

  it("defaults to the md gap step and start snap", () => {
    const classes = reelOf().get("div").classes();
    expect(classes).toEqual(expect.arrayContaining(["gap-3", "sm:gap-4"]));
    expect(classes).toContain("snap-start");
  });

  it("is keyboard-focusable so arrow keys can navigate between snap points", () => {
    expect(reelOf().get("div").attributes("tabindex")).toBe("0");
  });

  it("identifies itself as a scrollable region for assistive technology", () => {
    const root = reelOf().get("div");
    expect(root.attributes("role")).toBe("region");
    expect(root.attributes("aria-label")).toBe("Scrollable content");
  });

  it("renames the region through the labels prop", () => {
    const root = reelOf({ labels: { region: "Carrossel de destaques" } }).get("div");
    expect(root.attributes("aria-label")).toBe("Carrossel de destaques");
  });

  // Composition sits above the labels package in the layer direction, so a
  // host localising every Loom component through one `provideLoomLabels` bag
  // reaches this reel too. Pinning it here is what keeps the seam from ever
  // quietly growing a second shape.
  it("renames the region through the host vocabulary provided above it", () => {
    const Host = defineComponent({
      setup(_props, { slots }) {
        provideLoomLabels(() => ({ scrollReel: { region: "Carrossel global" } }));
        return () => h("div", slots.default?.());
      },
    });
    const wrapper = mount(Host, {
      slots: { default: h(ScrollReel, null, { default: () => h("div", "item") }) },
    });
    // The host wraps the reel in a div of its own, so target the reel itself.
    expect(wrapper.get('[role="region"]').attributes("aria-label")).toBe("Carrossel global");
  });

  it("scrolls smoothly by default", async () => {
    const restore = stubMatchMedia(false);
    try {
      const { root, scrollTo } = reelWithScrollSpies();
      await root.trigger("keydown", { key: "Home" });
      expect(scrollTo).toHaveBeenCalledWith({ left: 0, behavior: "smooth" });
    } finally {
      restore();
    }
  });

  it("collapses the scroll to an instant jump under prefers-reduced-motion", async () => {
    // The CSS kill-switch cannot stop these: an explicit "smooth" in the
    // scrollTo dictionary beats the stylesheet's scroll-behavior, so the
    // softening has to happen in the component.
    const restore = stubMatchMedia(true);
    try {
      const { root, scrollTo } = reelWithScrollSpies();
      await root.trigger("keydown", { key: "Home" });
      expect(scrollTo).toHaveBeenCalledWith({ left: 0, behavior: "auto" });
    } finally {
      restore();
    }
  });

  it("applies the same reduction to snap-aligned arrow navigation", async () => {
    const restore = stubMatchMedia(true);
    try {
      const { root } = reelWithScrollSpies();
      const item = root.element.firstElementChild;
      if (!(item instanceof HTMLElement)) throw new Error("expected a slotted item");
      item.scrollIntoView = vi.fn();
      await root.trigger("keydown", { key: "ArrowRight" });
      expect(item.scrollIntoView).toHaveBeenCalledWith(
        expect.objectContaining({ behavior: "auto" }),
      );
    } finally {
      restore();
    }
  });
});
