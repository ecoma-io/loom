import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import Kbd from "../src/Kbd.vue";

enableAutoUnmount(afterEach);

describe("Kbd", () => {
  it("is a real <kbd> — semantics first, styling second", () => {
    const wrapper = mount(Kbd, { slots: { default: "⌘" } });
    expect(wrapper.find("kbd").exists()).toBe(true);
  });

  it("reads as a pressed-able cap: hairline over a subtle well, bottom edge weighted", () => {
    const classes = mount(Kbd, { slots: { default: "C" } }).classes();
    expect(classes).toContain("border");
    expect(classes).toContain("bg-subtle");
    expect(classes.join(" ")).toContain("border-b-border-strong");
  });

  it("sets its face in the mono rung with tabular digits", () => {
    const classes = mount(Kbd, { slots: { default: "4" } }).classes();
    expect(classes).toContain("font-mono");
    expect(classes).toContain("tabular");
  });

  it("keeps both sizes at or above the 24px cap floor so prose baselines never shift", () => {
    expect(mount(Kbd, { props: { size: "sm" }, slots: { default: "⇧" } }).classes()).toContain(
      "min-h-6",
    );
    const md = mount(Kbd, { props: { size: "md" }, slots: { default: "⇧" } }).classes();
    expect(md.join(" ")).toMatch(/min-h-7/);
  });
});
