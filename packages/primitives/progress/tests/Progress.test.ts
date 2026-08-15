import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref, type PropType } from "vue";
import Progress from "../src/Progress.vue";
import { provideLoomLabels, type LoomLabelOverrides } from "@ecoma-io/loom-labels";

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

  it("turns the fill success only at 100% — a finished bar reads done, an in-flight one stays primary", async () => {
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

  describe("Progress size", () => {
    it("thickens the track per size, defaulting to the thickness callers had before the prop existed", () => {
      expect(mount(Progress, { props: { modelValue: 40 } }).classes()).toContain("h-2");
      expect(mount(Progress, { props: { modelValue: 40, size: "sm" } }).classes()).toContain("h-1");
      expect(mount(Progress, { props: { modelValue: 40, size: "lg" } }).classes()).toContain("h-3");
    });
  });

  describe("Progress showValue", () => {
    // `showValue` is the one addition that changes the component's box, so the
    // default has to be provably inert: the root a bare Progress renders is
    // still the progressbar itself, with no wrapper between it and the parent
    // that lays it out.
    it("renders the bare track as the root with no readout unless asked", () => {
      const wrapper = mount(Progress, { props: { modelValue: 40, ariaLabel: "Upload" } });
      expect(wrapper.attributes("role")).toBe("progressbar");
      expect(wrapper.text()).toBe("");
    });

    it("prints the rounded percentage beside the track when asked", () => {
      const wrapper = mount(Progress, {
        props: { modelValue: 33.7, max: 100, showValue: true, ariaLabel: "Upload" },
      });
      expect(wrapper.text()).toBe("34%");
      expect(wrapper.get('[role="progressbar"]').attributes("aria-valuenow")).toBe("33.7");
    });

    it("derives the readout from modelValue/max rather than from modelValue alone", () => {
      const wrapper = mount(Progress, {
        props: { modelValue: 3, max: 4, showValue: true, ariaLabel: "Steps" },
      });
      expect(wrapper.text()).toBe("75%");
    });

    // The bar announces its own value through aria-valuenow. A visible copy
    // that is not hidden is met again as loose text a moment later, so the
    // percentage is read out twice for every bar on the page.
    it("hides the visible readout from assistive tech, which already hears aria-valuenow", () => {
      const wrapper = mount(Progress, {
        props: { modelValue: 40, showValue: true, ariaLabel: "Upload" },
      });
      const readout = wrapper.get("span");
      expect(readout.attributes("aria-hidden")).toBe("true");
      expect(wrapper.get('[role="progressbar"]').attributes("aria-valuenow")).toBe("40");
    });

    // "We don't know yet" and "none of it is done" are different facts.
    // Printing 0% for the first one is the component lying about the only
    // number it exists to report.
    it("prints an em dash while indeterminate rather than a percentage it does not have", () => {
      const wrapper = mount(Progress, { props: { showValue: true, ariaLabel: "Loading" } });
      expect(wrapper.text()).toBe("—");
      expect(wrapper.text()).not.toContain("%");
      expect(wrapper.get('[role="progressbar"]').attributes("aria-valuenow")).toBeUndefined();
    });

    it("clamps the readout with the bar, so the printed number cannot exceed 100%", () => {
      const wrapper = mount(Progress, {
        props: { modelValue: 150, showValue: true, ariaLabel: "Upload" },
      });
      expect(wrapper.text()).toBe("100%");
    });
  });

  describe("Progress attribute routing", () => {
    it("merges a caller's class onto the track when the track is the whole component", () => {
      const wrapper = mount(Progress, {
        props: { modelValue: 40, ariaLabel: "Upload" },
        attrs: { class: "bg-primary-muted" },
      });
      const bar = wrapper.get('[role="progressbar"]');
      expect(bar.classes()).toContain("bg-primary-muted");
      // twMerge, not concatenation: the caller's fill replaces the track's own
      // rather than racing it in the stylesheet.
      expect(bar.classes()).not.toContain("bg-muted");
    });

    it("merges a caller's class onto the row once a readout shares the box with the track", () => {
      const wrapper = mount(Progress, {
        props: { modelValue: 40, showValue: true, ariaLabel: "Upload" },
        attrs: { class: "max-w-sm" },
      });
      expect(wrapper.classes()).toContain("max-w-sm");
      expect(wrapper.get('[role="progressbar"]').classes()).not.toContain("max-w-sm");
    });

    it("lands every other fallthrough attribute on the progressbar itself, readout or not", () => {
      const bare = mount(Progress, {
        props: { modelValue: 40, ariaLabel: "Upload" },
        attrs: { "aria-describedby": "upload-hint", "data-testid": "bar" },
      });
      expect(bare.get('[role="progressbar"]').attributes("aria-describedby")).toBe("upload-hint");
      expect(bare.get('[role="progressbar"]').attributes("data-testid")).toBe("bar");

      const withValue = mount(Progress, {
        props: { modelValue: 40, showValue: true, ariaLabel: "Upload" },
        attrs: { "aria-describedby": "upload-hint" },
      });
      expect(withValue.get('[role="progressbar"]').attributes("aria-describedby")).toBe(
        "upload-hint",
      );
    });
  });
});

/** A host declaring an application-wide vocabulary above the bar. */
const LabelHost = defineComponent({
  props: {
    vocabulary: {
      type: Function as PropType<() => LoomLabelOverrides>,
      required: true,
    },
  },
  setup(props, { slots }) {
    provideLoomLabels(() => props.vocabulary());
    return () => h("div", slots.default?.());
  },
});

describe("Progress labels", () => {
  it("writes the readout and the indeterminate placeholder from its own English by default", () => {
    const wrapper = mount(LabelHost, {
      props: { vocabulary: () => ({}) },
      slots: {
        default: () => [
          h(Progress, { modelValue: 33.7, showValue: true, ariaLabel: "Upload" }),
          h(Progress, { showValue: true, ariaLabel: "Loading" }),
        ],
      },
    });
    expect(wrapper.text()).toBe("34%—");
  });

  it("hands the value and the scale over raw, so the per-cent sign can lead the digits", () => {
    // Turkish writes the sign first — `%42` — which a `${Math.round(pct)}%`
    // template in the component has already ruled out for every host.
    const wrapper = mount(Progress, {
      props: {
        modelValue: 42,
        showValue: true,
        ariaLabel: "Upload",
        labels: {
          value: ({ value, max }: { value: number; max: number }) =>
            new Intl.NumberFormat("tr-TR", { style: "percent" }).format(value / max),
        },
      },
    });
    expect(wrapper.text()).toBe("%42");
  });

  it("hands over the clamped value rather than the raw prop, so the readout cannot exceed the bar", () => {
    const wrapper = mount(Progress, {
      props: {
        modelValue: 150,
        showValue: true,
        ariaLabel: "Upload",
        labels: { value: ({ value }: { value: number }) => String(value) },
      },
    });
    expect(wrapper.text()).toBe("100");
  });

  it("takes its readout from a host's vocabulary, and lets one instance correct it", () => {
    const wrapper = mount(LabelHost, {
      props: {
        vocabulary: () => ({ progress: { value: ({ value }) => `${String(value)} phần trăm` } }),
      },
      slots: {
        default: () => [
          h(Progress, { modelValue: 40, showValue: true, ariaLabel: "Upload" }),
          // The per-instance case: a bar counting steps, which a percentage is
          // simply the wrong reading of however well the application is
          // translated.
          h(Progress, {
            modelValue: 3,
            max: 4,
            showValue: true,
            ariaLabel: "Steps",
            labels: {
              value: ({ value, max }: { value: number; max: number }) =>
                `${String(value)}/${String(max)}`,
            },
          }),
        ],
      },
    });
    expect(wrapper.text()).toBe("40 phần trăm3/4");
  });

  it("repaints the readout when the host switches language under it", async () => {
    const locale = ref("en");
    const wrapper = mount(LabelHost, {
      props: {
        vocabulary: () =>
          locale.value === "en" ? {} : { progress: { indeterminate: "đang chờ" } },
      },
      slots: { default: () => h(Progress, { showValue: true, ariaLabel: "Loading" }) },
    });
    expect(wrapper.text()).toBe("—");

    locale.value = "vi";
    await nextTick();

    // The assertion that fails the moment a label is read once in `setup`
    // instead of through `text.` inside the render.
    expect(wrapper.text()).toBe("đang chờ");
  });
});
