import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Badge, { type BadgeVariant } from "../src/Badge.vue";

describe("Badge", () => {
  it("paints each status variant in its own semantic token so a warning chip never reads as a success one", () => {
    const tokens: readonly (readonly [BadgeVariant, string])[] = [
      ["neutral", "bg-subtle"],
      ["primary", "bg-primary-muted"],
      ["success", "bg-success-muted"],
      ["warning", "bg-warning-muted"],
      ["info", "bg-info-muted"],
      ["destructive", "bg-destructive-muted"],
    ];
    for (const [variant, token] of tokens) {
      const wrapper = mount(Badge, { props: { variant }, slots: { default: "3" } });
      expect(wrapper.classes()).toContain(token);
    }
  });

  it("labels every functional variant with its *-text rung — warning included — because the muted washes are mixed to hold contrast against that token in both themes", () => {
    const labelTokens: readonly (readonly [BadgeVariant, string])[] = [
      ["primary", "text-primary-text"],
      ["success", "text-success-text"],
      ["warning", "text-warning-text"],
      ["info", "text-info-text"],
      ["destructive", "text-destructive-text"],
    ];
    for (const [variant, token] of labelTokens) {
      const wrapper = mount(Badge, { props: { variant }, slots: { default: "3" } });
      expect(wrapper.classes()).toContain(token);
    }
  });

  it("falls back to the neutral chip when no variant is given, so an unclassified label never borrows a status colour", () => {
    const classes = mount(Badge, { slots: { default: "3" } }).classes();
    expect(classes).toContain("bg-subtle");
    expect(classes).not.toContain("bg-success-muted");
    expect(classes).not.toContain("bg-destructive-muted");
  });

  it("carries the accent colour on the accent variant and on no other — a second semantic category is signalled, never decorative", () => {
    const accent = mount(Badge, { props: { variant: "accent" }, slots: { default: "Accent" } });
    expect(accent.classes()).toContain("bg-accent-muted");

    const neutral = mount(Badge, { props: { variant: "neutral" }, slots: { default: "Accent" } });
    expect(neutral.classes()).not.toContain("bg-accent-muted");
  });

  it("draws the outline variant as a bordered chip rather than a filled one, for meta that must not compete with status", () => {
    const outline = mount(Badge, { props: { variant: "outline" }, slots: { default: "beta" } });
    expect(outline.classes()).toContain("border-border");
    expect(outline.classes()).toContain("bg-transparent");

    const neutral = mount(Badge, { props: { variant: "neutral" }, slots: { default: "beta" } });
    expect(neutral.classes()).toContain("border-transparent");
  });

  it("renders its slot content inline in a span so a chip can sit inside a sentence or a table cell", () => {
    const wrapper = mount(Badge, { slots: { default: "Running" } });
    expect(wrapper.get("span").element.tagName).toBe("SPAN");
    expect(wrapper.text()).toBe("Running");
    expect(wrapper.classes()).toContain("inline-flex");
  });
});
