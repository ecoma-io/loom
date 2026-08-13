import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Badge, { type BadgeVariant } from "./Badge.vue";

describe("Badge", () => {
  it("paints each status variant in its own semantic token so a warning chip never reads as a success one", () => {
    const tokens: readonly (readonly [BadgeVariant, string])[] = [
      ["neutral", "bg-subtle"],
      ["primary", "bg-primary/12"],
      ["success", "bg-success/12"],
      ["warning", "bg-warning/12"],
      ["info", "bg-info/12"],
      ["destructive", "bg-destructive/12"],
    ];
    for (const [variant, token] of tokens) {
      const wrapper = mount(Badge, { props: { variant }, slots: { default: "3" } });
      expect(wrapper.classes()).toContain(token);
    }
  });

  it("falls back to the neutral chip when no variant is given, so an unclassified label never borrows a status colour", () => {
    const classes = mount(Badge, { slots: { default: "3" } }).classes();
    expect(classes).toContain("bg-subtle");
    expect(classes).not.toContain("bg-success/12");
    expect(classes).not.toContain("bg-destructive/12");
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
