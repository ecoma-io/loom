import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { FOCUSABLE_SELECTOR } from "@ecoma-io/loom-core/testing";
import Surface from "../src/Surface.vue";

describe("Surface", () => {
  it("a static surface offers no click affordance — cursor and hover lift belong to interactive only", () => {
    const wrapper = mount(Surface, { slots: { default: "row" } });
    expect(wrapper.classes()).not.toContain("cursor-pointer");
  });

  it("interactive puts every clickable row/card in the one shared hover language instead of per-view hand-rolls", () => {
    const wrapper = mount(Surface, {
      props: { interactive: true },
      slots: { default: "row" },
    });
    const classes = wrapper.classes();
    expect(classes).toContain("cursor-pointer");
    expect(classes.some((c) => c.startsWith("hover:"))).toBe(true);
  });

  it("the default card reads built-not-floating: hairline on a white ground, never a drop shadow", () => {
    const wrapper = mount(Surface, { slots: { default: "card" } });
    const classes = wrapper.classes();
    expect(classes).toContain("border-border");
    expect(classes).not.toContain("shadow-md");
  });

  it("gives overlay alone a real shadow, since only a floating object needs one", () => {
    const overlay = mount(Surface, { props: { variant: "overlay" }, slots: { default: "menu" } });
    expect(overlay.classes()).toContain("shadow-md");

    const muted = mount(Surface, { props: { variant: "muted" }, slots: { default: "panel" } });
    expect(muted.classes()).not.toContain("shadow-md");
  });

  it("builds in the pad spacing so a caller never hand-picks the padding token", () => {
    expect(mount(Surface, { props: { pad: "none" } }).classes()).toContain("p-0");
    expect(mount(Surface, { props: { pad: "lg" } }).classes()).toContain("p-6");
    expect(mount(Surface).classes()).toContain("p-4"); // default
  });

  it("renders keyboard-inert: nothing inside takes focus or a key, and the root carries no tabindex", () => {
    // The interactive branch — its hover language is paint only; the host
    // owns the click, and the pin is the proof the surface renders nothing
    // operable even at its most clickable-looking.
    const wrapper = mount(Surface, {
      props: { variant: "overlay", interactive: true, pad: "lg" },
      slots: { default: "Session expired" },
    });
    // The sidecar claims visual-only — keyboard-inert is that class's whole
    // matrix row, and this is the pin of absence the row exists to carry.
    expect(wrapper.find(FOCUSABLE_SELECTOR).exists()).toBe(false);
    expect(wrapper.attributes("tabindex")).toBeUndefined();
  });
});
