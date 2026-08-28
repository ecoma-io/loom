import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { provideLoomLabels, type LoomLabelOverrides } from "@ecoma-io/loom-labels";
import Meter, { METER_LABELS } from "../src/Meter.vue";

/** A host declaring an application-wide vocabulary above the control. */
function hostWith(vocabulary: () => LoomLabelOverrides) {
  return defineComponent({
    setup(_props, { slots }) {
      provideLoomLabels(vocabulary);
      return () => h("div", slots.default?.());
    },
  });
}

describe("Meter", () => {
  it("renders role=meter with the full value triple", () => {
    const wrapper = mount(Meter, { props: { value: 17, max: 40, ariaLabel: "Seats" } });
    const bar = wrapper.get('[role="meter"]');
    expect(bar.attributes("aria-valuenow")).toBe("17");
    expect(bar.attributes("aria-valuemin")).toBe("0");
    expect(bar.attributes("aria-valuemax")).toBe("40");
  });

  it("announces a localisable value text — '17 of 40' by default", () => {
    const wrapper = mount(Meter, { props: { value: 17, max: 40, ariaLabel: "Seats" } });
    expect(wrapper.get('[role="meter"]').attributes("aria-valuetext")).toBe("17 of 40");
  });

  it("clamps a value above max in both the painted fill and the announced number", () => {
    const wrapper = mount(Meter, { props: { value: 150, max: 100, ariaLabel: "Disk" } });
    const bar = wrapper.get('[role="meter"]');
    expect(bar.attributes("aria-valuenow")).toBe("100");
    expect(bar.attributes("aria-valuemax")).toBe("100");
  });

  it("clamps a negative value to min in the announced number", () => {
    const wrapper = mount(Meter, { props: { value: -20, ariaLabel: "Disk" } });
    expect(wrapper.get('[role="meter"]').attributes("aria-valuenow")).toBe("0");
  });

  it("drives the fill transform from the clamped value", () => {
    const wrapper = mount(Meter, { props: { value: 40, max: 100, ariaLabel: "Disk" } });
    const fill = wrapper.get('[role="meter"] > *');
    expect(fill.attributes("style")).toContain("translateX(-60%)");
  });

  it("updates every published fact when the measured value changes", async () => {
    const wrapper = mount(Meter, { props: { value: 10, max: 100, ariaLabel: "Disk" } });
    await wrapper.setProps({ value: 90 });
    const bar = wrapper.get('[role="meter"]');
    expect(bar.attributes("aria-valuenow")).toBe("90");
    expect(bar.attributes("aria-valuetext")).toBe("90 of 100");
    expect(wrapper.get('[role="meter"] > *').attributes("style")).toContain("translateX(-10%)");
  });

  describe("accessible name", () => {
    it("is mandatory — falls back to the labels seam when nothing is provided", () => {
      const wrapper = mount(Meter, { props: { value: 17 } });
      expect(wrapper.get('[role="meter"]').attributes("aria-label")).toBe("Meter");
    });

    it("wires a visible label through aria-labelledby and renders it", () => {
      const wrapper = mount(Meter, { props: { value: 17, label: "Seats used" } });
      const bar = wrapper.get('[role="meter"]');
      expect(bar.attributes("aria-label")).toBeUndefined();
      const labelledby = bar.attributes("aria-labelledby");
      expect(labelledby).toBeTruthy();
      expect(wrapper.get(`#${labelledby!}`).text()).toBe("Seats used");
    });

    it("prefers ariaLabel over the visible label for naming while still rendering the text", () => {
      const wrapper = mount(Meter, {
        props: { value: 17, label: "Seats used", ariaLabel: "Seat allocation" },
      });
      const bar = wrapper.get('[role="meter"]');
      expect(bar.attributes("aria-label")).toBe("Seat allocation");
      expect(bar.attributes("aria-labelledby")).toBeUndefined();
      expect(wrapper.text()).toContain("Seats used");
    });

    it("defers to ariaLabelledby above every other source", () => {
      const wrapper = mount(Meter, {
        props: { value: 17, label: "Seats used", ariaLabelledby: "external-heading" },
      });
      const bar = wrapper.get('[role="meter"]');
      expect(bar.attributes("aria-labelledby")).toBe("external-heading");
      expect(bar.attributes("aria-label")).toBeUndefined();
    });
  });

  describe("threshold bands — HTML meter semantics", () => {
    it("stays primary with no band cue while threshold is off", () => {
      const wrapper = mount(Meter, {
        props: { value: 90, low: 60, high: 85, optimum: 10, ariaLabel: "Disk" },
      });
      expect(wrapper.get('[role="meter"] > *').classes()).toContain("bg-primary");
      expect(wrapper.text()).not.toContain("Critical");
    });

    it("recolours to destructive when the value sits in the region farthest from a low optimum", () => {
      const wrapper = mount(Meter, {
        props: { value: 90, low: 60, high: 85, optimum: 10, threshold: true, ariaLabel: "Disk" },
      });
      expect(wrapper.get('[role="meter"] > *').classes()).toContain("bg-destructive");
    });

    it("recolours to success when the value sits in the optimum's own region", () => {
      const wrapper = mount(Meter, {
        props: { value: 20, low: 60, high: 85, optimum: 10, threshold: true, ariaLabel: "Disk" },
      });
      expect(wrapper.get('[role="meter"] > *').classes()).toContain("bg-success");
    });

    it("marks both extremes cautionary when the optimum sits in the middle region", () => {
      const below = mount(Meter, {
        props: {
          value: 10,
          low: 30,
          high: 70,
          optimum: 50,
          threshold: true,
          ariaLabel: "Humidity",
        },
      });
      const above = mount(Meter, {
        props: {
          value: 90,
          low: 30,
          high: 70,
          optimum: 50,
          threshold: true,
          ariaLabel: "Humidity",
        },
      });
      expect(below.get('[role="meter"] > *').classes()).toContain("bg-warning");
      expect(above.get('[role="meter"] > *').classes()).toContain("bg-warning");
    });

    it("flips which region is good when the optimum sits high — a high optimum rewards a high value", () => {
      const high = mount(Meter, {
        props: { value: 90, low: 30, high: 70, optimum: 95, threshold: true, ariaLabel: "Battery" },
      });
      expect(high.get('[role="meter"] > *').classes()).toContain("bg-success");
      const low = mount(Meter, {
        props: { value: 10, low: 30, high: 70, optimum: 95, threshold: true, ariaLabel: "Battery" },
      });
      expect(low.get('[role="meter"] > *').classes()).toContain("bg-destructive");
    });

    it("carries the band as a visible word plus icon, hidden from assistive tech", () => {
      const wrapper = mount(Meter, {
        props: { value: 90, low: 60, high: 85, optimum: 10, threshold: true, ariaLabel: "Disk" },
      });
      const cue = wrapper.get('[aria-hidden="true"]');
      expect(cue.text()).toContain("Critical");
      expect(cue.find("svg").exists()).toBe(true);
    });

    it("renders the optimal word when the value lands in the optimum's region", () => {
      const wrapper = mount(Meter, {
        props: { value: 20, low: 60, high: 85, optimum: 10, threshold: true, ariaLabel: "Disk" },
      });
      expect(wrapper.get('[aria-hidden="true"]').text()).toContain("Optimal");
    });

    it("treats an inverted low/high pair as unset instead of building regions from crossed bounds", () => {
      const wrapper = mount(Meter, {
        props: { value: 90, low: 85, high: 60, optimum: 10, threshold: true, ariaLabel: "Disk" },
      });
      // The regions collapse to the full range with a low optimum: everything optimal.
      expect(wrapper.get('[role="meter"] > *').classes()).toContain("bg-success");
    });

    it("clamps thresholds and the optimum into the range before regioning", () => {
      const wrapper = mount(Meter, {
        props: {
          value: 40,
          low: 200,
          optimum: -50,
          threshold: true,
          ariaLabel: "Disk",
        },
      });
      expect(wrapper.get('[role="meter"] > *').classes()).toContain("bg-success");
    });
  });

  describe("labels", () => {
    it("accepts a per-instance override of the value text", () => {
      const wrapper = mount(Meter, {
        props: {
          value: 17,
          max: 40,
          ariaLabel: "Seats",
          labels: { valueText: ({ value, max }) => `${String(value)} out of ${String(max)} seats` },
        },
      });
      expect(wrapper.get('[role="meter"]').attributes("aria-valuetext")).toBe("17 out of 40 seats");
    });

    it("reads band words through the host vocabulary when no per-instance override exists", () => {
      const wrapper = mount(
        hostWith(() => ({ meter: { critical: "Full" } })),
        {
          slots: {
            default: () => [
              h(Meter, {
                value: 90,
                low: 60,
                high: 85,
                optimum: 10,
                threshold: true,
                ariaLabel: "Disk",
              }),
            ],
          },
        },
      );
      expect(wrapper.get('[aria-hidden="true"]').text()).toContain("Full");
    });

    it("keeps the fallback name localisable through the host vocabulary", () => {
      const wrapper = mount(
        hostWith(() => ({ meter: { name: "Messung" } })),
        {
          slots: { default: () => [h(Meter, { value: 17 })] },
        },
      );
      expect(wrapper.get('[role="meter"]').attributes("aria-label")).toBe("Messung");
    });

    it("lets one instance correct the host vocabulary through its labels prop", () => {
      const wrapper = mount(
        hostWith(() => ({ meter: { name: "Messung" } })),
        {
          slots: {
            default: () => [h(Meter, { value: 17, labels: { name: "Messwert" } })],
          },
        },
      );
      expect(wrapper.get('[role="meter"]').attributes("aria-label")).toBe("Messwert");
    });
  });

  describe("size and readout", () => {
    it("applies the stroke scale to the track", () => {
      const sm = mount(Meter, { props: { value: 17, size: "sm", ariaLabel: "Disk" } });
      expect(sm.get('[role="meter"]').classes()).toContain("h-1");
      const lg = mount(Meter, { props: { value: 17, size: "lg", ariaLabel: "Disk" } });
      expect(lg.get('[role="meter"]').classes()).toContain("h-3");
    });

    it("prints the value text beside the track, hidden from assistive tech", () => {
      const wrapper = mount(Meter, {
        props: { value: 17, max: 40, showValue: true, ariaLabel: "Seats" },
      });
      expect(wrapper.get('[aria-hidden="true"]').text()).toBe("17 of 40");
      expect(wrapper.get('[role="meter"]').attributes("aria-valuetext")).toBe("17 of 40");
    });
  });

  it("exposes its defaults for hosts building a partial vocabulary", () => {
    expect(METER_LABELS.name).toBe("Meter");
    expect(METER_LABELS.valueText({ value: 17, min: 0, max: 40 })).toBe("17 of 40");
  });
});
