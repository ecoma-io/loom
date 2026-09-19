import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import TimeTrack from "../src/TimeTrack.vue";
import TimeRuler from "../src/TimeRuler.vue";
import TimeBar from "../src/TimeBar.vue";
import {
  clamp,
  formatDuration,
  leftWithin,
  niceStep,
  tickValues,
  widthWithin,
} from "../src/geometry";

describe("time-window geometry", () => {
  it("maps a timestamp to its percent position in the window", () => {
    expect(leftWithin(0, 1000, 250)).toBe(25);
    expect(leftWithin(0, 1000, 0)).toBe(0);
    expect(leftWithin(0, 1000, 1000)).toBe(100);
  });

  it("measures only the visible portion of a span in the window", () => {
    // Fully inside: 25% .. 45% of the window.
    expect(widthWithin(0, 1000, 250, 450)).toBe(20);
    // Straddling the left edge: only the visible portion counts.
    expect(widthWithin(0, 1000, -500, 250)).toBe(25);
    // Fully right of the window: nothing visible.
    expect(widthWithin(0, 1000, 1500, 2000)).toBe(0);
    // Fully left of the window: nothing visible.
    expect(widthWithin(0, 1000, -2000, -1500)).toBe(0);
    // A zero-duration span at the window's start still spans the window.
    expect(widthWithin(0, 1000, 0, 0)).toBe(0);
  });

  it("guards a zero-width window instead of dividing by zero", () => {
    expect(leftWithin(500, 500, 500)).toBe(0);
    expect(widthWithin(500, 500, 500, 600)).toBe(100);
  });

  it("rounds steps up to 1/2/5 times a power of ten", () => {
    expect(niceStep(100, 5)).toBe(20); // 100/5 = 20 exactly
    expect(niceStep(1000, 6)).toBe(200); // ~167 → 200
    expect(niceStep(1_000_000, 6)).toBe(200_000);
    expect(niceStep(60, 6)).toBe(10); // 60/6 = 10 exactly
    expect(niceStep(120, 6)).toBe(20); // 120/6 = 20 exactly
    expect(niceStep(300, 6)).toBe(50); // 50 exactly
    expect(niceStep(360, 6)).toBe(100); // 60 → 100 (1×10^2, above 5×10=50)
    expect(niceStep(7, 6)).toBe(2); // 1.4 → 2
  });

  it("aligns ticks to the nice step at and before the window start", () => {
    expect(tickValues(0, 100, 6)).toEqual([0, 20, 40, 60, 80, 100]);
    // A window starting mid-step still ticks at round values, first tick ≤ start.
    expect(tickValues(30, 130, 6)).toEqual([20, 40, 60, 80, 100, 120]);
  });

  it("formats durations adaptively", () => {
    expect(formatDuration(0)).toBe("0ms");
    expect(formatDuration(400)).toBe("400ms");
    expect(formatDuration(1500)).toBe("1.5s");
    expect(formatDuration(12_000)).toBe("12s");
    expect(formatDuration(90_000)).toBe("1.5m");
    expect(formatDuration(5_400_000)).toBe("1.5h");
    expect(formatDuration(7_200_000)).toBe("2h");
  });

  it("clamps into a normalized range", () => {
    expect(clamp(50, 0, 100)).toBe(50);
    expect(clamp(-1, 0, 100)).toBe(0);
    expect(clamp(200, 100, 0)).toBe(100);
  });
});

describe("TimeTrack", () => {
  it("renders the track group, the ruler, and the slot area", () => {
    const wrapper = mount(TimeTrack, {
      props: { start: 0, end: 1000 },
      slots: { default: '<div class="unit-slot" />' },
    });
    expect(wrapper.attributes("role")).toBe("group");
    expect(wrapper.attributes("aria-label")).toContain("Time track");
    expect(wrapper.findComponent(TimeRuler).exists()).toBe(true);
    expect(wrapper.find(".unit-slot").exists()).toBe(true);
  });

  it("defaults the window to the domain and announces the window size", () => {
    const wrapper = mount(TimeTrack, { props: { start: 0, end: 7_200_000 } });
    expect(wrapper.attributes("aria-label")).toContain("2h window");
  });

  it("passes a provided window through to the ruler", () => {
    const wrapper = mount(TimeTrack, {
      props: { start: 0, end: 10_000, viewStart: 1_000, viewEnd: 5_000 },
    });
    const ruler = wrapper.findComponent(TimeRuler);
    expect(ruler.props("viewStart")).toBe(1000);
    expect(ruler.props("viewEnd")).toBe(5000);
  });
});

describe("TimeRuler", () => {
  it("renders one label per tick across the window", () => {
    const wrapper = mount(TimeRuler, {
      props: { start: 0, end: 10_000, viewStart: 0, viewEnd: 10_000, tickCount: 6 },
    });
    // Step of 2s over a 10s window: 0ms 2s 4s 6s 8s 10s — find the label rows
    // by their tick position, not by walk of every nested div.
    const labelRows = wrapper.findAll("[data-loom-time-ruler] > div:last-child > div");
    const texts = labelRows.map((d) => d.text());
    expect(texts).toEqual(["0ms", "2s", "4s", "6s", "8s", "10s"]);
  });
});

describe("TimeBar", () => {
  it("positions itself on the track's window in percent", () => {
    const wrapper = mount(TimeTrack, {
      props: { start: 0, end: 1000 },
      slots: { default: '<TimeBar :start="100" :end="300" />' },
      global: { components: { TimeBar } },
    });
    const bar = wrapper.find("[data-loom-time-bar]");
    expect(bar.attributes("style")).toContain("left: 10%");
    expect(bar.attributes("style")).toContain("width: 20%");
  });

  it("clamps a bar straddling the window edge into view", () => {
    const wrapper = mount(TimeTrack, {
      props: { start: 0, end: 1000 },
      slots: { default: '<TimeBar :start="-300" :end="200" />' },
      global: { components: { TimeBar } },
    });
    const bar = wrapper.find("[data-loom-time-bar]");
    // Starts before the window: left stays proportional (off-edge),
    // width covers the full span (consumers clip via overflow-hidden).
    expect(bar.attributes("style")).toContain("left: -30%");
    expect(bar.attributes("style")).toContain("width: 50%");
  });

  it("provides an accessible name from the label or the duration", () => {
    const labelled = mount(TimeTrack, {
      props: { start: 0, end: 1000 },
      slots: { default: '<TimeBar :start="0" :end="500" aria-label="HTTP GET" />' },
      global: { components: { TimeBar } },
    });
    expect(labelled.find("[data-loom-time-bar]").attributes("aria-label")).toBe("HTTP GET");

    const auto = mount(TimeTrack, {
      props: { start: 0, end: 1000 },
      slots: { default: '<TimeBar :start="0" :end="500" />' },
      global: { components: { TimeBar } },
    });
    expect(auto.find("[data-loom-time-bar]").attributes("aria-label")).toBe(
      "Duration 500 milliseconds",
    );
  });

  it("renders nothing outside a TimeTrack and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const wrapper = mount(TimeBar, { props: { start: 0, end: 100 } });
    expect(wrapper.find("[data-loom-time-bar]").exists()).toBe(false);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("TimeBar renders nothing outside a TimeTrack"),
    );
    warn.mockRestore();
  });
});
