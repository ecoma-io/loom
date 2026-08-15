import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import IconButton from "../src/IconButton.vue";

describe("IconButton", () => {
  // The minimum props every mount needs: label is required because an icon-only
  // button without an accessible name is a WCAG failure.
  function mountIconButton(overrides: Record<string, unknown> = {}) {
    return mount(IconButton, {
      props: { label: "Close", ...overrides },
      slots: { default: "✕" },
    });
  }

  it("renders a button element", () => {
    const wrapper = mountIconButton();
    expect(wrapper.get("button").element.tagName).toBe("BUTTON");
  });

  it("applies the default variant class when no variant is specified", () => {
    const classes = mountIconButton().classes();
    expect(classes).toContain("bg-primary");
    expect(classes).toContain("text-primary-foreground");
  });

  it("applies the secondary variant classes", () => {
    const classes = mountIconButton({ variant: "secondary" }).classes();
    expect(classes).toContain("bg-secondary");
    expect(classes).toContain("text-secondary-foreground");
  });

  it("applies the ghost variant hover class", () => {
    const classes = mountIconButton({ variant: "ghost" }).classes();
    expect(classes).toContain("hover:bg-subtle");
    expect(classes).toContain("text-foreground");
  });

  it("applies the destructive variant class", () => {
    const classes = mountIconButton({ variant: "destructive" }).classes();
    expect(classes).toContain("bg-destructive");
    expect(classes).toContain("text-destructive-foreground");
  });

  it("applies the sm size classes", () => {
    const classes = mountIconButton({ size: "sm" }).classes();
    expect(classes).toContain("h-8");
    expect(classes).toContain("w-8");
  });

  it("applies the md size classes by default", () => {
    const classes = mountIconButton().classes();
    expect(classes).toContain("h-9");
    expect(classes).toContain("w-9");
  });

  it("applies the lg size classes", () => {
    const classes = mountIconButton({ size: "lg" }).classes();
    expect(classes).toContain("h-10");
    expect(classes).toContain("w-10");
  });

  it("sets aria-label from the label prop, because an icon-only button without an accessible name is a WCAG failure", () => {
    const wrapper = mountIconButton({ label: "Delete item" });
    expect(wrapper.get("button").attributes("aria-label")).toBe("Delete item");
  });

  it("is disabled when the disabled prop is true", () => {
    const wrapper = mountIconButton({ disabled: true });
    expect(wrapper.get("button").element.disabled).toBe(true);
  });

  it("renders slot content — the icon the button carries", () => {
    const wrapper = mountIconButton();
    expect(wrapper.get("button").text()).toBe("✕");
  });

  it("passes through an extra class via $attrs so a consumer can override any utility without !important", () => {
    const wrapper = mount(IconButton, {
      props: { label: "Close" },
      attrs: { class: "mt-4" },
      slots: { default: "✕" },
    });
    expect(wrapper.get("button").classes()).toContain("mt-4");
  });
});
