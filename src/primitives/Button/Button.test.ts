import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Button from "./Button.vue";

describe("Button", () => {
  it("a loading button is disabled even when the disabled prop itself is false", () => {
    const wrapper = mount(Button, {
      props: { loading: true, disabled: false },
      slots: { default: "Save" },
    });
    const button = wrapper.get("button").element;
    expect(button.disabled).toBe(true);
  });

  it("is enabled by default, neither disabled nor loading", () => {
    const wrapper = mount(Button, { slots: { default: "Save" } });
    expect(wrapper.get("button").element.disabled).toBe(false);
  });

  it("announces the busy state and swaps which content layer assistive technology sees: idle exposes the label, loading exposes the loading text", async () => {
    const wrapper = mount(Button, {
      props: { loading: false, loadingText: "Saving…" },
      slots: { default: "Save" },
    });
    // The text node's own span is a leaf; the layer carrying aria-hidden is
    // its parent. Reaching for it this way rather than by class keeps the test
    // pinned to the accessibility contract instead of to the utility soup.
    const layerOf = (text: string) =>
      wrapper.findAll("span").find((s) => s.text() === text && s.element.children.length === 0)!
        .element.parentElement!;

    expect(wrapper.get("button").attributes("aria-busy")).toBeUndefined();
    expect(layerOf("Saving…").getAttribute("aria-hidden")).toBe("true");

    await wrapper.setProps({ loading: true });
    expect(wrapper.get("button").attributes("aria-busy")).toBe("true");
    expect(layerOf("Saving…").getAttribute("aria-hidden")).toBeNull();
    const label = wrapper.findAll("span").find((s) => s.text() === "Save")!;
    expect(label.attributes("aria-hidden")).toBe("true");
  });

  it("keeps both the label and the loading layer mounted across the swap, so the button never changes width mid-transition", async () => {
    const wrapper = mount(Button, {
      props: { loading: false, loadingText: "Saving…" },
      slots: { default: "Save" },
    });
    expect(wrapper.text()).toContain("Save");
    expect(wrapper.text()).toContain("Saving…");
    await wrapper.setProps({ loading: true });
    expect(wrapper.text()).toContain("Save");
    expect(wrapper.text()).toContain("Saving…");
  });

  it("renders the progress arc with no loading text when loadingText is omitted, and the label still reserves the width", () => {
    const wrapper = mount(Button, { props: { loading: true }, slots: { default: "Save" } });
    expect(wrapper.find("svg").exists()).toBe(true);
    expect(wrapper.text()).toBe("Save");
  });

  // The case above pins that the arc renders, not that it stays silent —
  // measured: deleting both `aria-hidden`s from the template left this file
  // green. `aria-busy` is what announces the state; a spinner or a shimmer
  // that also reaches the accessibility tree announces it a second time,
  // inside a control whose entire label is one word.
  it("keeps the spinner and the shimmer out of the accessibility tree, so aria-busy stays the only announcement", () => {
    const wrapper = mount(Button, { props: { loading: true }, slots: { default: "Save" } });
    expect(wrapper.get("button").attributes("aria-busy")).toBe("true");
    expect(wrapper.get("svg").attributes("aria-hidden")).toBe("true");
    expect(wrapper.get("span.animate-shimmer").attributes("aria-hidden")).toBe("true");
  });

  // Drained rather than dimmed, and the distinction is the point: `opacity`
  // takes the label down with the button, and a button is nothing but a label
  // on a fill. The treatment is keyed off the `disabled` prop rather than the
  // DOM disabled state, because a loading button is also DOM-disabled and has
  // to read as "working" rather than "unavailable".
  it("drains only a genuinely disabled button — a loading one keeps its fill so it reads as working, not unavailable", async () => {
    const wrapper = mount(Button, { props: { loading: true }, slots: { default: "Save" } });
    expect(wrapper.get("button").classes()).not.toContain("bg-muted");
    expect(wrapper.get("button").classes()).not.toContain("opacity-50");

    await wrapper.setProps({ loading: false, disabled: true });
    expect(wrapper.get("button").classes()).toEqual(
      expect.arrayContaining(["bg-muted", "text-muted-foreground", "border-border-strong"]),
    );
    // The regression this guards: the label has to stay readable, so nothing
    // may put an alpha over it again.
    expect(wrapper.get("button").classes()).not.toContain("opacity-50");
  });

  it("keeps every icon size square and at or above the 24px minimum target, so a dense row never shrinks the hit area below what a pointer can land on", () => {
    // Tailwind's h-N and w-N are N × 4 px. The assertion is that no icon size
    // drops under the WCAG 2.2 SC 2.5.8 floor and that every one stays square.
    const sizes = [
      { size: "icon", steps: 9 },
      { size: "icon-sm", steps: 8 },
    ] as const;
    for (const { size, steps } of sizes) {
      const classes = mount(Button, { props: { size }, slots: { default: "×" } }).classes();
      expect(classes).toContain(`h-${String(steps)}`);
      expect(classes).toContain(`w-${String(steps)}`);
      expect(steps * 4).toBeGreaterThanOrEqual(24);
    }
  });
});
