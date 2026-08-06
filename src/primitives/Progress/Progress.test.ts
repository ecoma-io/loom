import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Progress from "./Progress.vue";

describe("Progress", () => {
  it("derives the indicator's percentage from modelValue/max and drives the translateX transform", () => {
    const wrapper = mount(Progress, { props: { modelValue: 40, max: 100, ariaLabel: "Upload" } });
    expect((wrapper.vm as unknown as { pct: number | null }).pct).toBe(40);

    const indicator = wrapper.get('[role="progressbar"] > *');
    expect(indicator.attributes("style")).toContain("translateX(-60%)");
  });

  // Both clamp cases assert `pct` — an exposed internal — and the transform it
  // drives. Neither looked at `aria-valuenow`, which is the same number as the
  // user hears it, and which was NOT clamped: measured, `modelValue: 150`
  // announced "150" against an `aria-valuemax` of 100 while painting the bar
  // at 100%, and `-20` announced "-20". A bar whose spoken value contradicts
  // its own declared range is what a sighted-only assertion cannot see.
  it("clamps a modelValue above max in both the painted bar and the announced value", () => {
    const wrapper = mount(Progress, { props: { modelValue: 150, max: 100, ariaLabel: "Upload" } });
    expect((wrapper.vm as unknown as { pct: number | null }).pct).toBe(100);

    const bar = wrapper.get('[role="progressbar"]');
    expect(bar.attributes("aria-valuenow")).toBe("100");
    expect(bar.attributes("aria-valuemax")).toBe("100");
    expect(wrapper.get('[role="progressbar"] > *').attributes("style")).toContain(
      "translateX(-0%)",
    );
  });

  it("clamps a negative modelValue to zero in both the painted bar and the announced value", () => {
    const wrapper = mount(Progress, { props: { modelValue: -20, max: 100, ariaLabel: "Upload" } });
    expect((wrapper.vm as unknown as { pct: number | null }).pct).toBe(0);

    const bar = wrapper.get('[role="progressbar"]');
    expect(bar.attributes("aria-valuenow")).toBe("0");
    expect(bar.attributes("aria-valuemin")).toBe("0");
  });

  it("exposes a null percentage while indeterminate (modelValue null/undefined)", () => {
    const wrapper = mount(Progress, { props: { ariaLabel: "Loading" } });
    expect((wrapper.vm as unknown as { pct: number | null }).pct).toBeNull();
  });

  it("turns the fill success only at 100% — a finished bar reads done, an in-flight one stays warp", async () => {
    const wrapper = mount(Progress, { props: { modelValue: 99, max: 100, ariaLabel: "Upload" } });
    const indicator = wrapper.get('[role="progressbar"] > *');
    expect(indicator.classes()).not.toContain("bg-success");

    await wrapper.setProps({ modelValue: 100 });
    expect(indicator.classes()).toContain("bg-success");
  });

  describe("Progress ARIA branches", () => {
    it("reports aria-valuenow while determinate — a screen reader can announce the percentage", () => {
      const wrapper = mount(Progress, { props: { modelValue: 40, max: 100, ariaLabel: "Upload" } });
      expect(wrapper.get('[role="progressbar"]').attributes("aria-valuenow")).toBe("40");
    });

    it("omits aria-valuenow while indeterminate — nothing to announce yet, not a false zero", () => {
      const wrapper = mount(Progress, { props: { ariaLabel: "Loading" } });
      expect(wrapper.get('[role="progressbar"]').attributes("aria-valuenow")).toBeUndefined();
    });

    // Every case above supplies `ariaLabel` and none of them looks at where it
    // lands — measured: deleting the binding from the template left this whole
    // file green. A progressbar has no text of its own, so the name a host
    // passes is the only name it will ever have, and the failure is an
    // unlabelled bar announced as "progress bar" with nothing else.
    it("carries the name a host supplies onto the bar itself, by value or by reference", () => {
      const named = mount(Progress, { props: { modelValue: 40, ariaLabel: "Upload" } });
      expect(named.get('[role="progressbar"]').attributes("aria-label")).toBe("Upload");

      const referenced = mount(Progress, {
        props: { modelValue: 40, ariaLabelledby: "upload-heading" },
      });
      const bar = referenced.get('[role="progressbar"]');
      expect(bar.attributes("aria-labelledby")).toBe("upload-heading");
      expect(bar.attributes("aria-label")).toBeUndefined();
    });
  });
});
