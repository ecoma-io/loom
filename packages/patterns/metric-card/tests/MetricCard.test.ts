import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import MetricCard from "../src/MetricCard.vue";

// No primitive collaborators to mock: MetricCard takes an icon slot rather
// than importing a glyph, and the trend arrows are inline SVG rather than an
// icon-library dependency. Its own logic — what it hides from assistive tech,
// which colour class it applies per trend direction, and whether it reserves
// space for a slot or trend nobody provided — is everything there is to
// isolate.

describe("MetricCard", () => {
  it("renders the value and label", () => {
    const wrapper = mount(MetricCard, {
      props: { value: "1,234", label: "Active users" },
    });

    expect(wrapper.text()).toContain("1,234");
    expect(wrapper.text()).toContain("Active users");
  });

  it("applies the value and label text classes from the fixed type scale", () => {
    const wrapper = mount(MetricCard, {
      props: { value: "1,234", label: "Active users" },
    });

    // The value sits on the named scale rather than an ad-hoc size so the
    // metric row scans consistently across cards — `text-heading` is the
    // rung, not a hand-assembled text-2xl stack.
    expect(wrapper.find("span").classes()).toContain("text-heading");
    expect(wrapper.find("span").classes()).not.toContain("text-2xl");
    expect(wrapper.find("p").classes()).toContain("text-small");
  });

  it("renders an up trend with the success colour and an upward arrow", () => {
    const wrapper = mount(MetricCard, {
      props: { value: "1,234", label: "Active users", trend: "up", trendValue: "+12.5%" },
    });

    const trend = wrapper.find("span.text-success-text");
    expect(trend.exists()).toBe(true);
    expect(trend.text()).toContain("+12.5%");
    // The arrow is an inline SVG, not an icon-library dependency.
    expect(trend.find("svg").exists()).toBe(true);
  });

  it("renders a down trend with the destructive colour and a downward arrow", () => {
    const wrapper = mount(MetricCard, {
      props: { value: "3.2%", label: "Churn rate", trend: "down", trendValue: "-3.2%" },
    });

    const trend = wrapper.find("span.text-destructive-text");
    expect(trend.exists()).toBe(true);
    expect(trend.text()).toContain("-3.2%");
    expect(trend.find("svg").exists()).toBe(true);
  });

  it("renders a flat trend with muted-foreground colour and an em dash", () => {
    const wrapper = mount(MetricCard, {
      props: { value: "99.9%", label: "Uptime", trend: "flat", trendValue: "0%" },
    });

    const trend = wrapper.find("span.text-muted-foreground");
    expect(trend.exists()).toBe(true);
    expect(trend.text()).toContain("0%");
    // Flat uses an em dash rather than an SVG arrow — a horizontal arrow at
    // this size reads as a minus sign or a separator.
    expect(trend.find("svg").exists()).toBe(false);
    expect(trend.find("span").text()).toContain("—");
  });

  it("renders no trend indicator at all when the trend prop is omitted", () => {
    const wrapper = mount(MetricCard, {
      props: { value: "1,234", label: "Active users" },
    });

    // No directional glyph, no magnitude — the card is just value + label.
    expect(wrapper.find("svg").exists()).toBe(false);
    expect(wrapper.text()).toBe("Active users1,234");
  });

  it("renders the icon slot and hides it from assistive tech", () => {
    const wrapper = mount(MetricCard, {
      props: { value: "1,234", label: "Active users" },
      slots: { icon: "<svg data-testid='metric-icon' />" },
    });

    const container = wrapper.get("[data-testid='metric-icon']").element.parentElement!;
    // The icon is decorative — the label and value already carry the metric's
    // meaning, so a screen reader repeating "chart icon" would be noise.
    expect(container.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders no icon region when the slot is not provided, so the card never reserves empty space", () => {
    const wrapper = mount(MetricCard, {
      props: { value: "1,234", label: "Active users" },
    });

    expect(wrapper.find("svg").exists()).toBe(false);
  });

  it("renders the trend arrow without a magnitude when trendValue is omitted", () => {
    const wrapper = mount(MetricCard, {
      props: { value: "1,234", label: "Active users", trend: "up" },
    });

    const trend = wrapper.find("span.text-success-text");
    expect(trend.exists()).toBe(true);
    // The arrow is present but no magnitude text follows it — the direction
    // alone is still meaningful.
    expect(trend.find("svg").exists()).toBe(true);
    expect(trend.text()).toBe("");
  });

  it("renders a description line under the value row when provided", () => {
    const wrapper = mount(MetricCard, {
      props: { value: "6,420", label: "Render minutes", description: "of 10,000 included" },
    });
    expect(wrapper.text()).toContain("of 10,000 included");
  });

  // Loading keeps the card's height: each Skeleton is sized to the row it
  // stands in for, and aria-busy states the wait for assistive tech.
  it("renders sized placeholders with aria-busy while loading, hiding the real rows", () => {
    const wrapper = mount(MetricCard, {
      props: { value: "6,420", label: "Render minutes", loading: true },
    });
    const root = wrapper.get("div");
    expect(root.attributes("aria-busy")).toBe("true");
    expect(root.text()).not.toContain("6,420");
    const skeletons = root.findAll("div[class*='animate-shimmer']");
    expect(skeletons.length).toBe(2);
  });
});
