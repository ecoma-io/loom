import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref, type PropType } from "vue";
import Indicator, { type IndicatorPlacement, type IndicatorStatus } from "../src/Indicator.vue";
import { provideLoomLabels, type LoomLabelOverrides } from "@ecoma-io/loom-labels";

/** The marker itself — the only node carrying `data-placement`. */
const MARKER = "[data-placement]";

describe("Indicator", () => {
  it("names a presence dot for a screen reader, so the state is never carried by colour alone", () => {
    const named: readonly (readonly [IndicatorStatus, string])[] = [
      ["online", "Online"],
      ["offline", "Offline"],
      ["busy", "Busy"],
      ["away", "Away"],
    ];
    for (const [status, expected] of named) {
      const wrapper = mount(Indicator, { props: { status } });
      expect(wrapper.get(".sr-only").text()).toBe(expected);
    }
  });

  it("names a statusless dot too, so no rendered marker is ever silent", () => {
    const wrapper = mount(Indicator);
    expect(wrapper.get(".sr-only").text()).toBe("Needs attention");
  });

  it("falls back to the derived name when `label` is blank, so an indicator cannot be left unnamed by accident", () => {
    for (const label of ["", "   "]) {
      const wrapper = mount(Indicator, { props: { status: "online", label } });
      expect(wrapper.get(".sr-only").text()).toBe("Online");
    }
  });

  it("prefers an explicit `label`, because a count is not always of unread things", () => {
    const wrapper = mount(Indicator, {
      props: { variant: "count", count: 4, label: "4 runs waiting for review" },
    });
    expect(wrapper.get(".sr-only").text()).toBe("4 runs waiting for review");
    expect(wrapper.text()).toContain("4");
  });

  it("announces the true count while the pill prints the clamped one", () => {
    const wrapper = mount(Indicator, { props: { variant: "count", count: 132, max: 99 } });
    expect(wrapper.get(MARKER).text()).toContain("99+");
    expect(wrapper.get(".sr-only").text()).toBe("132 unread");
  });

  it("hides the printed number from assistive tech, so the figure is announced once rather than twice", () => {
    const wrapper = mount(Indicator, { props: { variant: "count", count: 3 } });
    const printed = wrapper
      .get(MARKER)
      .findAll("span")
      .find((s) => s.text() === "3");
    expect(printed?.attributes("aria-hidden")).toBe("true");
    expect(wrapper.get(".sr-only").text()).toBe("3 unread");
  });

  it("renders no marker at all for a count of zero — a count of nothing is not news", () => {
    const wrapper = mount(Indicator, {
      props: { variant: "count", count: 0 },
      slots: { default: () => h("span", "bell") },
    });
    expect(wrapper.find(MARKER).exists()).toBe(false);
    expect(wrapper.find(".sr-only").exists()).toBe(false);
    expect(wrapper.text()).toBe("bell");
  });

  it("renders the zero pill when `showZero` asks for it", () => {
    const wrapper = mount(Indicator, { props: { variant: "count", count: 0, showZero: true } });
    expect(wrapper.get(MARKER).text()).toContain("0");
    expect(wrapper.get(".sr-only").text()).toBe("0 unread");
  });

  it("treats a negative count as nothing to report rather than painting the caller's bug over the child", () => {
    const wrapper = mount(Indicator, { props: { variant: "count", count: -3 } });
    expect(wrapper.find(MARKER).exists()).toBe(false);
  });

  it("exposes the hidden label's id to the slot, so an interactive child can describe itself with the count", () => {
    const wrapper = mount(Indicator, {
      props: { variant: "count", count: 3 },
      slots: {
        default: (slotProps: { labelId: string }) =>
          h("button", { "aria-describedby": slotProps.labelId }, "Notifications"),
      },
    });
    const describedby = wrapper.get("button").attributes("aria-describedby");
    expect(describedby).toBeTruthy();
    expect(wrapper.get(".sr-only").attributes("id")).toBe(describedby);
  });

  it("carries no live region of its own, leaving the decision to announce a change with the consumer", () => {
    const wrapper = mount(Indicator, { props: { variant: "count", count: 3 } });
    expect(wrapper.html()).not.toContain("aria-live");
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it("remounts the pill when the printed number changes, so the settle replays on real news", async () => {
    const wrapper = mount(Indicator, { props: { variant: "count", count: 3 } });
    const before = wrapper.get(MARKER).element;
    await wrapper.setProps({ count: 4 });
    expect(wrapper.get(MARKER).element).not.toBe(before);
  });

  it("leaves the pill in place when the clamped display is unchanged, so a poll behind `99+` animates nothing", async () => {
    const wrapper = mount(Indicator, { props: { variant: "count", count: 100, max: 99 } });
    const before = wrapper.get(MARKER).element;
    await wrapper.setProps({ count: 132 });
    expect(wrapper.get(MARKER).element).toBe(before);
    expect(wrapper.get(".sr-only").text()).toBe("132 unread");
  });

  it("settles a count in but never animates a dot, because presence arrives with the page rather than as news", () => {
    const count = mount(Indicator, { props: { variant: "count", count: 1 } });
    expect(count.get(MARKER).classes()).toContain("animate-scale-in");

    const dot = mount(Indicator, { props: { status: "online" } });
    expect(dot.get(MARKER).classes()).not.toContain("animate-scale-in");
  });

  it("lets `status` pick the colour, and an explicit `tone` override it", () => {
    const busy = mount(Indicator, { props: { status: "busy" } });
    expect(busy.get(MARKER).classes()).toContain("bg-destructive");

    const overridden = mount(Indicator, { props: { status: "busy", tone: "info" } });
    expect(overridden.get(MARKER).classes()).toContain("bg-info");
    expect(overridden.get(MARKER).classes()).not.toContain("bg-destructive");
  });

  it("wears the accent colour only where it is asked for, since it signals a second semantic category rather than decorating", () => {
    const accent = mount(Indicator, { props: { variant: "count", count: 2, tone: "accent" } });
    expect(accent.get(MARKER).classes()).toContain("bg-accent");

    const human = mount(Indicator, { props: { variant: "count", count: 2 } });
    expect(human.get(MARKER).classes()).not.toContain("bg-accent");
  });

  it("gives busy and away a shape of their own, so the three saturated statuses never differ by hue alone", () => {
    const shaped = ["busy", "away"] as const;
    for (const status of shaped) {
      const wrapper = mount(Indicator, { props: { status } });
      expect(wrapper.get(MARKER).findAll("span:not(.sr-only)")).toHaveLength(1);
    }
    for (const status of ["online", "offline"] as const) {
      const wrapper = mount(Indicator, { props: { status } });
      expect(wrapper.get(MARKER).findAll("span:not(.sr-only)")).toHaveLength(0);
    }
  });

  it("pins the marker to the corner it is given", () => {
    const corners: readonly (readonly [IndicatorPlacement, string])[] = [
      ["top-right", "top-0"],
      ["top-left", "top-0"],
      ["bottom-right", "bottom-0"],
      ["bottom-left", "bottom-0"],
    ];
    for (const [placement, edge] of corners) {
      const wrapper = mount(Indicator, { props: { status: "online", placement } });
      const marker = wrapper.get(MARKER);
      expect(marker.attributes("data-placement")).toBe(placement);
      expect(marker.classes()).toContain(edge);
    }
    expect(mount(Indicator).get(MARKER).attributes("data-placement")).toBe("top-right");
  });

  it("matches the separating ring to the surface it is told it sits on", () => {
    const onCard = mount(Indicator, { props: { status: "online", surface: "card" } });
    expect(onCard.get(MARKER).classes()).toContain("ring-card");

    const onPage = mount(Indicator, { props: { status: "online" } });
    expect(onPage.get(MARKER).classes()).toContain("ring-background");
  });

  it("keeps the marker out of the pointer's way, so the corner of the control it overhangs stays clickable", () => {
    const wrapper = mount(Indicator, { props: { variant: "count", count: 3 } });
    expect(wrapper.get(MARKER).classes()).toContain("pointer-events-none");
  });

  it("merges a consumer class over its own layout utility instead of appending beside it", () => {
    const wrapper = mount(Indicator, { attrs: { class: "block" } });
    expect(wrapper.classes()).toContain("block");
    expect(wrapper.classes()).not.toContain("inline-flex");
  });

  it("lands every other fallthrough attribute on the root it wraps the child in", () => {
    const wrapper = mount(Indicator, {
      attrs: { "data-testid": "bell-indicator" },
      slots: { default: () => h("span", "bell") },
    });
    expect(wrapper.attributes("data-testid")).toBe("bell-indicator");
  });
});

/** A host declaring an application-wide vocabulary above the marker. */
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

describe("Indicator labels", () => {
  it("derives every name it can utter from its own English by default", () => {
    const wrapper = mount(LabelHost, {
      props: { vocabulary: () => ({}) },
      slots: {
        default: () => [
          h(Indicator, { status: "busy" }),
          h(Indicator),
          h(Indicator, { variant: "count", count: 3 }),
        ],
      },
    });
    expect(wrapper.findAll(".sr-only").map((node) => node.text())).toEqual([
      "Busy",
      "Needs attention",
      "3 unread",
    ]);
  });

  it("hands the count over raw, so the plural category and the digits are the host's", () => {
    // Russian has three categories where English has two, and Eastern Arabic
    // digits are not reachable at all from a string Loom already wrote.
    const plural = new Intl.PluralRules("ru-RU");
    const forms: Record<string, string> = {
      one: "непрочитанное",
      few: "непрочитанных",
      many: "непрочитанных",
    };
    const wrapper = mount(Indicator, {
      props: {
        variant: "count",
        count: 3,
        labels: {
          count: ({ count }: { count: number }) =>
            `${new Intl.NumberFormat("ru-RU").format(count)} ${forms[plural.select(count)] ?? ""}`,
        },
      },
    });
    expect(wrapper.get(".sr-only").text()).toBe("3 непрочитанных");
  });

  it("takes its names from a host's vocabulary, and lets one instance correct them", () => {
    const wrapper = mount(LabelHost, {
      props: { vocabulary: () => ({ indicator: { online: "Trực tuyến" } }) },
      slots: {
        default: () => [
          h(Indicator, { status: "online" }),
          // The per-instance case: this dot is not about presence at all, and
          // no application-wide vocabulary could know that.
          h(Indicator, { status: "online", labels: { online: "Run in flight" } }),
        ],
      },
    });
    const names = wrapper.findAll(".sr-only").map((node) => node.text());
    expect(names).toEqual(["Trực tuyến", "Run in flight"]);
  });

  it("keeps `label` above the vocabulary, since an instance's own name is not a language", () => {
    const wrapper = mount(LabelHost, {
      props: { vocabulary: () => ({ indicator: { count: () => "chưa đọc" } }) },
      slots: {
        default: () => h(Indicator, { variant: "count", count: 4, label: "4 runs to review" }),
      },
    });
    expect(wrapper.get(".sr-only").text()).toBe("4 runs to review");
  });

  it("repaints its name when the host switches language under it", async () => {
    const locale = ref("en");
    const wrapper = mount(LabelHost, {
      props: {
        vocabulary: () => (locale.value === "en" ? {} : { indicator: { attention: "Cần chú ý" } }),
      },
      slots: { default: () => h(Indicator) },
    });
    expect(wrapper.get(".sr-only").text()).toBe("Needs attention");

    locale.value = "vi";
    await nextTick();

    // The assertion that fails the moment a label is read once in `setup`
    // instead of through `text.` inside the render.
    expect(wrapper.get(".sr-only").text()).toBe("Cần chú ý");
  });
});
